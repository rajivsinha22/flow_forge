package com.flowforge.integration.service;

import com.flowforge.integration.model.TriggerActivationLog;
import com.flowforge.integration.repository.TriggerActivationLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class CronTriggerJob implements Job {

    private static final Logger log = LoggerFactory.getLogger(CronTriggerJob.class);

    @Autowired
    private WebClient.Builder webClientBuilder;

    @Autowired
    private TriggerActivationLogRepository activationLogRepository;

    @Value("${flowforge.execution-engine.url:http://localhost:8081}")
    private String executionEngineUrl;

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        JobDataMap dataMap = context.getJobDetail().getJobDataMap();
        String triggerId = dataMap.getString("triggerId");
        String clientId = dataMap.getString("clientId");
        String workflowId = dataMap.getString("workflowId");
        String workflowName = dataMap.getString("workflowName");

        log.info("Executing CRON trigger {} for workflow {} (client: {})", triggerId, workflowId, clientId);

        TriggerActivationLog activationLog = TriggerActivationLog.builder()
                .id(UUID.randomUUID().toString())
                .triggerId(triggerId)
                .clientId(clientId)
                .workflowId(workflowId)
                .activatedAt(LocalDateTime.now())
                .build();

        try {
            Map<String, Object> triggerRequest = new HashMap<>();
            triggerRequest.put("workflowId", workflowId);
            triggerRequest.put("clientId", clientId);
            triggerRequest.put("triggeredBy", "CRON");
            triggerRequest.put("triggerId", triggerId);
            triggerRequest.put("input", new HashMap<>());

            String response = webClientBuilder.build()
                    .post()
                    .uri(executionEngineUrl + "/api/v1/executions/trigger")
                    .header("X-Client-Id", clientId)
                    .bodyValue(triggerRequest)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            log.info("CRON trigger {} successfully triggered workflow {}. Response: {}", triggerId, workflowId, response);

            activationLog.setStatus("SUCCESS");
            activationLog.setExecutionId(extractExecutionId(response));
        } catch (Exception e) {
            log.error("CRON trigger {} failed to trigger workflow {}: {}", triggerId, workflowId, e.getMessage(), e);
            activationLog.setStatus("FAILED");
            activationLog.setErrorMessage(e.getMessage());
        } finally {
            activationLogRepository.save(activationLog);
        }
    }

    private String extractExecutionId(String response) {
        if (response == null) return null;
        // Basic extraction — in production parse the JSON response properly
        if (response.contains("\"executionId\"")) {
            try {
                int start = response.indexOf("\"executionId\"") + 15;
                int end = response.indexOf("\"", start);
                return response.substring(start, end);
            } catch (Exception e) {
                return null;
            }
        }
        return null;
    }
}
