package com.flowforge.client.service;

import com.flowforge.client.dto.ApiKeyResponse;
import com.flowforge.client.dto.CreateApiKeyRequest;
import com.flowforge.client.repository.ApiKeyRepository;
import com.flowforge.common.audit.AuditService;
import com.flowforge.common.exception.ResourceNotFoundException;
import com.flowforge.common.model.ApiKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ApiKeyService {

    private static final Logger log = LoggerFactory.getLogger(ApiKeyService.class);

    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public ApiKeyService(ApiKeyRepository apiKeyRepository,
                         PasswordEncoder passwordEncoder,
                         AuditService auditService) {
        this.apiKeyRepository = apiKeyRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    public ApiKeyResponse create(String clientId, CreateApiKeyRequest request, String actorEmail) {
        String rawKey = "ff_" + UUID.randomUUID().toString().replace("-", "");
        String prefix = rawKey.substring(0, 8);
        String keyHash = passwordEncoder.encode(rawKey);

        ApiKey apiKey = ApiKey.builder()
                .clientId(clientId)
                .name(request.getName())
                .keyHash(keyHash)
                .prefix(prefix)
                .createdAt(Instant.now())
                .revoked(false)
                .build();

        apiKey = apiKeyRepository.save(apiKey);

        auditService.logEvent(clientId, actorEmail, "API_KEY_CREATED",
                Map.of("keyId", apiKey.getId(), "name", request.getName()));

        return ApiKeyResponse.builder()
                .id(apiKey.getId())
                .name(apiKey.getName())
                .prefix(prefix)
                .key(rawKey) // Full key returned only on creation
                .createdAt(apiKey.getCreatedAt())
                .revoked(false)
                .build();
    }

    public List<ApiKeyResponse> list(String clientId) {
        return apiKeyRepository.findByClientId(clientId).stream()
                .map(k -> ApiKeyResponse.builder()
                        .id(k.getId())
                        .name(k.getName())
                        .prefix(k.getPrefix())
                        .key(null) // Masked on list
                        .createdAt(k.getCreatedAt())
                        .lastUsedAt(k.getLastUsedAt())
                        .revoked(k.isRevoked())
                        .build())
                .collect(Collectors.toList());
    }

    public void revoke(String clientId, String keyId, String actorEmail) {
        ApiKey apiKey = apiKeyRepository.findById(keyId)
                .filter(k -> k.getClientId().equals(clientId))
                .orElseThrow(() -> new ResourceNotFoundException("ApiKey", keyId));

        apiKey.setRevoked(true);
        apiKeyRepository.save(apiKey);

        auditService.logEvent(clientId, actorEmail, "API_KEY_REVOKED",
                Map.of("keyId", keyId, "name", apiKey.getName()));
    }
}
