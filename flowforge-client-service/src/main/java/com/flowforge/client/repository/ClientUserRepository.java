package com.flowforge.client.repository;

import com.flowforge.common.model.ClientUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientUserRepository extends MongoRepository<ClientUser, String> {

    Optional<ClientUser> findByEmailAndClientId(String email, String clientId);

    Optional<ClientUser> findByEmail(String email);

    List<ClientUser> findByClientId(String clientId);

    Page<ClientUser> findByClientId(String clientId, Pageable pageable);
}
