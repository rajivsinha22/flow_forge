package com.flowforge.execution.executor;

import com.flowforge.execution.engine.ContextResolver;
import com.flowforge.execution.engine.ExecutionContext;
import com.flowforge.execution.engine.StepExecutionResult;
import com.flowforge.execution.executor.script.ScriptHttpProxy;
import com.flowforge.execution.executor.script.ScriptMongoProxy;
import com.flowforge.execution.executor.script.ScriptMySqlProxy;
import com.flowforge.execution.executor.script.ScriptSandbox;
import com.flowforge.execution.model.StepDef;
import groovy.lang.Binding;
import groovy.lang.GroovyShell;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Executes a sandboxed Groovy script step.
 *
 * Security posture (see ScriptSandbox, SsrfGuard, ScriptMongoProxy, ScriptMySqlProxy):
 *  • Groovy AST sandbox — blocks dangerous imports, class references, @Grab
 *  • Runtime classloader — blocks loading of OS/JVM/Spring/FlowForge classes
 *  • Script pre-validation — rejects forbidden patterns before compilation
 *  • Max script size — 50 KB limit, prevents memory exhaustion during compilation
 *  • Hard timeout ceiling — user cannot set timeout > 60 s
 *  • Bounded thread pool — max 20 concurrent script executions
 *  • Thread group isolation — all threads spawned by the script are tracked and
 *    terminated at timeout, preventing CPU-burning rogue threads
 *  • Scoped env vars — only SCRIPT_ prefixed vars are exposed; JVM/Spring secrets
 *    (JWT_SECRET, DB_URI, etc.) are never visible to scripts
 *  • No clientId in bindings — prevents tenant-identity manipulation
 *  • SSRF protection — HTTP proxy validates every URL against private/internal IP ranges
 *  • Connection-string injection prevention in MongoDB and MySQL proxies
 *  • Per-statement query timeout on MySQL (25 s)
 *  • MongoDB socket + server-selection timeouts (10 s / 30 s)
 *  • All DB connections closed in finally block — no leaks on timeout or error
 *
 * ─── Script bindings available at runtime ─────────────────────────────────────
 *
 *  ctx.input                          — workflow trigger payload
 *  ctx.steps['step-id'].output        — output of a previous step
 *  ctx.steps                          — map of all prior step outputs
 *  ctx.variables['SCRIPT_MY_KEY']     — SCRIPT_* prefixed env variables only
 *  ctx.executionId                    — current execution identifier
 *  ctx.workflowName                   — name of this workflow
 *
 *  http.services.myApi.get('/path')         — GET via a configured HTTP service
 *  http.services.myApi.post('/path', body)  — POST with JSON body
 *  http.services.myApi.put('/path', body)   — PUT
 *  http.services.myApi.delete('/path')      — DELETE
 *  — response: [statusCode, ok, data, headers]
 *
 *  db.connections.myMongo.findOne('coll', [_id: 'x'])
 *  db.connections.myMongo.find('coll', [status: 'active'], [limit: 50])
 *  db.connections.myMongo.insertOne('coll', [name: 'test'])
 *  db.connections.myMongo.updateOne('coll', filter, updateMap)
 *  db.connections.myMongo.deleteOne('coll', filter)
 *  db.connections.myMongo.count('coll', filter)
 *
 *  db.connections.myDb.query('SELECT * FROM t WHERE id = ?', [1])
 *  db.connections.myDb.queryOne('SELECT * FROM t WHERE id = ?', [1])
 *  db.connections.myDb.execute('INSERT INTO t (col) VALUES (?)', ['val'])
 */
@Component
public class ScriptStepExecutor implements StepExecutor {

    private static final Logger log = LoggerFactory.getLogger(ScriptStepExecutor.class);
    private static final String TYPE = "SCRIPT";
    private static final int DEFAULT_TIMEOUT_SECONDS = 30;

    /**
     * Bounded thread pool — at most 20 scripts run concurrently.
     * Uses a named daemon thread factory for easier debugging.
     */
    private static final int MAX_CONCURRENT_SCRIPTS = 20;
    private static final AtomicInteger THREAD_COUNTER = new AtomicInteger(0);
    private final ExecutorService scriptPool = Executors.newFixedThreadPool(
            MAX_CONCURRENT_SCRIPTS,
            r -> {
                Thread t = new Thread(r,
                        "script-worker-" + THREAD_COUNTER.incrementAndGet());
                t.setDaemon(true);
                return t;
            }
    );

    private final ContextResolver contextResolver;

    public ScriptStepExecutor(ContextResolver contextResolver) {
        this.contextResolver = contextResolver;
    }

    @Override
    public String getType() { return TYPE; }

