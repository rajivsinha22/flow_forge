package com.flowforge.execution.executor;

import com.flowforge.execution.engine.ContextResolver;
import com.flowforge.execution.engine.ExecutionContext;
import com.flowforge.execution.engine.StepExecutionResult;
import com.flowforge.execution.model.StepDef;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * Sends a notification (email/Slack).
 * For now logs the notification and returns success.
 * Future: integrate with notification service.
 */
@Component
public class NotifyStepExecutor implements StepExecutor {

    private static final Logger log = LoggerFactory.getLogger(NotifyStepExecutor.class);

    private static final String TYPE = "NOTIFY";

    private final ContextResolver contextResolver;

    public NotifyStepExecutor(ContextResolver contextResolver) {
        this.contextResolver = contextResolver;
    }

    @Override
    public String getType() {
        return TYPE;
    }

    @Override
    public StepExecutionResult execute(StepDef step, ExecutionContext context) {
        Map<String, Object> config = step.getConfig();
        if (config == null) {
            return StepExecutionResult.builder()
                    .success(false)
                    .errorMessage("NOTIFY step '" + step.getStepId() + "' has no config")
                    .build();
        }

        String channel = (String) config.getOrDefault("channel", "LOG");
        String recipient = contextResolver.resolve((String) config.getOrDefault("recipient", ""), context);
        String subject = contextResolver.resolve((String) config.getOrDefault("subject", "FlowForge Notification"), context);
        String message = contextResolver.resolve((String) config.getOrDefault("message", ""), context);

        log.info("[NOTIFY] step='{}' channel={} recipient='{}' subject='{}' message='{}'",
                step.getStepId(), channel, recipient, subject, message);

        // Simulate sending based on channel
        switch (channel.toUpperCase()) {
            case "EMAIL" -> log.info("[NOTIFY:EMAIL] Sending to={} subject={} body={}", recipient, subject, message);
            case "SLACK" -> log.info("[NOTIFY:SLACK] Sending to={} message={}", recipient, message);
            case "WEBHOOK" -> log.info("[NOTIFY:WEBHOOK] Posting to={} message={}", recipient, message);
            default -> log.info("[NOTIFY:LOG] {}: {}", subject, message);
        }

        Map<String, Object> output = new HashMap<>();
        output.put("channel", channel);
        output.put("recipient", recipient);
        output.put("subject", subject);
        output.put("delivered", true);

        return StepExecutionResult.builder()
                .success(true)
                .output(output)
                .build();
    }
}
