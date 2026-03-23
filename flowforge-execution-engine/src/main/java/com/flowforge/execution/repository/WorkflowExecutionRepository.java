package com.flowforge.execution.repository;

import com.flowforge.execution.model.WorkflowExecution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkflowExecutionRepository extends MongoRepository<WorkflowExecution, String> {

    Page<WorkflowExecution> findByClientId(String clientId, Pageable pageable);

    List<WorkflowExecution> findByClientIdAndStatus(String clientId, String status);

    Page<WorkflowExecution> findByClientIdAndStatus(String clientId, String status, Pageable pageable);

    List<WorkflowExecution> findByClientIdAndWorkflowId(String clientId, String workflowId);

    Page<WorkflowExecution> findByClientIdAndWorkflowId(String clientId, String workflowId, Pageable pageable);

    Page<WorkflowExecution> findByClientIdAndWorkflowName(String clientId, String workflowName, Pageable pageable);
}
