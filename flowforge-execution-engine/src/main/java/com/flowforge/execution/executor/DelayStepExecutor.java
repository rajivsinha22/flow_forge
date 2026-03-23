package com.flowforge.execution.executor;

import com.flowforge.execution.engine.ExecutionContext;
import com.flowforge.execution.engine.StepExecutionResult;
import com.flowforge.execution.model.StepDef;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class DelayStepExecutor implements StepExecutor {

    private static final Logger log = LoggerFactory.getLogger(DelayStepExecutor.class);

    private static final String TYPE = "DELAY";
    private static final long MAX_DELAY_MS = 300_000L; // 5 minutes max

    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public StepExecutionResult execute(StepDef step, ExecutionContext context) {
        Map<String, Object> config = step.getConfig();
        if (config == null || !config.containsKey("durationMs")) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("DELAY step '" + step.getStepId() + "' requires 'durationMs' in config")
                    .build();
        }

        long durationMs;
        try {
            durationMs = ((Number) config.get("durationMs")).longValue();
        } catch (Exception e) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("DELAY step '" + step.getStepId() + "' invalid durationMs: " + config.get("durationMs"))
                    .build();
        }

        if (durationMs < 0) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("DELAY step '" + step.getStepId() + "' durationMs cannot be negative")
                    .build();
        }

        // Cap delay to prevent accidental very long sleeps
        long actualDelay = Math.min(durationMs, MAX_DELAY_MS);
        if (actualDelay < durationMs) {
            log.warn("DELAY step '{}' requested {}ms but capping to {}ms", step.getStepId(), durationMs, MAX_DELAY_MS);
        }

        log.debug("DELAY step '{}' sleeping for {}ms", step.getStepId(), actualDelay);

        try {
            Thread.sleep(actualDelay);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("DELAY step interrupted")
                    .build();
        }

        Map<String, Object> output = new HashMap<>();
        output.put("delayedMs", actualDelay);

        return StepExecutionResult.builder()
                .success(true)
                .output(output)
                .build();
    }
}
