package com.flowforge.client.repository;

import com.flowforge.common.model.InvitationToken;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvitationTokenRepository extends MongoRepository<InvitationToken, String> {

    Optional<InvitationToken> findByToken(String token);

    Optional<InvitationToken> findByTokenAndStatus(String token, InvitationToken.InviteStatus status);

    List<InvitationToken> findByClientId(String clientId);

    List<InvitationToken> findByClientIdAndStatus(String clientId, InvitationToken.InviteStatus status);
}
