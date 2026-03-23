package com.flowforge.common.audit;

import java.util.Map;

public interface AuditService {

    void logEvent(String clientId, String actor, String action, Map<String, Object> details);
}
