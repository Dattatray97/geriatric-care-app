package com.geriatriccare.controller;

import com.geriatriccare.model.EmergencyAlert;
import com.geriatriccare.model.Patient;
import com.geriatriccare.repository.EmergencyAlertRepository;
import com.geriatriccare.repository.PatientRepository;
import com.geriatriccare.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/emergency")
@CrossOrigin(origins = "*")
public class EmergencyController {

    @Autowired
    private EmergencyAlertRepository emergencyAlertRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostMapping("/sos")
    public ResponseEntity<Map<String, Object>> activateSOS(@RequestBody Map<String, Object> emergencyRequest) {
        String alertId = "SOS-" + System.currentTimeMillis();
        String patientName = emergencyRequest.get("patientName") != null ? emergencyRequest.get("patientName").toString() : "Unknown Patient";

        // Save to PostgreSQL
        EmergencyAlert alert = new EmergencyAlert(
            alertId, "manual_sos", patientName,
            emergencyRequest.get("location") != null ? emergencyRequest.get("location").toString() : "Unknown",
            "Emergency assistance requested by user", "activated"
        );
        emergencyAlertRepository.save(alert);

        Map<String, Object> response = new HashMap<>();
        response.put("alertId", alertId);
        response.put("status", "activated");
        response.put("timestamp", LocalDateTime.now());
        response.put("message", "Emergency services contacted");
        response.put("estimatedResponse", "5-8 minutes");
        response.put("savedToDb", true);
        response.put("patientName", patientName);

        // Look up the actual patient from the database to get real contact info
        List<Patient> matchingPatients = patientRepository.findByNameContainingIgnoreCase(patientName);
        Patient patient = matchingPatients.isEmpty() ? null : matchingPatients.get(0);

        if (patient != null) {
            // Build real contact list from patient profile
            List<Map<String, String>> notifiedContacts = new ArrayList<>();

            // Send emergency email notification to patient emergency contact
            Map<String, Object> emailResult = notificationService.sendEmergencyEmail(patient, alertId);
            response.put("emailNotification", emailResult);

            if (patient.getEmergencyContactEmail() != null && !patient.getEmergencyContactEmail().isBlank()) {
                Map<String, String> emailContact = new HashMap<>();
                emailContact.put("name", patient.getEmergencyContactName() != null ? patient.getEmergencyContactName() : "Emergency Contact");
                emailContact.put("email", patient.getEmergencyContactEmail());
                emailContact.put("type", "Email");
                emailContact.put("status", Boolean.TRUE.equals(emailResult.get("emailSent")) ? "Sent" : "Failed");
                notifiedContacts.add(emailContact);
            }

            // Send emergency SMS notification to patient emergency contact phone
            Map<String, Object> smsResult = notificationService.sendEmergencySMS(patient, alertId);
            response.put("smsNotification", smsResult);

            if (patient.getEmergencyContactPhone() != null && !patient.getEmergencyContactPhone().isBlank()) {
                Map<String, String> smsContact = new HashMap<>();
                smsContact.put("name", patient.getEmergencyContactName() != null ? patient.getEmergencyContactName() : "Emergency Contact");
                smsContact.put("phone", patient.getEmergencyContactPhone());
                smsContact.put("type", "SMS");
                smsContact.put("status", Boolean.TRUE.equals(smsResult.get("smsSent")) ? "Sent" : "Failed");
                notifiedContacts.add(smsContact);
            }

            response.put("notifiedContacts", notifiedContacts);
            response.put("patientRoom", patient.getRoom());
            response.put("patientStatus", patient.getStatus());
            response.put("emergencyContactName", patient.getEmergencyContactName());
            response.put("emergencyContactEmail", patient.getEmergencyContactEmail());
            response.put("emergencyContactPhone", patient.getEmergencyContactPhone());
        } else {
            response.put("notifiedContacts", Collections.emptyList());
            response.put("emailNotification", Map.of("emailSent", false, "emailError", "Patient not found in database"));
            response.put("smsNotification", Map.of("smsSent", false, "smsError", "Patient not found in database"));
        }

        // Broadcast via WebSocket (so Family dashboard gets the pop-up)
        Map<String, Object> wsMessage = new HashMap<>();
        wsMessage.put("type", "emergency_alert");
        wsMessage.put("alert", response);
        wsMessage.put("message", "SOS Alert activated for " + patientName + "!");
        messagingTemplate.convertAndSend("/topic/emergency", wsMessage);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/contacts")
    public ResponseEntity<List<Map<String, Object>>> getEmergencyContacts() {
        List<Map<String, Object>> contacts = Arrays.asList(
            Map.of("id", 1, "name", "Sarah Johnson", "relationship", "Daughter",
                   "phone", "+1234567890", "isPrimary", true),
            Map.of("id", 2, "name", "Mike Smith", "relationship", "Son",
                   "phone", "+1234567891", "isPrimary", false),
            Map.of("id", 3, "name", "Dr. Johnson", "relationship", "Primary Care Physician",
                   "phone", "+1234567892", "isPrimary", false)
        );
        return ResponseEntity.ok(contacts);
    }

    @GetMapping("/alerts")
    public ResponseEntity<List<EmergencyAlert>> getEmergencyAlerts() {
        return ResponseEntity.ok(emergencyAlertRepository.findAllByOrderByCreatedAtDesc());
    }

    @PostMapping("/fall-detect")
    public ResponseEntity<Map<String, Object>> reportFallDetection(@RequestBody Map<String, Object> fallData) {
        String incidentId = "FALL-" + System.currentTimeMillis();
        String patientName = fallData.get("patientName") != null ? fallData.get("patientName").toString() : "Unknown";

        // Save to PostgreSQL
        EmergencyAlert alert = new EmergencyAlert(
            incidentId, "fall_detected", patientName,
            fallData.get("location") != null ? fallData.get("location").toString() : "Unknown",
            "Fall detected", "reported"
        );
        emergencyAlertRepository.save(alert);

        Map<String, Object> response = new HashMap<>();
        response.put("incidentId", incidentId);
        response.put("status", "reported");
        response.put("timestamp", LocalDateTime.now());
        response.put("savedToDb", true);

        // Also send email and SMS for fall detection
        List<Patient> matchingPatients = patientRepository.findByNameContainingIgnoreCase(patientName);
        if (!matchingPatients.isEmpty()) {
            Patient matchedPatient = matchingPatients.get(0);
            Map<String, Object> emailResult = notificationService.sendEmergencyEmail(matchedPatient, incidentId);
            response.put("emailNotification", emailResult);
            Map<String, Object> smsResult = notificationService.sendEmergencySMS(matchedPatient, incidentId);
            response.put("smsNotification", smsResult);
        }

        // Broadcast via WebSocket
        Map<String, Object> wsMessage = new HashMap<>();
        wsMessage.put("type", "emergency_alert");
        wsMessage.put("alert", response);
        messagingTemplate.convertAndSend("/topic/emergency", wsMessage);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/nearby-hospitals")
    public ResponseEntity<List<Map<String, Object>>> getNearbyHospitals() {
        List<Map<String, Object>> hospitals = Arrays.asList(
            Map.of("id", 1, "name", "Downtown Medical Center", "address", "789 Healthcare Blvd",
                   "distance", "1.2 miles", "waitTime", "15-20 minutes"),
            Map.of("id", 2, "name", "ElderCare Hospital", "address", "456 Senior Care Ave",
                   "distance", "2.1 miles", "waitTime", "10-15 minutes")
        );
        return ResponseEntity.ok(hospitals);
    }

    @PostMapping("/test-alert")
    public ResponseEntity<Map<String, Object>> sendTestAlert() {
        Map<String, Object> response = new HashMap<>();
        response.put("testId", "TEST-" + System.currentTimeMillis());
        response.put("status", "test_sent");
        response.put("message", "Test emergency alert sent successfully");
        response.put("timestamp", LocalDateTime.now());
        return ResponseEntity.ok(response);
    }
}