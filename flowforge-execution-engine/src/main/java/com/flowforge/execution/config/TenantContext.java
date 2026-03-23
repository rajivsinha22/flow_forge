package com.flowforge.execution.config;

public class TenantContext {

    private static final ThreadLocal<String> CURRENT_CLIENT = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void setClientId(String clientId) {
        CURRENT_CLIENT.set(clientId);
    }

    public static String getClientId() {
        return CURRENT_CLIENT.get();
    }

    public static void clear() {
        CURRENT_CLIENT.remove();
    }
}
