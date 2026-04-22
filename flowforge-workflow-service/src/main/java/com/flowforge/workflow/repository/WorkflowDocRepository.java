package com.flowforge.workflow.repository;

import com.flowforge.workflow.model.WorkflowDoc;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WorkflowDocRepository extends MongoRepository<WorkflowDoc, String> {

    Optional<WorkflowDoc> findByClientIdAndNamespaceAndWorkflowId(String clientId, String namespace, String workflowId);

    void deleteByClientIdAndNamespaceAndWorkflowId(String clientId, String namespace, String workflowId);
}
