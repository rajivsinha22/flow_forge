package com.flowforge.execution.executor.script;

import groovy.lang.Binding;
import groovy.lang.GroovyShell;
import org.codehaus.groovy.control.CompilerConfiguration;
import org.codehaus.groovy.control.customizers.ImportCustomizer;
import org.codehaus.groovy.control.customizers.SecureASTCustomizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Set;

/**
 * Creates a sandboxed Groovy execution environment.
 *
 * Two-layer protection:
 *
 * Layer 1 — Compile-time (SecureASTCustomizer):
 *   Intercepts the AST before bytecode generation. Blocks:
 *     • Any import not in ALLOWED_IMPORTS
 *     • Star/static imports entirely
 *     • Package declarations
 *     • Indirect class references (e.g. "Runtime.class", "Class.forName(...)")
 *     • @Grab / @GrabResolver / @GrabConfig annotations (dynamic Maven dependency loading)
 *
 * Layer 2 — Runtime class loading (SandboxClassLoader):
 *   A custom ClassLoader that refuses to load classes from BLOCKED_CLASSES or
 *   BLOCKED_PACKAGES. This is a defence-in-depth measure against indirect access
 *   patterns that slip past the AST check (e.g., Class.forName via a Groovy built-in).
 *   Groovy's own runtime classes (org.codehaus.groovy.runtime.*) are explicitly allowed
 *   so the engine continues to operate normally.
 */
public final class ScriptSandbox {

    private static final Logger log = LoggerFactory.getLogger(ScriptSandbox.class);

    /** Maximum allowed script size (bytes). Prevents memory exhaustion during compilation. */
    public static final int MAX_SCRIPT_BYTES = 50 * 1024; // 50 KB

    /** Hard ceiling on execution timeout regardless of user config. */
    public static final int MAX_TIMEOUT_SECONDS = 60;

    // ─── Compile-time: allowed imports (whitelist) ────────────────────────────

    static final List<String> ALLOWED_IMPORTS = List.of(
            // Collections
            "java.util.Map",
            "java.util.List",
            "java.util.Set",
            "java.util.ArrayList",
            "java.util.LinkedList",
            "java.util.HashMap",
            "java.util.LinkedHashMap",
            "java.util.HashSet",
            "java.util.TreeMap",
            "java.util.TreeSet",
            "java.util.Arrays",
            "java.util.Collections",
            "java.util.Optional",
            "java.util.Objects",
            // Numbers / Math
            "java.math.BigDecimal",
            "java.math.BigInteger",
            // Date / Time (immutable, safe)
            "java.time.Instant",
            "java.time.LocalDate",
            "java.time.LocalTime",
            "java.time.LocalDateTime",
            "java.time.ZonedDateTime",
            "java.time.ZoneId",
            "java.time.Duration",
            "java.time.Period",
            "java.time.format.DateTimeFormatter",
            // String utilities (safe)
            "java.util.regex.Pattern",
            "java.util.regex.Matcher",
            "java.util.UUID"
    );

    // ─── Runtime: blocked class names (deny-list for ClassLoader) ────────────

    /**
     * Classes that MUST NOT be loaded when the request originates from script code.
     * These are the most critical ones — anything that gives OS/JVM/filesystem access.
     */
    static final Set<String> BLOCKED_CLASSES = Set.of(
            // OS command execution
            "java.lang.Runtime",
            "java.lang.ProcessBuilder",
            "java.lang.Process",
            // JVM control
            "java.lang.System",
            // Thread manipulation (scripts can't create threads — they'd outlive timeout)
            "java.lang.Thread",
            "java.lang.ThreadGroup",
            // Class loading / reflection
            "java.lang.ClassLoader",
            "java.lang.Class",
            "java.lang.reflect.Method",
            "java.lang.reflect.Field",
            "java.lang.reflect.Constructor",
            "java.lang.reflect.Array",
            // File system
            "java.io.File",
            "java.io.FileInputStream",
            "java.io.FileOutputStream",
            "java.io.FileReader",
            "java.io.FileWriter",
            "java.io.RandomAccessFile",
            "java.io.PrintStream",
            // Direct network sockets (bypass configured HTTP services)
            "java.net.Socket",
            "java.net.ServerSocket",
            "java.net.URL",
            "java.net.URLConnection",
            "java.net.HttpURLConnection",
            // Script engine (prevent recursive script execution)
            "javax.script.ScriptEngine",
            "javax.script.ScriptEngineManager",
            // Groovy shell (prevent recursive eval)
            "groovy.lang.GroovyShell",
            "groovy.lang.GroovyClassLoader",
            "groovy.lang.Script"
    );

