package com.flowforge.client.controller;

import com.flowforge.client.dto.ApiKeyResponse;
import com.flowforge.client.dto.CreateApiKeyRequest;
import com.flowforge.client.service.ApiKeyService;
import com.flowforge.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/api-keys")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    public ApiKeyController(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ApiKeyResponse>>> listApiKeys(
            @RequestHeader("X-Client-Id") String clientId) {
        List<ApiKeyResponse> keys = apiKeyService.list(clientId);
        return ResponseEntity.ok(ApiResponse.success(keys));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ApiKeyResponse>> createApiKey(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String actorId,
            @Valid @RequestBody CreateApiKeyRequest request) {
        ApiKeyResponse key = apiKeyService.create(clientId, request, actorId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(key, "API key created. Store the key securely — it won't be shown again."));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> revokeApiKey(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String actorId,
            @PathVariable String id) {
        apiKeyService.revoke(clientId, id, actorId);
        return ResponseEntity.ok(ApiResponse.success(null, "API key revoked successfully"));
    }
}
