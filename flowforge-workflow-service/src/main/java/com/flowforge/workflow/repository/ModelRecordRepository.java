package com.flowforge.workflow.repository;

import com.flowforge.workflow.model.ModelRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ModelRecordRepository extends MongoRepository<ModelRecord, String> {

    List<ModelRecord> findByClientId(String clientId);

    List<ModelRecord> findByClientIdAndDataModelId(String clientId, String dataModelId);

    Optional<ModelRecord> findByClientIdAndId(String clientId, String id);

    boolean existsByClientIdAndDataModelIdAndName(String clientId, String dataModelId, String name);

    boolean existsByClientIdAndDataModelIdAndNameAndIdNot(String clientId, String dataModelId, String name, String id);

    long countByClientIdAndDataModelId(String clientId, String dataModelId);

    // ── Namespace-aware query methods ─────────────────────────────────────────

    List<ModelRecord> findByClientIdAndNamespace(String clientId, String namespace);

    List<ModelRecord> findByClientIdAndNamespaceAndDataModelId(String clientId, String namespace, String dataModelId);

    Optional<ModelRecord> findByClientIdAndNamespaceAndId(String clientId, String namespace, String id);

    boolean existsByClientIdAndNamespaceAndDataModelIdAndName(String clientId, String namespace, String dataModelId, String name);

    long countByClientIdAndNamespace(String clientId, String namespace);

    @Query("{'clientId': ?0, 'namespace': ?1, 'name': {'$regex': ?2, '$options': 'i'}}")
    List<ModelRecord> searchByClientIdAndNamespaceAndName(String clientId, String namespace, String query);
}
