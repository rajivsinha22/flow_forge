package com.flowforge.client.service;

import com.flowforge.client.dto.InviteUserRequest;
import com.flowforge.client.dto.UserDto;
import com.flowforge.client.repository.ClientRepository;
import com.flowforge.client.repository.ClientUserRepository;
import com.flowforge.common.audit.AuditService;
import com.flowforge.common.exception.PlanLimitExceededException;
import com.flowforge.common.exception.ResourceNotFoundException;
import com.flowforge.common.model.Client;
import com.flowforge.common.model.ClientUser;
import com.flowforge.common.model.PlanLimits;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {

    private static final Logger log = LoggerFactory.getLogger(UserService.class);

    private final ClientUserRepository clientUserRepository;
    private final ClientRepository clientRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;

    public UserService(ClientUserRepository clientUserRepository,
                       ClientRepository clientRepository,
                       PasswordEncoder passwordEncoder,
                       AuditService auditService) {
        this.clientUserRepository = clientUserRepository;
        this.clientRepository = clientRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
    }

    public List<UserDto> listUsers(String clientId) {
        return clientUserRepository.findByClientId(clientId).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public UserDto invite(String clientId, InviteUserRequest request, String actorEmail) {
        // Plan enforcement — check team member count
        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new ResourceNotFoundException("Client", clientId));
        Client.Plan plan = client.getPlan() != null ? client.getPlan() : Client.Plan.FREE;
        PlanLimits limits = PlanLimits.forPlan(plan);
        long memberCount = clientUserRepository.countByClientId(clientId);
        if (PlanLimits.isExceeded(limits.getMaxTeamMembers(), memberCount)) {
            throw new PlanLimitExceededException(plan, "team members", memberCount, limits.getMaxTeamMembers());
        }

        String tempPassword = UUID.randomUUID().toString().replace("-", "").substring(0, 12);

        ClientUser newUser = ClientUser.builder()
                .clientId(clientId)
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(tempPassword))
                .roles(Collections.singletonList(request.getRole()))
                .status(ClientUser.UserStatus.ACTIVE)
                .createdAt(Instant.now())
                .build();

        newUser = clientUserRepository.save(newUser);

        auditService.logEvent(clientId, actorEmail, "USER_INVITED",
                Map.of("invitedEmail", request.getEmail(), "role", request.getRole()));

        log.info("User invited: {} with temp password: {} (send via email in production)", request.getEmail(), tempPassword);

        return toDto(newUser);
    }

    public UserDto updateRoles(String clientId, String userId, List<String> roles, String actorEmail) {
        ClientUser user = clientUserRepository.findById(userId)
                .filter(u -> u.getClientId().equals(clientId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        user.setRoles(roles);
        user = clientUserRepository.save(user);

        auditService.logEvent(clientId, actorEmail, "USER_ROLES_UPDATED",
                Map.of("userId", userId, "newRoles", roles));

        return toDto(user);
    }

    public void deactivate(String clientId, String userId, String actorEmail) {
        ClientUser user = clientUserRepository.findById(userId)
                .filter(u -> u.getClientId().equals(clientId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        user.setStatus(ClientUser.UserStatus.INACTIVE);
        clientUserRepository.save(user);

        auditService.logEvent(clientId, actorEmail, "USER_DEACTIVATED",
                Map.of("userId", userId, "email", user.getEmail()));
    }

    private UserDto toDto(ClientUser user) {
        return UserDto.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .roles(user.getRoles())
                .status(user.getStatus())
                .build();
    }
}
