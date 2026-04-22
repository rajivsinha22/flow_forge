package com.flowforge.execution.controller;

import com.flowforge.common.response.ApiResponse;
import com.flowforge.execution.dto.ChatRequest;
import com.flowforge.execution.dto.ChatResponse;
import com.flowforge.execution.service.ExecutionChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/ai/chat")
@CrossOrigin(origins = "*")
public class AiChatController {

    private static final Logger log = LoggerFactory.getLogger(AiChatController.class);

    private final ExecutionChatService chatService;

    public AiChatController(ExecutionChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping("")
    public ResponseEntity<ApiResponse<ChatResponse>> handleMessage(@RequestBody ChatRequest request) {
        log.debug("AI chat request received (history size={})",
                request.getHistory() != null ? request.getHistory().size() : 0);
        ChatResponse response = chatService.handleMessage(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
}
