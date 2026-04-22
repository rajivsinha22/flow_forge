package com.flowforge.execution.repository;

import com.flowforge.execution.model.WorkflowExecution;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WorkflowExecutionRepository extends MongoRepository<WorkflowExecution, String> {

    Page<WorkflowExecution> findByClientId(String clientId, Pageable pageable);

    List<WorkflowExecution> findByClientIdAndStatus(String clientId, String status);

    Page<WorkflowExecution> findByClientIdAndStatus(String clientId, String status, Pageable pageable);

    List<WorkflowExecution> findByClientIdAndWorkflowId(String clientId, String workflowId);

    Page<WorkflowExecution> findByClientIdAndWorkflowId(String clientId, String workflowId, Pageable pageable);

    Page<WorkflowExecution> findByClientIdAndWorkflowName(String clientId, String workflowName, Pageable pageable);

    long countByClientIdAndStartedAtAfter(String clientId, LocalDateTime after);

    // ── Namespace-aware query methods ─────────────────────────────────────────

    Page<WorkflowExecution> findByClientIdAndNamespace(String clientId, String namespace, Pageable pageable);

    Page<WorkflowExecution> findByClientIdAndNamespaceAndStatus(String clientId, String namespace, String status, Pageable pageable);

    Page<WorkflowExecution> findByClientIdAndNamespaceAndWorkflowName(String clientId, String namespace, String workflowName, Pageable pageable);

    long countByClientIdAndNamespaceAndStartedAtAfter(String clientId, String namespace, LocalDateTime after);

    Page<WorkflowExecution> findByClientIdAndNamespaceAndModelRecordId(String clientId, String namespace, String modelRecordId, Pageable pageable);

    @Query("{'clientId': ?0, 'namespace': ?1, 'workflowName': {'$regex': ?2, '$options': 'i'}}")
    Page<WorkflowExecution> searchByClientIdAndNamespaceAndWorkflowName(String clientId, String namespace, String query, Pageable pageable);

    Page<WorkflowExecution> findByClientIdAndNamespaceAndStartedAtBetween(String clientId, String namespace, LocalDateTime from, LocalDateTime to, Pageable pageable);

    // ── Additional helpers for AI features ───────────────────────────────────

    long countByClientIdAndNamespace(String clientId, String namespace);

    long countByClientIdAndNamespaceAndStatus(String clientId, String namespace, String status);

    long countByClientIdAndNamespaceAndStatusAndStartedAtAfter(String clientId, String namespace, String status, LocalDateTime after);

    long countByClientIdAndNamespaceAndStatusAndWorkflowNameAndStartedAtAfter(String clientId, String namespace, String status, String workflowName, LocalDateTime after);

    long countByClientIdAndNamespaceAndWorkflowNameAndStartedAtAfter(String clientId, String namespace, String workflowName, LocalDateTime after);

    List<WorkflowExecution> findByClientIdAndNamespaceAndWorkflowIdAndStartedAtAfter(String clientId, String namespace, String workflowId, LocalDateTime after);

    List<WorkflowExecution> findByClientIdAndNamespaceAndStartedAtAfter(String clientId, String namespace, LocalDateTime after);

    List<WorkflowExecution> findTop100ByClientIdAndNamespaceAndWorkflowIdOrderByStartedAtDesc(String clientId, String namespace, String workflowId);
}
