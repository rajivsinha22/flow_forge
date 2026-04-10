package com.flowforge.billing.repository;

import com.flowforge.billing.model.PaymentEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentEventRepository extends MongoRepository<PaymentEvent, String> {

    Page<PaymentEvent> findByClientIdOrderByReceivedAtDesc(String clientId, Pageable pageable);
}
