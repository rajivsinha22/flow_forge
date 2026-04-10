package com.flowforge.workflow.repository;

import com.flowforge.workflow.model.ModelRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
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
}
