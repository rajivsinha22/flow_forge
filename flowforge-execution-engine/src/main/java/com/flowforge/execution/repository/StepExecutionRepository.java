package com.flowforge.execution.repository;

import com.flowforge.execution.model.StepExecution;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StepExecutionRepository extends MongoRepository<StepExecution, String> {

    List<StepExecution> findByExecutionId(String executionId);

    List<StepExecution> findByExecutionIdOrderByStartedAtAsc(String executionId);

    Optional<StepExecution> findByExecutionIdAndStepId(String executionId, String stepId);

    List<StepExecution> findByExecutionIdAndStatus(String executionId, String status);

    void deleteByExecutionId(String executionId);

    List<StepExecution> findByExecutionIdIn(List<String> executionIds);

    List<StepExecution> findByClientIdAndNamespaceAndStatusAndStartedAtAfter(
            String clientId, String namespace, String status, java.time.LocalDateTime after);

    List<StepExecution> findByClientIdAndNamespaceAndStartedAtAfter(
            String clientId, String namespace, java.time.LocalDateTime after);
}
