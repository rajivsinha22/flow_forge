package com.flowforge.client.service;

import com.flowforge.client.repository.AuditEventRepository;
import com.flowforge.common.audit.AuditEvent;
import com.flowforge.common.audit.AuditService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
public class AuditServiceImpl implements AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditServiceImpl.class);

    private final AuditEventRepository auditEventRepository;

    public AuditServiceImpl(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @Override
    public void logEvent(String clientId, String actor, String action, Map<String, Object> details) {
        try {
            AuditEvent event = AuditEvent.builder()
                    .clientId(clientId)
                    .actor(actor)
                    .action(action)
                    .details(details)
                    .timestamp(Instant.now())
                    .build();
            auditEventRepository.save(event);
            log.debug("Audit event logged: clientId={}, actor={}, action={}", clientId, actor, action);
        } catch (Exception e) {
            log.error("Failed to save audit event: clientId={}, action={}", clientId, action, e);
        }
    }
}
