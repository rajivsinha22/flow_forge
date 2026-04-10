package com.flowforge.client.service;

import com.flowforge.client.dto.CreateNamespaceRequest;
import com.flowforge.client.repository.ClientUserRepository;
import com.flowforge.client.repository.NamespaceRepository;
import com.flowforge.common.exception.ResourceNotFoundException;
import com.flowforge.common.exception.WorkflowValidationException;
import com.flowforge.common.model.ClientUser;
import com.flowforge.common.model.Namespace;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NamespaceService {

    private static final Logger log = LoggerFactory.getLogger(NamespaceService.class);

    private final NamespaceRepository namespaceRepository;
    private final ClientUserRepository clientUserRepository;

    public NamespaceService(NamespaceRepository namespaceRepository,
                            ClientUserRepository clientUserRepository) {
        this.namespaceRepository = namespaceRepository;
        this.clientUserRepository = clientUserRepository;
    }

    public Namespace createNamespace(String clientId, String createdBy, CreateNamespaceRequest req) {
        if (namespaceRepository.existsByClientIdAndName(clientId, req.getName())) {
            throw new WorkflowValidationException("Namespace '" + req.getName() + "' already exists");
        }

        Namespace namespace = Namespace.builder()
                .clientId(clientId)
                .name(req.getName())
                .displayName(req.getDisplayName())
                .description(req.getDescription())
                .createdBy(createdBy)
                .createdAt(Instant.now())
                .build();

        namespace = namespaceRepository.save(namespace);
        log.info("Namespace '{}' created for client {}", req.getName(), clientId);
        return namespace;
    }

    public List<Namespace> listNamespaces(String clientId) {
        return namespaceRepository.findByClientId(clientId);
    }

    public Namespace getNamespace(String clientId, String name) {
        return namespaceRepository.findByClientIdAndName(clientId, name)
                .orElseThrow(() -> new ResourceNotFoundException("Namespace", name));
    }

    public void deleteNamespace(String clientId, String name) {
        if ("default".equals(name)) {
            throw new WorkflowValidationException("Cannot delete the default namespace");
        }

        Namespace namespace = namespaceRepository.findByClientIdAndName(clientId, name)
                .orElseThrow(() -> new ResourceNotFoundException("Namespace", name));

        namespaceRepository.delete(namespace);
        log.info("Namespace '{}' deleted for client {}", name, clientId);
    }

    public ClientUser assignUserToNamespaces(String clientId, String userId, List<String> namespaces) {
        ClientUser user = clientUserRepository.findById(userId)
                .filter(u -> u.getClientId().equals(clientId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        user.setAssignedNamespaces(namespaces);
        user = clientUserRepository.save(user);
        log.info("User {} assigned to namespaces {} in client {}", userId, namespaces, clientId);
        return user;
    }

    public List<String> getUserNamespaces(String clientId, String userId) {
        ClientUser user = clientUserRepository.findById(userId)
                .filter(u -> u.getClientId().equals(clientId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        return user.getAssignedNamespaces();
    }

    public List<Namespace> getAccessibleNamespaces(String clientId, String userId) {
        ClientUser user = clientUserRepository.findById(userId)
                .filter(u -> u.getClientId().equals(clientId))
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        List<Namespace> allNamespaces = namespaceRepository.findByClientId(clientId);

        if (user.getAssignedNamespaces() == null || user.getAssignedNamespaces().isEmpty()) {
            // null or empty means access to all namespaces
            return allNamespaces;
        }

        return allNamespaces.stream()
                .filter(ns -> user.getAssignedNamespaces().contains(ns.getName()))
                .collect(Collectors.toList());
    }
}
