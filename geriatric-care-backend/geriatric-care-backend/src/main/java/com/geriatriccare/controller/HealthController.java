package com.geriatriccare.controller;

import com.geriatriccare.model.HealthMetric;
import com.geriatriccare.repository.HealthMetricRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.lang.NonNull;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
@CrossOrigin(origins = "*")
public class HealthController {

    @Autowired
    private HealthMetricRepository healthMetricRepository;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getHealth() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now());
        response.put("version", "1.0.0");
        response.put("database", "PostgreSQL");
        response.put("message", "🏥 Elderly Care API is running with PostgreSQL");
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/metrics")
    public ResponseEntity<Map<String, Object>> getHealthMetrics() {
        // Generate and SAVE real-time health data to PostgreSQL
        int heartRate = 65 + (int)(Math.random() * 25);
        int systolic = 110 + (int)(Math.random() * 25);
        int diastolic = 70 + (int)(Math.random() * 15);
        int steps = 2000 + (int)(Math.random() * 5000);
        int bloodSugar = 90 + (int)(Math.random() * 40);

        // Save to PostgreSQL
        HealthMetric metric = new HealthMetric("John Smith", heartRate, systolic, diastolic, steps, bloodSugar, "normal");
        healthMetricRepository.save(metric);

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("heartRate", heartRate);
        metrics.put("bloodPressure", systolic + "/" + diastolic);
        metrics.put("steps", steps);
        metrics.put("bloodSugar", bloodSugar);
        metrics.put("lastUpdate", LocalDateTime.now());
        metrics.put("status", "normal");
        metrics.put("savedToDb", true);

        // Broadcast via WebSocket
        Map<String, Object> wsMessage = new HashMap<>();
        wsMessage.put("type", "health_update");
        wsMessage.put("metrics", metrics);
        messagingTemplate.convertAndSend("/topic/health-updates", wsMessage);
        
        return ResponseEntity.ok(metrics);
    }

    @GetMapping("/metrics/history")
    public ResponseEntity<List<HealthMetric>> getMetricHistory() {
        return ResponseEntity.ok(healthMetricRepository.findAllByOrderByRecordedAtDesc());
    }

    @PostMapping("/metrics")
    public ResponseEntity<HealthMetric> saveMetric(@RequestBody @NonNull HealthMetric metric) {
        HealthMetric saved = healthMetricRepository.save(metric);

        // Broadcast via WebSocket
        Map<String, Object> wsMessage = new HashMap<>();
        wsMessage.put("type", "health_update");
        wsMessage.put("metric", saved);
        messagingTemplate.convertAndSend("/topic/health-updates", wsMessage);

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/alerts")
    public ResponseEntity<Map<String, Object>> getHealthAlerts() {
        Map<String, Object> alerts = new HashMap<>();
        alerts.put("medicationReminder", true);
        alerts.put("bloodPressureCheck", false);
        alerts.put("appointmentReminder", true);
        alerts.put("emergencyContact", "Sarah Johnson (+1234567890)");
        
        return ResponseEntity.ok(alerts);
    }
}