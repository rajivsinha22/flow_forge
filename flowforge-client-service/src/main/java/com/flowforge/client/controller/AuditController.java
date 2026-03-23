package com.flowforge.client.controller;

import com.flowforge.client.repository.AuditEventRepository;
import com.flowforge.common.audit.AuditEvent;
import com.flowforge.common.response.ApiResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/audit-logs")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AuditController {

    private final AuditEventRepository auditEventRepository;

    public AuditController(AuditEventRepository auditEventRepository) {
        this.auditEventRepository = auditEventRepository;
    }

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> listAuditLogs(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String actor) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"));
        Page<AuditEvent> auditPage;

        if (actor != null && !actor.isBlank()) {
            auditPage = auditEventRepository.findByClientIdAndActor(clientId, actor, pageable);
        } else {
            auditPage = auditEventRepository.findByClientId(clientId, pageable);
        }

        Map<String, Object> result = Map.of(
                "content", auditPage.getContent(),
                "totalElements", auditPage.getTotalElements(),
                "totalPages", auditPage.getTotalPages(),
                "page", auditPage.getNumber(),
                "size", auditPage.getSize()
        );

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
