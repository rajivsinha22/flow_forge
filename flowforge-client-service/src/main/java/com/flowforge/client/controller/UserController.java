package com.flowforge.client.controller;

import com.flowforge.client.dto.InviteUserRequest;
import com.flowforge.client.dto.UserDto;
import com.flowforge.client.service.UserService;
import com.flowforge.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDto>>> listUsers(
            @RequestHeader("X-Client-Id") String clientId) {
        List<UserDto> users = userService.listUsers(clientId);
        return ResponseEntity.ok(ApiResponse.success(users));
    }

    @PostMapping("/invite")
    public ResponseEntity<ApiResponse<UserDto>> inviteUser(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String actorId,
            @Valid @RequestBody InviteUserRequest request) {
        UserDto user = userService.invite(clientId, request, actorId);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(user, "User invited successfully"));
    }

    @PutMapping("/{id}/roles")
    public ResponseEntity<ApiResponse<UserDto>> updateUserRoles(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String actorId,
            @PathVariable String id,
            @RequestBody Map<String, List<String>> body) {
        List<String> roles = body.get("roles");
        UserDto user = userService.updateRoles(clientId, id, roles, actorId);
        return ResponseEntity.ok(ApiResponse.success(user, "User roles updated"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Object>> deactivateUser(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestHeader(value = "X-User-Id", defaultValue = "system") String actorId,
            @PathVariable String id) {
        userService.deactivate(clientId, id, actorId);
        return ResponseEntity.ok(ApiResponse.success(null, "User deactivated successfully"));
    }
}
