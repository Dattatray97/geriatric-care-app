package com.geriatriccare.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/user")
@CrossOrigin(origins = "*")
public class UserController {

    @GetMapping("/profile")
    public ResponseEntity<Map<String, Object>> getUserProfile() {
        Map<String, Object> profile = new HashMap<>();
        profile.put("id", 1);
        profile.put("name", "John Smith");
        profile.put("email", "john.doe@elderly.com");
        profile.put("phone", "+1234567890");
        profile.put("dateOfBirth", "1945-03-15");
        profile.put("address", "123 Oak Street, Downtown Nursing Home");
        profile.put("emergencyContact", "Sarah Johnson (Daughter)");
        profile.put("emergencyPhone", "+1234567890");
        profile.put("medicalConditions", Arrays.asList("Diabetes Type 2", "Hypertension"));
        profile.put("lastLogin", LocalDateTime.now());
        
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateUserProfile(@RequestBody Map<String, Object> updates) {
        // In a real app, this would validate and save the updates
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Profile updated successfully");
        response.put("updatedAt", LocalDateTime.now());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/preferences")
    public ResponseEntity<Map<String, Object>> getUserPreferences() {
        Map<String, Object> preferences = new HashMap<>();
        preferences.put("language", "en");
        preferences.put("notifications", true);
        preferences.put("voiceCommands", true);
        preferences.put("largeText", true);
        preferences.put("highContrast", false);
        preferences.put("emergencyContacts", Arrays.asList(
            Map.of("name", "Sarah Johnson", "relationship", "Daughter", "phone", "+1234567890"),
            Map.of("name", "Mike Smith", "relationship", "Son", "phone", "+1234567891")
        ));
        
        return ResponseEntity.ok(preferences);
    }
}