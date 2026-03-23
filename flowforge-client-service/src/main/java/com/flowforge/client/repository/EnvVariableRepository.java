package com.flowforge.client.repository;

import com.flowforge.common.model.EnvVariable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EnvVariableRepository extends MongoRepository<EnvVariable, String> {

    List<EnvVariable> findByClientId(String clientId);

    Optional<EnvVariable> findByClientIdAndName(String clientId, String name);
}
