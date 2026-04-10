package com.flowforge.billing.controller;

import com.flowforge.billing.dto.ChangePlanRequest;
import com.flowforge.billing.dto.CreateCheckoutSessionRequest;
import com.flowforge.billing.dto.PlanUsageResponse;
import com.flowforge.billing.dto.SubscriptionStatusResponse;
import com.flowforge.billing.model.PaymentEvent;
import com.flowforge.billing.service.BillingService;
import com.flowforge.common.model.Client;
import com.flowforge.common.response.ApiResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/billing")
public class BillingController {

    private static final Logger log = LoggerFactory.getLogger(BillingController.class);

    private final BillingService billingService;

    public BillingController(BillingService billingService) {
        this.billingService = billingService;
    }

    @GetMapping("/subscription")
    public ResponseEntity<ApiResponse<SubscriptionStatusResponse>> getSubscriptionStatus(
            @RequestHeader("X-Client-Id") String clientId) {
        log.debug("GET /subscription for clientId={}", clientId);
        SubscriptionStatusResponse status = billingService.getSubscriptionStatus(clientId);
        return ResponseEntity.ok(ApiResponse.success(status));
    }

    @GetMapping("/usage")
    public ResponseEntity<ApiResponse<PlanUsageResponse>> getUsage(
            @RequestHeader("X-Client-Id") String clientId) {
        log.debug("GET /usage for clientId={}", clientId);
        PlanUsageResponse usage = billingService.getUsage(clientId);
        return ResponseEntity.ok(ApiResponse.success(usage));
    }

    @PostMapping("/checkout")
    public ResponseEntity<ApiResponse<Map<String, String>>> createCheckoutSession(
            @RequestHeader("X-Client-Id") String clientId,
            @Valid @RequestBody CreateCheckoutSessionRequest request) {
        log.info("POST /checkout for clientId={} plan={}", clientId, request.getPlan());

        Client.Plan plan;
        try {
            plan = Client.Plan.valueOf(request.getPlan().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid plan: " + request.getPlan() + ". Must be PRO or ENTERPRISE");
        }

        String sessionUrl = billingService.createCheckoutSession(
                clientId, plan, request.getSuccessUrl(), request.getCancelUrl());

        return ResponseEntity.ok(ApiResponse.success(Map.of("checkoutUrl", sessionUrl)));
    }

    @PostMapping("/change-plan")
    public ResponseEntity<ApiResponse<SubscriptionStatusResponse>> changePlan(
            @RequestHeader("X-Client-Id") String clientId,
            @Valid @RequestBody ChangePlanRequest request) {
        log.info("POST /change-plan for clientId={} newPlan={}", clientId, request.getPlan());

        Client.Plan newPlan;
        try {
            newPlan = Client.Plan.valueOf(request.getPlan().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid plan: " + request.getPlan() + ". Must be FREE, PRO, or ENTERPRISE");
        }

        SubscriptionStatusResponse result = billingService.changePlan(clientId, newPlan);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/cancel")
    public ResponseEntity<ApiResponse<SubscriptionStatusResponse>> cancelSubscription(
            @RequestHeader("X-Client-Id") String clientId) {
        log.info("POST /cancel for clientId={}", clientId);
        SubscriptionStatusResponse result = billingService.cancelSubscription(clientId);
        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @GetMapping("/payments")
    public ResponseEntity<ApiResponse<Page<PaymentEvent>>> getPaymentHistory(
            @RequestHeader("X-Client-Id") String clientId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.debug("GET /payments for clientId={} page={} size={}", clientId, page, size);
        Page<PaymentEvent> payments = billingService.getPaymentHistory(clientId, page, size);
        return ResponseEntity.ok(ApiResponse.success(payments));
    }
}
