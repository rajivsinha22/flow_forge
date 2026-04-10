package com.flowforge.common.exception;

import com.flowforge.common.model.Client;

/**
 * Thrown when a tenant attempts to create a resource that would exceed
 * their current plan's limits.
 */
public class PlanLimitExceededException extends WorkflowBaseException {

    private final Client.Plan plan;
    private final String resource;
    private final long currentCount;
    private final int limit;

    public PlanLimitExceededException(Client.Plan plan, String resource, long currentCount, int limit) {
        super(
                String.format("%s limit reached on %s plan: %d/%d. Please upgrade your plan.",
                        capitalize(resource), plan.name(), currentCount, limit),
                "PLAN_LIMIT_EXCEEDED"
        );
        this.plan = plan;
        this.resource = resource;
        this.currentCount = currentCount;
        this.limit = limit;
    }

    public Client.Plan getPlan() { return plan; }
    public String getResource() { return resource; }
    public long getCurrentCount() { return currentCount; }
    public int getLimit() { return limit; }

    private static String capitalize(String s) {
        if (s == null || s.isEmpty()) return s;
        return s.substring(0, 1).toUpperCase() + s.substring(1);
    }
}
