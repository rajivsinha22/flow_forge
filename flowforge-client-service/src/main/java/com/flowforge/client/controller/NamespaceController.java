package com.flowforge.client.controller;

import com.flowforge.client.dto.CreateNamespaceRequest;
import com.flowforge.client.service.NamespaceService;
import com.flowforge.common.model.Namespace;
import com.flowforge.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class NamespaceController {

    private final NamespaceService namespaceService;

    public NamespaceController(NamespaceService namespaceService) {
        this.namespaceService = namespaceService;
    }

    // ── Namespace CRUD ───────────────────────────────────────────────────────────

    @GetMapping("/api/v1/namespaces")
    public ResponseEntity<ApiResponse<List<Namespace>>> listNamespaces(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader("X-User-Id") String userId) {
        List<Namespace> namespaces = namespaceService.getAccessibleNamespaces(clientId, userId);
        return ResponseEntity.ok(ApiResponse.success(namespaces));
    }

    @PostMapping("/api/v1/namespaces")
    public ResponseEntity<ApiResponse<Namespace>> createNamespace(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader("X-User-Id") String userId,
            @Valid @RequestBody CreateNamespaceRequest request) {
        Namespace namespace = namespaceService.createNamespace(clientId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(namespace, "Namespace created successfully"));
    }

    @GetMapping("/api/v1/namespaces/{name}")
    public ResponseEntity<ApiResponse<Namespace>> getNamespace(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String name) {
        Namespace namespace = namespaceService.getNamespace(clientId, name);
        return ResponseEntity.ok(ApiResponse.success(namespace));
    }

    @DeleteMapping("/api/v1/namespaces/{name}")
    public ResponseEntity<ApiResponse<Object>> deleteNamespace(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String name) {
        namespaceService.deleteNamespace(clientId, name);
        return ResponseEntity.ok(ApiResponse.success(null, "Namespace deleted successfully"));
    }

    // ── User namespace assignment ────────────────────────────────────────────────

    @PutMapping("/api/v1/users/{userId}/namespaces")
    public ResponseEntity<ApiResponse<Object>> assignNamespaces(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String userId,
            @RequestBody List<String> namespaces) {
        namespaceService.assignUserToNamespaces(clientId, userId, namespaces);
        return ResponseEntity.ok(ApiResponse.success(null, "Namespaces assigned successfully"));
    }

    @GetMapping("/api/v1/users/{userId}/namespaces")
    public ResponseEntity<ApiResponse<List<String>>> getUserNamespaces(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String userId) {
        List<String> namespaces = namespaceService.getUserNamespaces(clientId, userId);
        return ResponseEntity.ok(ApiResponse.success(namespaces));
    }
}
