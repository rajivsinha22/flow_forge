package com.flowforge.integration.repository;

import com.flowforge.integration.model.FailedWorkflow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FailedWorkflowRepository extends MongoRepository<FailedWorkflow, String> {

    Page<FailedWorkflow> findByClientId(String clientId, Pageable pageable);

    List<FailedWorkflow> findByClientIdAndStatus(String clientId, String status);

    Page<FailedWorkflow> findByClientIdAndStatus(String clientId, String status, Pageable pageable);

    long countByClientIdAndStatus(String clientId, String status);

    List<FailedWorkflow> findByClientIdAndWorkflowId(String clientId, String workflowId);
}
