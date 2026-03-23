package com.flowforge.client.repository;

import com.flowforge.common.audit.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AuditEventRepository extends MongoRepository<AuditEvent, String> {

    Page<AuditEvent> findByClientId(String clientId, Pageable pageable);

    Page<AuditEvent> findByClientIdAndActor(String clientId, String actor, Pageable pageable);
}
