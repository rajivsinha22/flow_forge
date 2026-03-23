package com.flowforge.client.repository;

import com.flowforge.common.model.ApiKey;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApiKeyRepository extends MongoRepository<ApiKey, String> {

    List<ApiKey> findByClientId(String clientId);

    List<ApiKey> findByClientIdAndRevokedFalse(String clientId);

    Optional<ApiKey> findByKeyHash(String keyHash);
}
