package com.flowforge.integration.service;

import com.flowforge.integration.model.EventTriggerConfig;
import com.flowforge.integration.model.TriggerActivationLog;
import com.flowforge.integration.repository.EventTriggerConfigRepository;
import com.flowforge.integration.repository.TriggerActivationLogRepository;
import com.flowforge.integration.config.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class TriggerService {

    private static final Logger log = LoggerFactory.getLogger(TriggerService.class);

    private final EventTriggerConfigRepository triggerRepository;
    private final TriggerActivationLogRepository activationLogRepository;
    private final QuartzSchedulerService quartzSchedulerService;

    public TriggerService(EventTriggerConfigRepository triggerRepository,
                           TriggerActivationLogRepository activationLogRepository,
                           QuartzSchedulerService quartzSchedulerService) {
        this.triggerRepository = triggerRepository;
        this.activationLogRepository = activationLogRepository;
        this.quartzSchedulerService = quartzSchedulerService;
    }

    /**
     * List all triggers for the given client.
     */
    public List<EventTriggerConfig> listTriggers(String clientId) {
        String namespace = TenantContext.getNamespace();
        return triggerRepository.findByClientIdAndNamespace(clientId, namespace);
    }

    /**
     * Create and persist a new trigger. Supported types: KAFKA, CRON.
     * If type is CRON and enabled, schedules it with Quartz.
     */
    public EventTriggerConfig createTrigger(String clientId, EventTriggerConfig config) {
        config.setId(UUID.randomUUID().toString());
        config.setClientId(clientId);
        config.setNamespace(TenantContext.getNamespace());
        config.setCreatedAt(LocalDateTime.now());
        config.setUpdatedAt(LocalDateTime.now());

        EventTriggerConfig saved = triggerRepository.save(config);
        log.info("Created trigger {} (type={}) for client {}", saved.getId(), saved.getSourceType(), clientId);

        if (saved.isEnabled() && "CRON".equals(saved.getSourceType())) {
            quartzSchedulerService.scheduleCronTrigger(saved);
        }

        return saved;
    }

    /**
     * Update an existing trigger. Re-schedules CRON jobs when changed.
     */
    public EventTriggerConfig updateTrigger(String clientId, String triggerId, EventTriggerConfig update) {
        EventTriggerConfig existing = getTriggerOrThrow(clientId, triggerId);

        existing.setName(update.getName());
        existing.setSourceType(update.getSourceType());
        existing.setWorkflowId(update.getWorkflowId());
        existing.setWorkflowName(update.getWorkflowName());
        existing.setTopicOrUrl(update.getTopicOrUrl());
        existing.setFilterExpression(update.getFilterExpression());
        existing.setPayloadMapping(update.getPayloadMapping());
        existing.setEnabled(update.isEnabled());
        existing.setUpdatedAt(LocalDateTime.now());

        if (quartzSchedulerService.jobExists(triggerId)) {
            quartzSchedulerService.unscheduleCronTrigger(triggerId);
        }

        EventTriggerConfig saved = triggerRepository.save(existing);

        if (saved.isEnabled() && "CRON".equals(saved.getSourceType())) {
            quartzSchedulerService.scheduleCronTrigger(saved);
        }

        log.info("Updated trigger {} for client {}", triggerId, clientId);
        return saved;
    }

    /**
     * Delete a trigger and remove any associated CRON schedule.
     */
    public void deleteTrigger(String clientId, String triggerId) {
        EventTriggerConfig existing = getTriggerOrThrow(clientId, triggerId);
        if ("CRON".equals(existing.getSourceType()) && quartzSchedulerService.jobExists(triggerId)) {
            quartzSchedulerService.unscheduleCronTrigger(triggerId);
        }
        triggerRepository.deleteById(triggerId);
        log.info("Deleted trigger {} for client {}", triggerId, clientId);
    }

    /**
     * Enable a trigger and schedule if CRON.
     */
    public EventTriggerConfig enableTrigger(String clientId, String triggerId) {
        EventTriggerConfig existing = getTriggerOrThrow(clientId, triggerId);
        existing.setEnabled(true);
        existing.setUpdatedAt(LocalDateTime.now());
        EventTriggerConfig saved = triggerRepository.save(existing);
        if ("CRON".equals(saved.getSourceType())) {
            if (quartzSchedulerService.jobExists(triggerId)) {
                quartzSchedulerService.resumeCronTrigger(triggerId);
            } else {
                quartzSchedulerService.scheduleCronTrigger(saved);
            }
        }
        log.info("Enabled trigger {} for client {}", triggerId, clientId);
        return saved;
    }

    /**
     * Disable a trigger and pause CRON schedule if applicable.
     */
    public EventTriggerConfig disableTrigger(String clientId, String triggerId) {
        EventTriggerConfig existing = getTriggerOrThrow(clientId, triggerId);
        existing.setEnabled(false);
        existing.setUpdatedAt(LocalDateTime.now());
        EventTriggerConfig saved = triggerRepository.save(existing);
        if ("CRON".equals(saved.getSourceType()) && quartzSchedulerService.jobExists(triggerId)) {
            quartzSchedulerService.pauseCronTrigger(triggerId);
        }
        log.info("Disabled trigger {} for client {}", triggerId, clientId);
        return saved;
    }

    /**
     * Get the last 10 activation logs for a trigger.
     */
    public List<TriggerActivationLog> getActivationLogs(String clientId, String triggerId) {
        getTriggerOrThrow(clientId, triggerId);
        return activationLogRepository.findTop10ByTriggerIdOrderByActivatedAtDesc(triggerId);
    }

    /**
     * Record an activation log entry.
     */
    public void recordActivation(String triggerId, String clientId, String workflowId,
                                  String executionId, String status, String errorMessage) {
        TriggerActivationLog activationLog = TriggerActivationLog.builder()
                .id(UUID.randomUUID().toString())
                .triggerId(triggerId)
                .clientId(clientId)
                .workflowId(workflowId)
                .executionId(executionId)
                .status(status)
                .errorMessage(errorMessage)
                .activatedAt(LocalDateTime.now())
                .build();
        activationLogRepository.save(activationLog);
    }

    public EventTriggerConfig changeNamespace(String id, String newNamespace) {
        String clientId = TenantContext.getClientId();
        String currentNamespace = TenantContext.getNamespace();

        EventTriggerConfig trigger = triggerRepository.findById(id)
                .filter(t -> clientId.equals(t.getClientId()) && currentNamespace.equals(t.getNamespace()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Trigger not found: " + id));

        if (newNamespace == null || newNamespace.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Target namespace must not be blank");
        }

        if (newNamespace.equals(currentNamespace)) {
            return trigger;
        }

        if (triggerRepository.existsByClientIdAndNamespaceAndName(clientId, newNamespace, trigger.getName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A trigger with the same name already exists in namespace '" + newNamespace + "'");
        }

        trigger.setNamespace(newNamespace);
        trigger.setUpdatedAt(LocalDateTime.now());
        return triggerRepository.save(trigger);
    }

    private EventTriggerConfig getTriggerOrThrow(String clientId, String triggerId) {
        return triggerRepository.findById(triggerId)
                .filter(t -> clientId.equals(t.getClientId()))
                .orElseThrow(() -> new RuntimeException("Trigger not found: " + triggerId));
    }
}
