package com.flowforge.workflow.repository;

import com.flowforge.workflow.model.WorkflowDefinition;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkflowDefinitionRepository extends MongoRepository<WorkflowDefinition, String> {

    Optional<WorkflowDefinition> findByClientIdAndNameAndActiveVersionTrue(String clientId, String name);

    List<WorkflowDefinition> findByClientIdAndName(String clientId, String name);

    Page<WorkflowDefinition> findByClientId(String clientId, Pageable pageable);

    List<WorkflowDefinition> findByClientIdAndStatus(String clientId, String status);

    Page<WorkflowDefinition> findByClientIdAndStatusAndTriggerType(String clientId, String status, String triggerType, Pageable pageable);

    Page<WorkflowDefinition> findByClientIdAndStatus(String clientId, String status, Pageable pageable);

    Page<WorkflowDefinition> findByClientIdAndTriggerType(String clientId, String triggerType, Pageable pageable);

    Optional<WorkflowDefinition> findByClientIdAndNameAndVersion(String clientId, String name, int version);

    boolean existsByClientIdAndNameAndVersion(String clientId, String name, int version);
}
