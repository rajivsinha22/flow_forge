package com.flowforge.execution.repository;

import com.flowforge.execution.model.WaitToken;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;
import java.util.Optional;

public interface WaitTokenRepository extends MongoRepository<WaitToken, String> {
    List<WaitToken> findByExecutionIdAndStatus(String executionId, String status);
    List<WaitToken> findByClientIdAndStatus(String clientId, String status);
    Optional<WaitToken> findByToken(String token);
    Optional<WaitToken> findByExecutionIdAndStepId(String executionId, String stepId);
    List<WaitToken> findByExecutionId(String executionId);
}
