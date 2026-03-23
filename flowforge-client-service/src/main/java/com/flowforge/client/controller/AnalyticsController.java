package com.flowforge.client.controller;

import com.flowforge.common.response.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/v1/analytics")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001"})
public class AnalyticsController {

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSummary(
            @RequestHeader("X-Client-Id") String clientId) {
        // In production, query from execution service / metrics store
        Map<String, Object> summary = new HashMap<>();
        summary.put("totalExecutions", 0L);
        summary.put("successfulExecutions", 0L);
        summary.put("failedExecutions", 0L);
        summary.put("pendingExecutions", 0L);
        summary.put("averageDurationMs", 0.0);
        summary.put("slaBreaches", 0L);
        summary.put("successRate", 100.0);

        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/execution-trend")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getExecutionTrend(
            @RequestHeader("X-Client-Id") String clientId) {
        // Return 7-day trend data
        List<Map<String, Object>> trend = new ArrayList<>();
        Instant now = Instant.now();

        for (int i = 6; i >= 0; i--) {
            Instant day = now.minus(i, ChronoUnit.DAYS);
            Map<String, Object> dataPoint = new HashMap<>();
            dataPoint.put("date", day.truncatedTo(ChronoUnit.DAYS).toString());
            dataPoint.put("executions", 0L);
            dataPoint.put("successful", 0L);
            dataPoint.put("failed", 0L);
            trend.add(dataPoint);
        }

        return ResponseEntity.ok(ApiResponse.success(trend));
    }
}
