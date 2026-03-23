package com.flowforge.integration.repository;

import com.flowforge.integration.model.EventTriggerConfig;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventTriggerConfigRepository extends MongoRepository<EventTriggerConfig, String> {

    List<EventTriggerConfig> findByClientId(String clientId);

    List<EventTriggerConfig> findByClientIdAndEnabled(String clientId, boolean enabled);

    List<EventTriggerConfig> findBySourceTypeAndEnabled(String sourceType, boolean enabled);

    boolean existsByClientIdAndName(String clientId, String name);
}
