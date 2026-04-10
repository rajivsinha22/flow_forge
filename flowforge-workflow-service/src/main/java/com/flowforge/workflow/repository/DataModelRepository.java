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
}
