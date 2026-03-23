package com.flowforge.client.controller;

import com.flowforge.client.dto.*;
import com.flowforge.client.service.AuthService;
import com.flowforge.client.service.ClientService;
import com.flowforge.common.model.Client;
import com.flowforge.common.response.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class ClientController {

    private final ClientService clientService;
    private final AuthService authService;

    public ClientController(ClientService clientService, AuthService authService) {
        this.clientService = clientService;
        this.authService = authService;
    }

    @PostMapping("/api/v1/clients/register")
    public ResponseEntity<ApiResponse<Client>> register(@Valid @RequestBody RegisterRequest request) {
        Client client = clientService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(client, "Client registered successfully"));
    }

    @PostMapping("/api/v1/clients/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.authenticate(request);
        return ResponseEntity.ok(ApiResponse.success(response, "Login successful"));
    }

    @GetMapping("/api/v1/clients/me")
    public ResponseEntity<ApiResponse<Client>> getMe(@RequestHeader("X-Client-Id") String clientId) {
        Client client = clientService.getClient(clientId);
        return ResponseEntity.ok(ApiResponse.success(client));
    }

    @PutMapping("/api/v1/clients/me")
    public ResponseEntity<ApiResponse<Client>> updateMe(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestBody UpdateClientRequest request) {
        Client client = clientService.updateClient(clientId, request);
        return ResponseEntity.ok(ApiResponse.success(client, "Client updated successfully"));
    }

    @PutMapping("/api/v1/clients/me/webhook")
    public ResponseEntity<ApiResponse<Client>> updateWebhook(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestBody Map<String, String> body) {
        String webhookUrl = body.get("webhookUrl");
        String webhookSecret = body.get("webhookSecret");
        Client client = clientService.updateWebhook(clientId, webhookUrl, webhookSecret);
        return ResponseEntity.ok(ApiResponse.success(client, "Webhook updated successfully"));
    }

    @GetMapping("/api/v1/clients/me/env-vars")
    public ResponseEntity<ApiResponse<List<Map<String, String>>>> listEnvVars(
            @RequestHeader("X-Client-Id") String clientId) {
        List<Map<String, String>> envVars = clientService.listEnvVars(clientId);
        return ResponseEntity.ok(ApiResponse.success(envVars));
    }

    @PutMapping("/api/v1/clients/me/env-vars")
    public ResponseEntity<ApiResponse<Object>> upsertEnvVar(
            @RequestHeader("X-Client-Id") String clientId,
            @Valid @RequestBody EnvVarRequest request) {
        clientService.upsertEnvVar(clientId, request);
        return ResponseEntity.ok(ApiResponse.success(null, "Environment variable updated"));
    }

    @GetMapping("/api/v1/clients/me/rate-limits")
    public ResponseEntity<ApiResponse<RateLimitConfig>> getRateLimits(
            @RequestHeader("X-Client-Id") String clientId) {
        RateLimitConfig config = clientService.getRateLimits(clientId);
        return ResponseEntity.ok(ApiResponse.success(config));
    }

    @PutMapping("/api/v1/clients/me/rate-limits")
    public ResponseEntity<ApiResponse<RateLimitConfig>> updateRateLimits(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestBody RateLimitConfig config) {
        RateLimitConfig updated = clientService.updateRateLimits(clientId, config);
        return ResponseEntity.ok(ApiResponse.success(updated, "Rate limits updated"));
    }

    @PostMapping("/api/v1/auth/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refreshToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Missing or invalid token"));
        }
        String token = authHeader.substring(7);
        LoginResponse response = authService.refreshToken(token);
        return ResponseEntity.ok(ApiResponse.success(response, "Token refreshed"));
    }

    @PostMapping("/api/v1/auth/logout")
    public ResponseEntity<ApiResponse<Object>> logout(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        authService.logout(authHeader);
        return ResponseEntity.ok(ApiResponse.success(null, "Logged out successfully"));
    }
}
