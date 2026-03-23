package com.flowforge.integration.repository;

import com.flowforge.integration.model.DlqMessage;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DlqMessageRepository extends MongoRepository<DlqMessage, String> {

    Page<DlqMessage> findByClientId(String clientId, Pageable pageable);

    List<DlqMessage> findByClientIdAndStatus(String clientId, String status);

    Page<DlqMessage> findByClientIdAndStatus(String clientId, String status, Pageable pageable);

    long countByClientIdAndStatus(String clientId, String status);

    List<DlqMessage> findByClientIdAndWorkflowId(String clientId, String workflowId);
}
