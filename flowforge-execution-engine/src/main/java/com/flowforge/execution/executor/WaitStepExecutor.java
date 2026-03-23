package com.flowforge.execution.executor;

import com.flowforge.execution.engine.ExecutionContext;
import com.flowforge.execution.engine.StepExecutionResult;
import com.flowforge.execution.model.StepDef;
import com.flowforge.execution.model.WaitToken;
import com.flowforge.execution.repository.WaitTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Handles WAIT step type.
 *
 * Creates a WaitToken in MongoDB, then blocks the execution thread using a
 * polling loop with a 3-second sleep interval until either:
 *   a) The token status changes to RESUMED (external API/Kafka resumed it)
 *   b) The timeout (if configured) is reached → TIMED_OUT
 *   c) The execution is cancelled
 *
 * Config fields expected in step config:
 *   - timeoutMinutes (int, optional) — 0 or absent = wait indefinitely
 *   - resumeContextKey (String, optional) — key under which to store resume data in context, defaults to stepName
 *   - description (String, optional) — human-readable wait reason
 */
@Component
public class WaitStepExecutor implements StepExecutor {

    private static final Logger log = LoggerFactory.getLogger(WaitStepExecutor.class);
    private static final int POLL_INTERVAL_SECONDS = 3;

    private final WaitTokenRepository waitTokenRepository;

    public WaitStepExecutor(WaitTokenRepository waitTokenRepository) {
        this.waitTokenRepository = waitTokenRepository;
    }

    @Override
    public String getType() { return "WAIT"; }

    @Override
    public StepExecutionResult execute(StepDef step, ExecutionContext ctx) {
        String executionId = ctx.getExecutionId();
        String clientId = ctx.getClientId();
        Map<String, Object> config = step.getConfig() != null ? step.getConfig() : new HashMap<>();

        int timeoutMinutes = config.containsKey("timeoutMinutes")
                ? ((Number) config.get("timeoutMinutes")).intValue() : 0;
        String contextKey = config.getOrDefault("resumeContextKey", step.getName()).toString();

        // Generate a unique opaque token for external resume calls
        String token = "wt_" + UUID.randomUUID().toString().replace("-", "");

        LocalDateTime expiresAt = timeoutMinutes > 0
                ? LocalDateTime.now().plusMinutes(timeoutMinutes) : null;

        WaitToken waitToken = WaitToken.builder()
                .id(UUID.randomUUID().toString())
                .executionId(executionId)
                .clientId(clientId)
                .workflowId(ctx.getWorkflowId())
                .workflowName(ctx.getWorkflowName())
                .stepId(step.getStepId())
                .stepName(step.getName())
                .token(token)
                .status("WAITING")
                .createdAt(LocalDateTime.now())
                .expiresAt(expiresAt)
                .build();

        waitTokenRepository.save(waitToken);
        log.info("Execution {} is now WAITING at step '{}'. Token: {}", executionId, step.getName(), token);

        // Poll until resumed or timed out
        long startMs = System.currentTimeMillis();
        long timeoutMs = timeoutMinutes > 0 ? TimeUnit.MINUTES.toMillis(timeoutMinutes) : Long.MAX_VALUE;

        while (true) {
            try {
                Thread.sleep(TimeUnit.SECONDS.toMillis(POLL_INTERVAL_SECONDS));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("Wait step interrupted for execution {}", executionId);
                return StepExecutionResult.builder()
                        .success(false)
                        .errorMessage("Wait step interrupted")
                        .output(new HashMap<>())
                        .build();
            }

            // Re-fetch token from DB
            WaitToken current = waitTokenRepository.findById(waitToken.getId()).orElse(null);
            if (current == null) {
                log.warn("WaitToken {} disappeared for execution {}", waitToken.getId(), executionId);
                return StepExecutionResult.builder()
                        .success(false)
                        .errorMessage("Wait token no longer exists")
                        .output(new HashMap<>())
                        .build();
            }

            if ("RESUMED".equals(current.getStatus())) {
                log.info("Execution {} resumed at step '{}' by {}", executionId, step.getName(), current.getResumedBy());

                // Inject resume data into execution context
                Map<String, Object> output = new HashMap<>();
                if (current.getResumeData() != null && !current.getResumeData().isEmpty()) {
                    output.putAll(current.getResumeData());
                    ctx.setStepOutput(contextKey, current.getResumeData());
                }
                output.put("waitToken", token);
                output.put("resumedBy", current.getResumedBy());
                output.put("resumedAt", current.getResumedAt() != null ? current.getResumedAt().toString() : "");

                return StepExecutionResult.builder()
                        .success(true)
                        .output(output)
                        .build();
            }

            if ("CANCELLED".equals(current.getStatus())) {
                return StepExecutionResult.builder()
                        .success(false)
                        .errorMessage("Wait state cancelled")
                        .output(new HashMap<>())
                        .build();
            }

            // Check timeout
            if (System.currentTimeMillis() - startMs > timeoutMs) {
                log.warn("Wait step timed out for execution {} at step '{}'", executionId, step.getName());
                current.setStatus("TIMED_OUT");
                current.setResumedBy("TIMEOUT");
                current.setResumedAt(LocalDateTime.now());
                waitTokenRepository.save(current);

                Map<String, Object> output = new HashMap<>();
                output.put("timedOut", true);
                output.put("waitToken", token);

                // Return success=true with timeout flag so the workflow can branch on it
                return StepExecutionResult.builder()
                        .success(true)
                        .output(output)
                        .build();
            }
        }
    }
}
