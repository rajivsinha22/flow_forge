package com.flowforge.client.service;

import com.flowforge.client.repository.ClientUserRepository;
import com.flowforge.client.repository.RoleRepository;
import com.flowforge.common.exception.UnauthorizedException;
import com.flowforge.common.model.ClientUser;
import com.flowforge.common.model.Role;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class RbacService {

    private static final Logger log = LoggerFactory.getLogger(RbacService.class);

    private final ClientUserRepository clientUserRepository;
    private final RoleRepository roleRepository;

    public RbacService(ClientUserRepository clientUserRepository,
                       RoleRepository roleRepository) {
        this.clientUserRepository = clientUserRepository;
        this.roleRepository = roleRepository;
    }

    public boolean checkPermission(String userId, String permission) {
        ClientUser user = clientUserRepository.findById(userId).orElse(null);
        if (user == null) {
            return false;
        }

        List<String> allPermissions = getPermissionsForUser(user);
        return allPermissions.contains(permission) || allPermissions.contains("*");
    }

    public void requirePermission(String userId, String permission) {
        if (!checkPermission(userId, permission)) {
            throw new UnauthorizedException("Insufficient permissions: " + permission);
        }
    }

    public List<String> getPermissionsForUser(ClientUser user) {
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            return Collections.emptyList();
        }

        return user.getRoles().stream()
                .flatMap(roleName -> {
                    return roleRepository.findByClientIdAndName(user.getClientId(), roleName)
                            .map(Role::getPermissions)
                            .orElse(Collections.emptyList())
                            .stream();
                })
                .distinct()
                .collect(Collectors.toList());
    }

    public List<String> getPermissions(String roleName) {
        // This is a simplified version; in production, filter by clientId too
        return Collections.emptyList();
    }

    public List<String> getPermissionsForRole(String clientId, String roleName) {
        return roleRepository.findByClientIdAndName(clientId, roleName)
                .map(Role::getPermissions)
                .orElse(Collections.emptyList());
    }
}