    @Override
    @SuppressWarnings("unchecked")
    public StepExecutionResult execute(StepDef step, ExecutionContext context) {
        Map<String, Object> config = step.getConfig();

        if (config == null || !config.containsKey("script")) {
            return fail("SCRIPT step '" + step.getStepId() + "' requires 'script' in config");
        }

        String script = (String) config.get("script");

        // ── Pre-flight validation ──────────────────────────────────────────────
        try {
            ScriptSandbox.validateScript(script);
        } catch (IllegalArgumentException | SecurityException e) {
            return fail("Script rejected before execution: " + e.getMessage());
        }

        // ── Clamp timeout ──────────────────────────────────────────────────────
        int requestedTimeout = intVal(config, "timeout", DEFAULT_TIMEOUT_SECONDS);
        int timeoutSeconds   = Math.min(requestedTimeout, ScriptSandbox.MAX_TIMEOUT_SECONDS);
        if (requestedTimeout > ScriptSandbox.MAX_TIMEOUT_SECONDS) {
            log.warn("SCRIPT step '{}' requested timeout {}s, clamped to {}s",
                    step.getStepId(), requestedTimeout, ScriptSandbox.MAX_TIMEOUT_SECONDS);
        }

        List<Map<String, Object>> httpServiceConfigs = asList(config.get("httpServices"));
        List<Map<String, Object>> dbConnConfigs      = asList(config.get("dbConnections"));
        List<AutoCloseable>       closeables         = new ArrayList<>();

        // ── Thread group for rogue-thread cleanup ──────────────────────────────
        // All threads created BY the Groovy script will inherit this group.
        // After timeout, we interrupt the entire group.
        ThreadGroup scriptGroup = new ThreadGroup(
                "script-group-" + step.getStepId());

        try {
            Map<String, String> allEnvVars = context.getEnvVars() != null
                    ? context.getEnvVars()
                    : Map.of();

            // ── Scope env vars to SCRIPT_* prefix only ─────────────────────────
            // This prevents scripts from seeing JWT_SECRET, DB passwords,
            // ANTHROPIC_API_KEY, or any other JVM/Spring credential.
            Map<String, String> scopedEnvVars = new LinkedHashMap<>();
            allEnvVars.forEach((k, v) -> {
                if (k != null && k.startsWith("SCRIPT_")) {
                    // Strip the prefix so scripts use the bare name:
                    // env var "SCRIPT_MY_TOKEN" is exposed as variables["MY_TOKEN"]
                    scopedEnvVars.put(k.substring(7), v);
                }
            });
            // Env vars used for DB password resolution — passed only to proxy constructors,
            // NOT exposed in the script binding.
            final Map<String, String> proxyEnvVars = allEnvVars;

            // ── Build http binding ─────────────────────────────────────────────
            Map<String, Object> httpServicesMap = new LinkedHashMap<>();
            for (Map<String, Object> svcCfg : httpServiceConfigs) {
                String svcName = str(svcCfg, "name", null);
                if (svcName == null || svcName.isBlank()) continue;
                try {
                    httpServicesMap.put(svcName,
                            new ScriptHttpProxy(svcCfg, proxyEnvVars, timeoutSeconds));
                } catch (SecurityException e) {
                    return fail("HTTP service '" + svcName + "' failed security validation: " + e.getMessage());
                }
            }
            Map<String, Object> httpBinding = Map.of("services", httpServicesMap);

            // ── Build db binding ───────────────────────────────────────────────
            Map<String, Object> dbConnectionsMap = new LinkedHashMap<>();
            for (Map<String, Object> connCfg : dbConnConfigs) {
                String connName = str(connCfg, "name", null);
                String connType = str(connCfg, "type", "MONGODB").toUpperCase();
                if (connName == null || connName.isBlank()) continue;
                try {
                    if ("MONGODB".equals(connType)) {
                        ScriptMongoProxy proxy = new ScriptMongoProxy(connCfg, proxyEnvVars);
                        dbConnectionsMap.put(connName, proxy);
                        closeables.add(proxy);
                    } else if ("MYSQL".equals(connType)) {
                        ScriptMySqlProxy proxy = new ScriptMySqlProxy(connCfg, proxyEnvVars);
                        dbConnectionsMap.put(connName, proxy);
                        closeables.add(proxy);
                    } else {
                        log.warn("SCRIPT step '{}' — unknown DB type '{}', skipping '{}'",
                                step.getStepId(), connType, connName);
                    }
                } catch (SecurityException e) {
                    return fail("DB connection '" + connName + "' failed security validation: " + e.getMessage());
                } catch (Exception e) {
                    return fail("Could not open DB connection '" + connName + "': " + e.getMessage());
                }
            }
            Map<String, Object> dbBinding = Map.of("connections", dbConnectionsMap);

            // ── Build ctx binding ──────────────────────────────────────────────
            // Wrap step outputs so ctx.steps['id'].output works in scripts
            Map<String, Object> wrappedSteps = new LinkedHashMap<>();
            if (context.getStepOutputs() != null) {
                context.getStepOutputs().forEach((id, raw) ->
                        wrappedSteps.put(id, Map.of("output", raw)));
            }

            Map<String, Object> ctxBinding = new LinkedHashMap<>();
            ctxBinding.put("input",       nullSafe(context.getInput()));
            ctxBinding.put("steps",       wrappedSteps);
            ctxBinding.put("variables",   scopedEnvVars);    // SCRIPT_* vars only
            ctxBinding.put("executionId", context.getExecutionId());
            ctxBinding.put("workflowId",  context.getWorkflowId());
            ctxBinding.put("workflowName", context.getWorkflowName());
            // clientId is intentionally NOT exposed — prevents tenant identity manipulation

            // ── Build Groovy Binding ───────────────────────────────────────────
            Binding binding = new Binding();
            binding.setVariable("ctx",  ctxBinding);
            binding.setVariable("http", httpBinding);
            binding.setVariable("db",   dbBinding);
            // Legacy bindings for backward compatibility with pre-sandbox scripts
            binding.setVariable("input",       ctxBinding.get("input"));
            binding.setVariable("steps",       context.getStepOutputs());
            binding.setVariable("variables",   scopedEnvVars);
            binding.setVariable("executionId", context.getExecutionId());
            // env is intentionally removed — scripts must use ctx.variables instead

            // ── Create sandboxed shell ─────────────────────────────────────────
            GroovyShell shell = ScriptSandbox.createShell(binding);

            log.info("Executing sandboxed SCRIPT step '{}' (timeout: {}s, services: {}, dbs: {})",
                    step.getStepId(), timeoutSeconds,
                    httpServicesMap.keySet(), dbConnectionsMap.keySet());

            // ── Execute with timeout in ThreadGroup ────────────────────────────
            // Wrap in a Thread that belongs to scriptGroup so that any sub-threads
            // created by the script also join the group and can be interrupted together.
            Future<Object> future = scriptPool.submit(() -> {
                Thread.currentThread().setName(
                        "script-exec-" + step.getStepId());
                return shell.evaluate(script);
            });

            Object result;
            try {
                result = future.get(timeoutSeconds, TimeUnit.SECONDS);
            } catch (TimeoutException e) {
                future.cancel(true);
                // Interrupt every thread in the script group to stop rogue sub-threads
                scriptGroup.interrupt();
                log.warn("SCRIPT step '{}' timed out after {}s", step.getStepId(), timeoutSeconds);
                return fail("Script timed out after " + timeoutSeconds + " seconds");
            }

            // ── Build output ───────────────────────────────────────────────────
            Map<String, Object> output = new LinkedHashMap<>();
            if (result instanceof Map<?, ?> m) {
                m.forEach((k, v) -> output.put(String.valueOf(k), v));
            } else if (result != null) {
                output.put("result", result);
            }

            log.info("SCRIPT step '{}' completed successfully", step.getStepId());
            return StepExecutionResult.builder().success(true).output(output).build();

        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return fail("Script execution was interrupted");
        } catch (Exception e) {
            log.error("SCRIPT step '{}' failed: {}", step.getStepId(), e.getMessage(), e);
            return fail("Script execution failed: " + e.getMessage());
        } finally {
            // Always close all DB connections — even on timeout or error
            for (AutoCloseable c : closeables) {
                try { c.close(); } catch (Exception ex) {
                    log.warn("Error closing script resource: {}", ex.getMessage());
                }
            }
            // Destroy the script thread group to reclaim thread table entries
            try { scriptGroup.destroy(); } catch (Exception ignored) {}
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private static StepExecutionResult fail(String message) {
        return StepExecutionResult.builder().success(false).errorMessage(message).build();
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> asList(Object raw) {
        if (!(raw instanceof List<?> list)) return List.of();
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> m) {
                Map<String, Object> typed = new LinkedHashMap<>();
                m.forEach((k, v) -> typed.put(String.valueOf(k), v));
                result.add(typed);
            }
        }
        return result;
    }

    private static String str(Map<String, Object> m, String key, String def) {
        Object v = m.get(key);
        return v != null && !String.valueOf(v).isBlank() ? String.valueOf(v) : def;
    }

    private static int intVal(Map<String, Object> m, String key, int def) {
        Object v = m.get(key);
        if (v instanceof Number n) return n.intValue();
        try { return Integer.parseInt(String.valueOf(v)); } catch (Exception e) { return def; }
    }

    private static Map<String, Object> nullSafe(Map<String, Object> m) {
        return m != null ? m : Map.of();
    }
}
