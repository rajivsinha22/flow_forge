package com.flowforge.client.repository;

import com.flowforge.common.model.Role;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoleRepository extends MongoRepository<Role, String> {

    List<Role> findByClientId(String clientId);

    Optional<Role> findByClientIdAndName(String clientId, String name);
}
