package com.flowforge.client.service;

import com.flowforge.client.dto.*;
import com.flowforge.client.repository.ClientRepository;
import com.flowforge.client.repository.ClientUserRepository;
import com.flowforge.client.repository.EnvVariableRepository;
import com.flowforge.client.repository.RoleRepository;
import com.flowforge.common.audit.AuditService;
import com.flowforge.common.exception.ResourceNotFoundException;
import com.flowforge.common.exception.WorkflowValidationException;
import com.flowforge.common.model.Client;
import com.flowforge.common.model.ClientUser;
import com.flowforge.common.model.EnvVariable;
import com.flowforge.common.model.PlanLimits;
import com.flowforge.common.model.Role;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ClientService {

    private static final Logger log = LoggerFactory.getLogger(ClientService.class);

    private final ClientRepository clientRepository;
    private final ClientUserRepository clientUserRepository;
    private final RoleRepository roleRepository;
    private final EnvVariableRepository envVariableRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public ClientService(ClientRepository clientRepository,
                         ClientUserRepository clientUserRepository,
                         RoleRepository roleRepository,
                         EnvVariableRepository envVariableRepository,
                         PasswordEncoder passwordEncoder,
                         AuditService auditService) {
        this.clientRepository = clientRepository;
        this.clientUserRepository = clientUserRepository;
        this.roleRepository = roleRepository;
        this.envVariableRepository = envVariableRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    public Client register(RegisterRequest request) {
        // Create the client (organization)
        Client client = Client.builder()
                .name(request.getOrgName())
                .plan(request.getPlan() != null ? request.getPlan() : Client.Plan.FREE)
                .webhookUrl(request.getWebhookUrl())
                .createdAt(Instant.now())
                .build();
        client = clientRepository.save(client);

        // Create default admin role
        Role adminRole = Role.builder()
                .clientId(client.getId())
                .name("ADMIN")
                .permissions(List.of(
                        "workflows:read", "workflows:write", "workflows:delete",
                        "executions:read", "executions:write",
                        "users:read", "users:write",
                        "roles:read", "roles:write",
                        "api-keys:read", "api-keys:write",
                        "audit-logs:read",
                        "analytics:read",
                        "settings:read", "settings:write"
                ))
                .build();
        roleRepository.save(adminRole);

        // Create admin user
        ClientUser adminUser = ClientUser.builder()
                .clientId(client.getId())
                .name(request.getYourName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .roles(Collections.singletonList("ADMIN"))
                .status(ClientUser.UserStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();
        clientUserRepository.save(adminUser);

        auditService.logEvent(client.getId(), request.getEmail(), "CLIENT_REGISTERED",
                Map.of("orgName", request.getOrgName(), "plan", client.getPlan().name()));

        return client;
    }

    public Client getClient(String clientId) {
        return clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", clientId));
    }

    public Client updateClient(String clientId, UpdateClientRequest request) {
        Client client = getClient(clientId);

        if (request.getName() != null && !request.getName().isBlank()) {
            client.setName(request.getName());
        }
        if (request.getWebhookUrl() != null) {
            client.setWebhookUrl(request.getWebhookUrl());
        }
        if (request.getWebhookSecret() != null) {
            client.setWebhookSecret(request.getWebhookSecret());
        }
        if (request.getWebhookEnabled() != null) {
            client.setWebhookEnabled(request.getWebhookEnabled());
        }

        return clientRepository.save(client);
    }

    public Client updateWebhook(String clientId, String webhookUrl, String webhookSecret) {
        Client client = getClient(clientId);
        client.setWebhookUrl(webhookUrl);
        if (webhookSecret != null) {
            client.setWebhookSecret(webhookSecret);
        }
        return clientRepository.save(client);
    }

    public List<Map<String, String>> listEnvVars(String clientId) {
        return envVariableRepository.findByClientId(clientId).stream()
                .map(v -> Map.of("name", v.getName(), "value", maskValue(v.getValue())))
                .collect(Collectors.toList());
    }

    public EnvVariable upsertEnvVar(String clientId, EnvVarRequest request) {
        EnvVariable existing = envVariableRepository
                .findByClientIdAndName(clientId, request.getName())
                .orElse(null);

        if (existing != null) {
            existing.setValue(encryptValue(request.getValue()));
            return envVariableRepository.save(existing);
        } else {
            EnvVariable newVar = EnvVariable.builder()
                    .clientId(clientId)
                    .name(request.getName())
                    .value(encryptValue(request.getValue()))
                    .createdAt(Instant.now())
                    .build();
            return envVariableRepository.save(newVar);
        }
    }

    public RateLimitConfig getRateLimits(String clientId) {
        Client client = getClient(clientId);
        PlanLimits limits = PlanLimits.forPlan(client.getPlan());
        return new RateLimitConfig(limits.getReqPerMinute(), limits.getBurstCapacity());
    }

    public RateLimitConfig updateRateLimits(String clientId, RateLimitConfig config) {
        // In a real implementation, persist this to MongoDB
        // For now, validate and return
        if (config.getExecPerMinute() <= 0) {
            throw new WorkflowValidationException("execPerMinute must be positive");
        }
        if (config.getBurstCapacity() <= 0) {
            throw new WorkflowValidationException("burstCapacity must be positive");
        }
        return config;
    }

    private String maskValue(String value) {
        if (value == null || value.length() < 4) {
            return "****";
        }
        return "****" + value.substring(value.length() - 4);
    }

    private String encryptValue(String value) {
        // Simple Base64 encoding as placeholder; use AES in production
        return Base64.getEncoder().encodeToString(value.getBytes());
    }
}
