package com.flowforge.integration.repository;

import com.flowforge.integration.model.WebhookDelivery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WebhookDeliveryRepository extends MongoRepository<WebhookDelivery, String> {

    Page<WebhookDelivery> findByClientId(String clientId, Pageable pageable);

    List<WebhookDelivery> findByClientIdAndStatus(String clientId, String status);

    Page<WebhookDelivery> findByClientIdAndStatus(String clientId, String status, Pageable pageable);

    long countByClientIdAndStatus(String clientId, String status);

    List<WebhookDelivery> findByStatusAndNextRetryAtBefore(String status, LocalDateTime now);
}
