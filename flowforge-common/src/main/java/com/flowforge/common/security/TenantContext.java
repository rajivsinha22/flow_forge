package com.flowforge.common.security;

import java.util.List;

public class TenantContext {

    private static final ThreadLocal<String> CLIENT_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> USER_ID = new ThreadLocal<>();
    private static final ThreadLocal<List<String>> ROLES = new ThreadLocal<>();

    public static void setClientId(String clientId) {
        CLIENT_ID.set(clientId);
    }

    public static String getClientId() {
        return CLIENT_ID.get();
    }

    public static void setUserId(String userId) {
        USER_ID.set(userId);
    }

    public static String getUserId() {
        return USER_ID.get();
    }

    public static void setRoles(List<String> roles) {
        ROLES.set(roles);
    }

    public static List<String> getRoles() {
        return ROLES.get();
    }

    public static void clear() {
        CLIENT_ID.remove();
        USER_ID.remove();
        ROLES.remove();
    }
}
