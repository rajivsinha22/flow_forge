package com.flowforge.workflow.config;

public class TenantContext {

    private static final ThreadLocal<String> CURRENT_CLIENT = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_PLAN = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_NAMESPACE = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setClientId(String clientId) {
        CURRENT_CLIENT.set(clientId);
    }

    public static String getClientId() {
        return CURRENT_CLIENT.get();
    }

    public static void setPlan(String plan) {
        CURRENT_PLAN.set(plan);
    }

    public static String getPlan() {
        return CURRENT_PLAN.get();
    }

    public static void setNamespace(String namespace) {
        CURRENT_NAMESPACE.set(namespace);
    }

    public static String getNamespace() {
        String ns = CURRENT_NAMESPACE.get();
        return ns != null ? ns : "default";
    }

    public static void clear() {
        CURRENT_CLIENT.remove();
        CURRENT_PLAN.remove();
        CURRENT_NAMESPACE.remove();
    }
}
