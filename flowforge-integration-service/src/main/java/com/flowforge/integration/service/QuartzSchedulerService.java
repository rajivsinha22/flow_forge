package com.flowforge.integration.service;

import com.flowforge.integration.model.EventTriggerConfig;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.quartz.*;
import org.quartz.impl.matchers.GroupMatcher;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class QuartzSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(QuartzSchedulerService.class);

    private static final String TRIGGER_GROUP = "flowforge-cron-triggers";
    private static final String JOB_GROUP = "flowforge-cron-jobs";

    private final Scheduler scheduler;

    public QuartzSchedulerService(Scheduler scheduler) {
        this.scheduler = scheduler;
    }

    /**
     * Schedule a Quartz job for a CRON-type EventTriggerConfig.
     */
    public void scheduleCronTrigger(EventTriggerConfig config) {
        if (!"CRON".equals(config.getSourceType())) {
            return;
        }

        String jobKey = buildJobKey(config.getId());
        String triggerKey = buildTriggerKey(config.getId());

        JobDetail jobDetail = JobBuilder.newJob(CronTriggerJob.class)
                .withIdentity(jobKey, JOB_GROUP)
                .usingJobData("triggerId", config.getId())
                .usingJobData("clientId", config.getClientId())
                .usingJobData("workflowId", config.getWorkflowId())
                .usingJobData("workflowName", config.getWorkflowName())
                .storeDurably()
                .build();

        CronScheduleBuilder cronSchedule;
        try {
            cronSchedule = CronScheduleBuilder.cronSchedule(config.getTopicOrUrl())
                    .withMisfireHandlingInstructionDoNothing();
        } catch (Exception e) {
            log.error("Invalid cron expression for trigger {}: {}", config.getId(), config.getTopicOrUrl(), e);
            throw new IllegalArgumentException("Invalid cron expression: " + config.getTopicOrUrl(), e);
        }

        org.quartz.Trigger quartzTrigger = TriggerBuilder.newTrigger()
                .withIdentity(triggerKey, TRIGGER_GROUP)
                .forJob(jobDetail)
                .withSchedule(cronSchedule)
                .build();

        try {
            if (scheduler.checkExists(new JobKey(jobKey, JOB_GROUP))) {
                scheduler.deleteJob(new JobKey(jobKey, JOB_GROUP));
            }
            scheduler.scheduleJob(jobDetail, quartzTrigger);
            log.info("Scheduled CRON trigger {} for workflow {} with expression: {}",
                    config.getId(), config.getWorkflowId(), config.getTopicOrUrl());
        } catch (SchedulerException e) {
            log.error("Failed to schedule CRON trigger {}", config.getId(), e);
            throw new RuntimeException("Failed to schedule CRON trigger: " + config.getId(), e);
        }
    }

    /**
     * Remove a Quartz job for the given trigger ID.
     */
    public void unscheduleCronTrigger(String triggerId) {
        String jobKey = buildJobKey(triggerId);
        try {
            boolean deleted = scheduler.deleteJob(new JobKey(jobKey, JOB_GROUP));
            if (deleted) {
                log.info("Unscheduled CRON trigger {}", triggerId);
            } else {
                log.warn("CRON trigger {} not found in scheduler", triggerId);
            }
        } catch (SchedulerException e) {
            log.error("Failed to unschedule CRON trigger {}", triggerId, e);
            throw new RuntimeException("Failed to unschedule CRON trigger: " + triggerId, e);
        }
    }

    /**
     * Pause a Quartz job for the given trigger ID.
     */
    public void pauseCronTrigger(String triggerId) {
        String triggerKey = buildTriggerKey(triggerId);
        try {
            scheduler.pauseTrigger(new TriggerKey(triggerKey, TRIGGER_GROUP));
            log.info("Paused CRON trigger {}", triggerId);
        } catch (SchedulerException e) {
            log.error("Failed to pause CRON trigger {}", triggerId, e);
            throw new RuntimeException("Failed to pause CRON trigger: " + triggerId, e);
        }
    }

    /**
     * Resume a paused Quartz job for the given trigger ID.
     */
    public void resumeCronTrigger(String triggerId) {
        String triggerKey = buildTriggerKey(triggerId);
        try {
            scheduler.resumeTrigger(new TriggerKey(triggerKey, TRIGGER_GROUP));
            log.info("Resumed CRON trigger {}", triggerId);
        } catch (SchedulerException e) {
            log.error("Failed to resume CRON trigger {}", triggerId, e);
            throw new RuntimeException("Failed to resume CRON trigger: " + triggerId, e);
        }
    }

    /**
     * Check if a scheduled job exists for the given trigger ID.
     */
    public boolean jobExists(String triggerId) {
        try {
            return scheduler.checkExists(new JobKey(buildJobKey(triggerId), JOB_GROUP));
        } catch (SchedulerException e) {
            log.error("Error checking job existence for trigger {}", triggerId, e);
            return false;
        }
    }

    private String buildJobKey(String triggerId) {
        return "cron-trigger-job-" + triggerId;
    }

    private String buildTriggerKey(String triggerId) {
        return "cron-trigger-" + triggerId;
    }
}
