package com.flowforge.client.controller;

import com.flowforge.client.dto.CreateRoleRequest;
import com.flowforge.client.repository.RoleRepository;
import com.flowforge.common.exception.ResourceNotFoundException;
import com.flowforge.common.model.Role;
import com.flowforge.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/roles")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class RoleController {

    private final RoleRepository roleRepository;

    public RoleController(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Role>>> listRoles(
            @RequestHeader("X-Client-Id") String clientId) {
        List<Role> roles = roleRepository.findByClientId(clientId);
        return ResponseEntity.ok(ApiResponse.success(roles));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<Role>> createRole(
            @RequestHeader("X-Client-Id") String clientId,
            @Valid @RequestBody CreateRoleRequest request) {
        Role role = Role.builder()
                .clientId(clientId)
                .name(request.getName())
                .permissions(request.getPermissions())
                .build();
        role = roleRepository.save(role);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(role, "Role created successfully"));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Role>> updateRole(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id,
            @RequestBody Map<String, List<String>> body) {
        Role role = roleRepository.findById(id)
                .filter(r -> r.getClientId().equals(clientId))
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));

        List<String> permissions = body.get("permissions");
        if (permissions != null) {
            role.setPermissions(permissions);
        }

        role = roleRepository.save(role);
        return ResponseEntity.ok(ApiResponse.success(role, "Role updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deleteRole(
            @RequestHeader("X-Client-Id") String clientId,
            @PathVariable String id) {
        Role role = roleRepository.findById(id)
                .filter(r -> r.getClientId().equals(clientId))
                .orElseThrow(() -> new ResourceNotFoundException("Role", id));

        roleRepository.delete(role);
        return ResponseEntity.ok(ApiResponse.success(null, "Role deleted successfully"));
    }
}
