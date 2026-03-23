package com.flowforge.integration.repository;

import com.flowforge.integration.model.TriggerActivationLog;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TriggerActivationLogRepository extends MongoRepository<TriggerActivationLog, String> {

    List<TriggerActivationLog> findTop10ByTriggerIdOrderByActivatedAtDesc(String triggerId);

    List<TriggerActivationLog> findByClientId(String clientId);
}
