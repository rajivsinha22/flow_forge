package com.flowforge.client.repository;

import com.flowforge.common.model.Namespace;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NamespaceRepository extends MongoRepository<Namespace, String> {

    List<Namespace> findByClientId(String clientId);

    Optional<Namespace> findByClientIdAndName(String clientId, String name);

    boolean existsByClientIdAndName(String clientId, String name);

    long countByClientId(String clientId);
}
