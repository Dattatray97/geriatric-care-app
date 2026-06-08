package com.geriatriccare.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Controller
public class WebSocketController {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketController.class);
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/heartbeat")
    public void handleHeartbeat(@Payload Map<String, Object> data, @Header("userId") String userId) {
        logger.info("Received heartbeat from user: {}, data: {}", userId, data);
        
        // Send acknowledgment
        Map<String, Object> response = new HashMap<>();
        response.put("type", "heartbeat_ack");
        response.put("userId", userId);
        response.put("timestamp", LocalDateTime.now());
        response.put("status", "received");
        
        messagingTemplate.convertAndSend("/topic/user/" + userId, response);
    }

    @MessageMapping("/location")
    public void handleLocationUpdate(@Payload Map<String, Object> locationData, @Header("userId") String userId) {
        logger.info("Received location update from user: {}, location: {}", userId, locationData);
        
        // Process location for emergency services
        Map<String, Object> response = new HashMap<>();
        response.put("type", "location_ack");
        response.put("userId", userId);
        response.put("timestamp", LocalDateTime.now());
        response.put("status", "location_saved");
        response.put("emergencyReady", true);
        
        messagingTemplate.convertAndSend("/topic/user/" + userId, response);
    }

    // Simulate real-time health data updates
    public void sendHealthUpdate(String userId) {
        Map<String, Object> healthData = new HashMap<>();
        healthData.put("type", "health_update");
        healthData.put("timestamp", LocalDateTime.now());
        healthData.put("heartRate", 65 + new Random().nextInt(25));
        healthData.put("bloodPressure", (110 + new Random().nextInt(20)) + "/" + (70 + new Random().nextInt(10)));
        healthData.put("steps", 2000 + new Random().nextInt(5000));
        healthData.put("batteryLevel", 85 + new Random().nextInt(15));
        
        messagingTemplate.convertAndSend("/topic/health/" + userId, healthData);
    }

    // Send emergency alert to all connected clients
    public void sendEmergencyAlert(String userId, String alertType, String message) {
        Map<String, Object> alert = new HashMap<>();
        alert.put("type", "emergency_alert");
        alert.put("userId", userId);
        alert.put("alertType", alertType);
        alert.put("message", message);
        alert.put("timestamp", LocalDateTime.now());
        alert.put("priority", "high");
        
        // Send to user
        messagingTemplate.convertAndSend("/topic/user/" + userId, alert);
        
        // Send to emergency contacts
        messagingTemplate.convertAndSend("/topic/emergency", alert);
    }

    // Send medication reminder
    public void sendMedicationReminder(String userId, String medicationName) {
        Map<String, Object> reminder = new HashMap<>();
        reminder.put("type", "medication_reminder");
        reminder.put("userId", userId);
        reminder.put("medicationName", medicationName);
        reminder.put("message", "Time to take " + medicationName);
        reminder.put("timestamp", LocalDateTime.now());
        reminder.put("urgency", "normal");
        
        messagingTemplate.convertAndSend("/topic/user/" + userId, reminder);
    }

    // Send notification to all connected users
    public void sendBroadcastNotification(String title, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "broadcast");
        notification.put("title", title);
        notification.put("message", message);
        notification.put("timestamp", LocalDateTime.now());
        
        messagingTemplate.convertAndSend("/topic/notifications", notification);
    }
}