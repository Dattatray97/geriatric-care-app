package com.geriatriccare.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "emergency_alerts")
public class EmergencyAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "alert_id", unique = true)
    private String alertId;

    private String type; // manual_sos, fall_detected, medication_missed

    private String patientName;

    private String location;

    @Column(length = 1000)
    private String message;

    private String status; // activated, resolved, cancelled

    private String responseTime;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public EmergencyAlert() {}

    public EmergencyAlert(String alertId, String type, String patientName, String location, String message, String status) {
        this.alertId = alertId;
        this.type = type;
        this.patientName = patientName;
        this.location = location;
        this.message = message;
        this.status = status;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAlertId() { return alertId; }
    public void setAlertId(String alertId) { this.alertId = alertId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getResponseTime() { return responseTime; }
    public void setResponseTime(String responseTime) { this.responseTime = responseTime; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
