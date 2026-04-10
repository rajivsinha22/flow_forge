package com.flowforge.workflow.repository;

import com.flowforge.workflow.model.DataModel;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DataModelRepository extends MongoRepository<DataModel, String> {

    List<DataModel> findByClientId(String clientId);

    List<DataModel> findByClientIdAndActiveTrue(String clientId);

    Optional<DataModel> findByClientIdAndId(String clientId, String id);

    Optional<DataModel> findByClientIdAndName(String clientId, String name);

    boolean existsByClientIdAndName(String clientId, String name);

    boolean existsByClientIdAndNameAndIdNot(String clientId, String name, String id);

    long countByClientIdAndInputModelIdOrOutputModelId(String clientId, String inputModelId, String outputModelId);

    long countByClientId(String clientId);

    // ── Namespace-aware query methods ─────────────────────────────────────────

    List<DataModel> findByClientIdAndNamespace(String clientId, String namespace);

    List<DataModel> findByClientIdAndNamespaceAndActiveTrue(String clientId, String namespace);

    Optional<DataModel> findByClientIdAndNamespaceAndId(String clientId, String namespace, String id);

    Optional<DataModel> findByClientIdAndNamespaceAndName(String clientId, String namespace, String name);

    boolean existsByClientIdAndNamespaceAndName(String clientId, String namespace, String name);

    long countByClientIdAndNamespace(String clientId, String namespace);
}