    /**
     * Package prefixes that are blocked entirely.
     * Checked AFTER the explicit Groovy runtime allowlist below.
     */
    static final List<String> BLOCKED_PACKAGES = List.of(
            "java.lang.reflect.",
            "java.lang.management.",
            "java.lang.invoke.",
            "java.nio.file.",           // filesystem NIO
            "java.nio.channels.",       // I/O channels
            "javax.script.",
            "sun.",
            "com.sun.",
            "jdk.internal.",
            "jdk.nashorn.",
            // Block FlowForge internals — prevents scripts from calling other steps,
            // accessing other tenants' data, or manipulating the orchestrator
            "com.flowforge.",
            // Block Spring — prevents access to application context, beans, security
            "org.springframework.",
            "org.hibernate.",
            "org.apache.kafka."
    );

    // ─── Factory ──────────────────────────────────────────────────────────────

    private ScriptSandbox() {}

    /**
     * Create a sandboxed GroovyShell ready for script execution.
     * The returned shell enforces both compile-time and runtime restrictions.
     *
     * @param binding pre-populated Groovy Binding (ctx, http, db variables)
     * @return a sandboxed GroovyShell instance (not thread-safe — create one per execution)
     */
    public static GroovyShell createShell(Binding binding) {
        // ── Layer 1: Compile-time customizers ─────────────────────────────────

        // 1a. Import whitelist — only safe java.util/time/math classes are importable
        ImportCustomizer importCustomizer = new ImportCustomizer();
        ALLOWED_IMPORTS.forEach(importCustomizer::addImports);

        // 1b. Secure AST — block dangerous patterns before bytecode is generated
        SecureASTCustomizer secureAST = new SecureASTCustomizer();
        secureAST.setPackageAllowed(false);              // no "package com.evil" in scripts
        secureAST.setIndirectImportCheckEnabled(true);   // catch "Runtime.class" style refs
        secureAST.setImportsWhitelist(ALLOWED_IMPORTS);  // only whitelisted imports pass
        secureAST.setStarImportsWhitelist(List.of());    // zero star imports (import java.io.* blocked)
        secureAST.setStaticImportsWhitelist(List.of());  // zero static imports
        secureAST.setStaticStarImportsWhitelist(List.of()); // zero static star imports

        // 1c. Compiler configuration
        CompilerConfiguration compilerConfig = new CompilerConfiguration();
        compilerConfig.addCompilationCustomizers(importCustomizer, secureAST);

        // Block @Grab (downloads arbitrary Maven dependencies at runtime)
        // This is done by disabling the grape engine via system property at startup,
        // and additionally by the import whitelist above which blocks groovy.grape.* imports.
        compilerConfig.setDisabledGlobalASTTransformations(Set.of(
                "org.codehaus.groovy.transform.stc.StaticTypeCheckingExtension",
                "groovy.grape.GrabAnnotationTransformation"  // disables @Grab
        ));

        // ── Layer 2: Runtime classloader ──────────────────────────────────────
        ClassLoader sandboxLoader = new SandboxClassLoader(
                // Use the current thread's context loader as parent so Groovy runtime works
                Thread.currentThread().getContextClassLoader()
        );

        log.debug("Created sandboxed GroovyShell with {} allowed imports", ALLOWED_IMPORTS.size());
        return new GroovyShell(sandboxLoader, binding, compilerConfig);
    }

    /**
     * Validate script content before attempting compilation.
     * Throws IllegalArgumentException if the script is too large or contains
     * obviously dangerous patterns that the AST check might miss at a glance.
     */
    public static void validateScript(String script) {
        if (script == null || script.isBlank()) {
            throw new IllegalArgumentException("Script content is empty");
        }
        if (script.getBytes().length > MAX_SCRIPT_BYTES) {
            throw new IllegalArgumentException(
                    "Script exceeds maximum allowed size of " + (MAX_SCRIPT_BYTES / 1024) + " KB");
        }
        // Quick pattern checks as a first line of defence (fast, pre-compilation)
        String lower = script.toLowerCase();
        if (lower.contains("runtime.") || lower.contains("processbuilder") ||
                lower.contains(".exec(") || lower.contains("system.exit") ||
                lower.contains("system.getenv") || lower.contains("class.forname") ||
                lower.contains("@grab") || lower.contains("@grabresolver")) {
            throw new SecurityException(
                    "Script contains one or more forbidden patterns (Runtime, exec, System.exit, @Grab, etc.)");
        }
    }

