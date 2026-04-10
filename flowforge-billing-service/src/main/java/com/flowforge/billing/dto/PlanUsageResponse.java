package com.flowforge.billing.dto;

public class PlanUsageResponse {

    private String plan;
    private UsageDetail workflows;
    private UsageDetail models;
    private UsageDetail executions;
    private UsageDetail teamMembers;
    private UsageDetail webhooks;

    public PlanUsageResponse() {
    }

    public PlanUsageResponse(String plan, UsageDetail workflows, UsageDetail models,
                             UsageDetail executions, UsageDetail teamMembers, UsageDetail webhooks) {
        this.plan = plan;
        this.workflows = workflows;
        this.models = models;
        this.executions = executions;
        this.teamMembers = teamMembers;
        this.webhooks = webhooks;
    }

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }

    public UsageDetail getWorkflows() { return workflows; }
    public void setWorkflows(UsageDetail workflows) { this.workflows = workflows; }

    public UsageDetail getModels() { return models; }
    public void setModels(UsageDetail models) { this.models = models; }

    public UsageDetail getExecutions() { return executions; }
    public void setExecutions(UsageDetail executions) { this.executions = executions; }

    public UsageDetail getTeamMembers() { return teamMembers; }
    public void setTeamMembers(UsageDetail teamMembers) { this.teamMembers = teamMembers; }

    public UsageDetail getWebhooks() { return webhooks; }
    public void setWebhooks(UsageDetail webhooks) { this.webhooks = webhooks; }

    public static class UsageDetail {

        private int used;
        private int limit;

        public UsageDetail() {
        }

        public UsageDetail(int used, int limit) {
            this.used = used;
            this.limit = limit;
        }

        public int getUsed() { return used; }
        public void setUsed(int used) { this.used = used; }

        public int getLimit() { return limit; }
        public void setLimit(int limit) { this.limit = limit; }
    }
}
