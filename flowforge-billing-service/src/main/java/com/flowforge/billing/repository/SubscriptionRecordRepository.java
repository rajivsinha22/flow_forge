package com.flowforge.billing.repository;

import com.flowforge.billing.model.SubscriptionRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SubscriptionRecordRepository extends MongoRepository<SubscriptionRecord, String> {

    Optional<SubscriptionRecord> findByClientId(String clientId);
}