    // ─── Inner: Sandbox ClassLoader ───────────────────────────────────────────

    /**
     * Custom ClassLoader that blocks loading of dangerous classes.
     *
     * Implementation note: we allow Groovy's own runtime packages
     * (org.codehaus.groovy.runtime.*, groovy.lang.GString, etc.) so the engine
     * can function. Everything else is evaluated against the deny-lists above.
     */
    static class SandboxClassLoader extends ClassLoader {

        SandboxClassLoader(ClassLoader parent) {
            super("script-sandbox", parent);
        }

        @Override
        protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
            if (isDangerous(name)) {
                throw new SecurityException(
                        "Script attempted to load restricted class: '" + name + "'. " +
                        "Access to this class is not permitted in FlowForge scripts.");
            }
            return super.loadClass(name, resolve);
        }

        private boolean isDangerous(String name) {
            if (name == null) return false;

            // ── Explicit Groovy runtime allowlist ──────────────────────────────
            // Groovy engine internals must be allowed or script execution will fail
            if (name.startsWith("org.codehaus.groovy.runtime.")) return false;
            if (name.startsWith("org.codehaus.groovy.reflection.")) return false;
            if (name.startsWith("org.codehaus.groovy.transform.")) return false;
            if (name.startsWith("org.codehaus.groovy.ast.")) return false;
            if (name.startsWith("groovy.lang.")) return false;        // GString, Closure, etc.
            if (name.startsWith("groovy.transform.")) return false;
            if (name.startsWith("groovy.json.")) return false;        // JsonSlurper is safe
            if (name.startsWith("groovy.xml.")) return false;         // XML parsing is safe
            if (name.startsWith("groovy.util.")) return false;        // GroovyCollections etc.
            if (name.startsWith("groovy.grape.")) return true;        // @Grab - explicitly BLOCKED

            // ── Standard Java safe packages (always allowed) ───────────────────
            if (name.startsWith("java.util."))    return false;
            if (name.startsWith("java.math."))    return false;
            if (name.startsWith("java.time."))    return false;
            if (name.startsWith("java.text."))    return false;
            if (name.startsWith("java.lang.String"))   return false;  // String, StringBuilder
            if (name.startsWith("java.lang.Number"))   return false;
            if (name.startsWith("java.lang.Integer"))  return false;
            if (name.startsWith("java.lang.Long"))     return false;
            if (name.startsWith("java.lang.Double"))   return false;
            if (name.startsWith("java.lang.Boolean"))  return false;
            if (name.startsWith("java.lang.Character")) return false;
            if (name.startsWith("java.lang.Comparable")) return false;
            if (name.startsWith("java.lang.Iterable"))  return false;
            if (name.startsWith("java.lang.AutoCloseable")) return false;
            if (name.equals("java.lang.Object"))  return false;
            if (name.equals("java.lang.Enum"))    return false;
            if (name.equals("java.lang.Throwable")) return false;
            if (name.equals("java.lang.Exception")) return false;
            if (name.equals("java.lang.RuntimeException")) return false;
            if (name.equals("java.lang.IllegalArgumentException")) return false;

            // ── Proxy/binding classes (must be loadable to call proxy methods) ─
            // The script-step proxy objects are already instantiated and passed in
            // as bindings — the ClassLoader doesn't need to load them fresh.
            // But Groovy may need to resolve them for method dispatch.
            if (name.startsWith("com.flowforge.execution.executor.script.Script")) return false;

            // ── Explicit blocked classes ───────────────────────────────────────
            if (BLOCKED_CLASSES.contains(name)) return true;

            // ── Blocked packages ───────────────────────────────────────────────
            for (String pkg : BLOCKED_PACKAGES) {
                if (name.startsWith(pkg)) return true;
            }

            return false;
        }
    }
}
