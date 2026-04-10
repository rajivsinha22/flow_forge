package com.flowforge.client.service;

import com.flowforge.client.dto.InvitationDto;
import com.flowforge.client.dto.InviteUserRequest;
import com.flowforge.client.dto.LoginResponse;
import com.flowforge.client.dto.UserDto;
import com.flowforge.client.repository.ClientRepository;
import com.flowforge.client.repository.ClientUserRepository;
import com.flowforge.client.repository.InvitationTokenRepository;
import com.flowforge.common.audit.AuditService;
import com.flowforge.common.exception.PlanLimitExceededException;
import com.flowforge.common.exception.ResourceNotFoundException;
import com.flowforge.common.exception.UnauthorizedException;
import com.flowforge.common.model.Client;
import com.flowforge.common.model.ClientUser;
import com.flowforge.common.model.InvitationToken;
import com.flowforge.common.model.PlanLimits;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
    private final InvitationTokenRepository invitationTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final EmailService emailService;
    private final AuthService authService;

    public UserService(ClientUserRepository clientUserRepository,
                       ClientRepository clientRepository,
                       InvitationTokenRepository invitationTokenRepository,
                       PasswordEncoder passwordEncoder,
                       AuditService auditService,
                       EmailService emailService,
                       AuthService authService) {
        this.clientUserRepository = clientUserRepository;
        this.clientRepository = clientRepository;
        this.invitationTokenRepository = invitationTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.emailService = emailService;
        this.authService = authService;
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

        // Create user with INACTIVE status and no password (set on accept)
        ClientUser newUser = ClientUser.builder()
                .clientId(clientId)
                .name(request.getName())
                .email(request.getEmail())
                .passwordHash(null)
                .roles(Collections.singletonList(request.getRole()))
                .status(ClientUser.UserStatus.INACTIVE)
                .createdAt(Instant.now())
                .build();

        newUser = clientUserRepository.save(newUser);

        // Generate invitation token
        int expiryHours = emailService.getInvitationExpiryHours();
        String tokenValue = UUID.randomUUID().toString();
        InvitationToken invitationToken = InvitationToken.builder()
                .token(tokenValue)
                .clientId(clientId)
                .email(request.getEmail())
                .name(request.getName())
                .roles(Collections.singletonList(request.getRole()))
                .status(InvitationToken.InviteStatus.PENDING)
                .expiresAt(Instant.now().plus(expiryHours, ChronoUnit.HOURS))
                .createdAt(Instant.now())
                .build();
        invitationTokenRepository.save(invitationToken);

        // Send invitation email
        emailService.sendInvitationEmail(request.getEmail(), client.getName(), actorEmail, tokenValue);

        auditService.logEvent(clientId, actorEmail, "USER_INVITED",
                Map.of("invitedEmail", request.getEmail(), "role", request.getRole()));

        log.info("User invited: {} with invitation token sent via email", request.getEmail());

        return toDto(newUser);
    }

    public LoginResponse acceptInvitation(String token, String password) {
        InvitationToken invitation = invitationTokenRepository.findByTokenAndStatus(token, InvitationToken.InviteStatus.PENDING)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation", token));

        if (invitation.getExpiresAt().isBefore(Instant.now())) {
            invitation.setStatus(InvitationToken.InviteStatus.EXPIRED);
            invitationTokenRepository.save(invitation);
            throw new UnauthorizedException("Invitation has expired");
        }

        // Find and activate the user
        ClientUser user = clientUserRepository.findByEmailAndClientId(invitation.getEmail(), invitation.getClientId())
                .orElseThrow(() -> new ResourceNotFoundException("User", invitation.getEmail()));

        user.setPasswordHash(passwordEncoder.encode(password));
        user.setStatus(ClientUser.UserStatus.ACTIVE);
        user = clientUserRepository.save(user);

        // Mark invitation as accepted
        invitation.setStatus(InvitationToken.InviteStatus.ACCEPTED);
        invitation.setAcceptedAt(Instant.now());
        invitationTokenRepository.save(invitation);

        // Get org name for welcome email
        Client client = clientRepository.findById(invitation.getClientId()).orElse(null);
        String orgName = client != null ? client.getName() : "FlowForge";

        // Send welcome email
        emailService.sendWelcomeEmail(user.getEmail(), orgName, user.getName());

        auditService.logEvent(invitation.getClientId(), user.getEmail(), "INVITATION_ACCEPTED",
                Map.of("userId", user.getId()));

        log.info("Invitation accepted by {}", user.getEmail());

        // Generate JWT and return login response
        String jwt = authService.generateJwt(user);
        UserDto userDto = toDto(user);

        return LoginResponse.builder()
                .accessToken(jwt)
                .tokenType("Bearer")
                .expiresIn(86400)
                .user(userDto)
                .build();
    }

    public InvitationDto validateInvitation(String token) {
        InvitationToken invitation = invitationTokenRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation", token));

        if (invitation.getStatus() != InvitationToken.InviteStatus.PENDING) {
            throw new UnauthorizedException("Invitation is no longer valid (status: " + invitation.getStatus() + ")");
        }

        if (invitation.getExpiresAt().isBefore(Instant.now())) {
            invitation.setStatus(InvitationToken.InviteStatus.EXPIRED);
            invitationTokenRepository.save(invitation);
            throw new UnauthorizedException("Invitation has expired");
        }

        Client client = clientRepository.findById(invitation.getClientId()).orElse(null);
        String orgName = client != null ? client.getName() : "Unknown";

        return InvitationDto.builder()
                .token(invitation.getToken())
                .email(invitation.getEmail())
                .name(invitation.getName())
                .orgName(orgName)
                .status(invitation.getStatus())
                .expiresAt(invitation.getExpiresAt())
                .createdAt(invitation.getCreatedAt())
                .build();
    }

    public void resendInvitation(String clientId, String invitationId) {
        InvitationToken invitation = invitationTokenRepository.findById(invitationId)
                .filter(inv -> inv.getClientId().equals(clientId))
                .orElseThrow(() -> new ResourceNotFoundException("Invitation", invitationId));

        // Generate a new token and reset expiry
        int expiryHours = emailService.getInvitationExpiryHours();
        String newTokenValue = UUID.randomUUID().toString();
        invitation.setToken(newTokenValue);
        invitation.setStatus(InvitationToken.InviteStatus.PENDING);
        invitation.setExpiresAt(Instant.now().plus(expiryHours, ChronoUnit.HOURS));
        invitationTokenRepository.save(invitation);

        // Resend email
        Client client = clientRepository.findById(clientId).orElse(null);
        String orgName = client != null ? client.getName() : "FlowForge";
        emailService.sendInvitationEmail(invitation.getEmail(), orgName, "Team Admin", newTokenValue);

        log.info("Invitation resent to {} for client {}", invitation.getEmail(), clientId);
    }

    public void revokeInvitation(String clientId, String invitationId) {
        InvitationToken invitation = invitationTokenRepository.findById(invitationId)
                .filter(inv -> inv.getClientId().equals(clientId))
                .orElseThrow(() -> new ResourceNotFoundException("Invitation", invitationId));

        invitation.setStatus(InvitationToken.InviteStatus.EXPIRED);
        invitationTokenRepository.save(invitation);

        log.info("Invitation revoked for {} in client {}", invitation.getEmail(), clientId);
    }

    public List<InvitationDto> listPendingInvitations(String clientId) {
        Client client = clientRepository.findById(clientId).orElse(null);
        String orgName = client != null ? client.getName() : "Unknown";

        return invitationTokenRepository.findByClientIdAndStatus(clientId, InvitationToken.InviteStatus.PENDING)
                .stream()
                .map(inv -> InvitationDto.builder()
                        .token(inv.getToken())
                        .email(inv.getEmail())
                        .name(inv.getName())
                        .orgName(orgName)
                        .status(inv.getStatus())
                        .expiresAt(inv.getExpiresAt())
                        .createdAt(inv.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
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
