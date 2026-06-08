package com.geriatriccare.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "medications")
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String description;
    private String dosage;
    private String frequency;
    private String timeSlots;
    private Boolean withFood;
    private String status; // taken, pending, scheduled
    private String prescribedBy;
    private Integer refillsRemaining;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Medication() {}

    public Medication(String name, String description, String dosage, String frequency,
                      String timeSlots, Boolean withFood, String status, String prescribedBy, Integer refillsRemaining) {
        this.name = name;
        this.description = description;
        this.dosage = dosage;
        this.frequency = frequency;
        this.timeSlots = timeSlots;
        this.withFood = withFood;
        this.status = status;
        this.prescribedBy = prescribedBy;
        this.refillsRemaining = refillsRemaining;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getDosage() { return dosage; }
    public void setDosage(String dosage) { this.dosage = dosage; }

    public String getFrequency() { return frequency; }
    public void setFrequency(String frequency) { this.frequency = frequency; }

    public String getTimeSlots() { return timeSlots; }
    public void setTimeSlots(String timeSlots) { this.timeSlots = timeSlots; }

    public Boolean getWithFood() { return withFood; }
    public void setWithFood(Boolean withFood) { this.withFood = withFood; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getPrescribedBy() { return prescribedBy; }
    public void setPrescribedBy(String prescribedBy) { this.prescribedBy = prescribedBy; }

    public Integer getRefillsRemaining() { return refillsRemaining; }
    public void setRefillsRemaining(Integer refillsRemaining) { this.refillsRemaining = refillsRemaining; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
