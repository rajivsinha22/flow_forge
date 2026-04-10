package com.flowforge.common.model;

import java.util.Objects;

/**
 * Central plan limits configuration — single source of truth for all plan-based
 * resource limits. Used by every backend service for enforcement.
 *
 * A value of -1 means "unlimited".
 */
public class PlanLimits {

    private final int maxWorkflows;
    private final int maxModels;
    private final int maxExecutionsPerMonth;
    private final int maxTeamMembers;
    private final int reqPerMinute;
    private final int burstCapacity;
    private final int maxWebhooksPerDay;
    private final int priceMonthly; // cents (0 = free, -1 = custom/contact sales)

    private PlanLimits(int maxWorkflows, int maxModels, int maxExecutionsPerMonth,
                       int maxTeamMembers, int reqPerMinute, int burstCapacity,
                       int maxWebhooksPerDay, int priceMonthly) {
        this.maxWorkflows = maxWorkflows;
        this.maxModels = maxModels;
        this.maxExecutionsPerMonth = maxExecutionsPerMonth;
        this.maxTeamMembers = maxTeamMembers;
        this.reqPerMinute = reqPerMinute;
        this.burstCapacity = burstCapacity;
        this.maxWebhooksPerDay = maxWebhooksPerDay;
        this.priceMonthly = priceMonthly;
    }

    /**
     * Returns the plan limits for the given plan tier.
     */
    public static PlanLimits forPlan(Client.Plan plan) {
        return switch (plan) {
            case FREE -> new PlanLimits(
                    3,       // workflows
                    5,       // models
                    1_000,   // executions/month
                    2,       // team members
                    10,      // req/min
                    20,      // burst capacity
                    100,     // webhooks/day
                    0        // free
            );
            case PRO -> new PlanLimits(
                    25,      // workflows
                    50,      // models
                    100_000, // executions/month
                    10,      // team members
                    60,      // req/min
                    100,     // burst capacity
                    10_000,  // webhooks/day
                    4_900    // $49/mo
            );
            case ENTERPRISE -> new PlanLimits(
                    -1,      // unlimited
                    -1,
                    -1,
                    -1,
                    600,     // req/min
                    1_000,   // burst capacity
                    -1,
                    -1       // custom pricing
            );
        };
    }

    /**
     * Checks if the current count exceeds or meets this limit.
     * Returns false (not exceeded) when the limit is -1 (unlimited).
     */
    public static boolean isExceeded(int limit, long currentCount) {
        return limit != -1 && currentCount >= limit;
    }

    // ── Getters ──────────────────────────────────────────────────────────

    public int getMaxWorkflows() { return maxWorkflows; }
    public int getMaxModels() { return maxModels; }
    public int getMaxExecutionsPerMonth() { return maxExecutionsPerMonth; }
    public int getMaxTeamMembers() { return maxTeamMembers; }
    public int getReqPerMinute() { return reqPerMinute; }
    public int getBurstCapacity() { return burstCapacity; }
    public int getMaxWebhooksPerDay() { return maxWebhooksPerDay; }
    public int getPriceMonthly() { return priceMonthly; }

    @Override
    public String toString() {
        return "PlanLimits{" +
                "maxWorkflows=" + maxWorkflows +
                ", maxModels=" + maxModels +
                ", maxExecutionsPerMonth=" + maxExecutionsPerMonth +
                ", maxTeamMembers=" + maxTeamMembers +
                ", reqPerMinute=" + reqPerMinute +
                ", burstCapacity=" + burstCapacity +
                ", maxWebhooksPerDay=" + maxWebhooksPerDay +
                ", priceMonthly=" + priceMonthly +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        PlanLimits that = (PlanLimits) o;
        return maxWorkflows == that.maxWorkflows &&
                maxModels == that.maxModels &&
                maxExecutionsPerMonth == that.maxExecutionsPerMonth &&
                maxTeamMembers == that.maxTeamMembers &&
                reqPerMinute == that.reqPerMinute &&
                burstCapacity == that.burstCapacity &&
                maxWebhooksPerDay == that.maxWebhooksPerDay &&
                priceMonthly == that.priceMonthly;
    }

    @Override
    public int hashCode() {
        return Objects.hash(maxWorkflows, maxModels, maxExecutionsPerMonth,
                maxTeamMembers, reqPerMinute, burstCapacity, maxWebhooksPerDay, priceMonthly);
    }
}
