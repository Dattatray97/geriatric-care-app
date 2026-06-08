package com.geriatriccare.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients")
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reference_code", unique = true)
    private String referenceCode; // e.g. EG-10001 - used by family login

    @Column(nullable = false)
    private String name;

    private Integer age;
    private String room;
    private String status; // STABLE, CRITICAL, ATTENTION

    @Column(length = 500)
    private String conditions; // comma-separated: "Diabetes, Hypertension"

    private String bloodType;
    private String allergies;
    private String emergencyContactName;
    private String emergencyContactPhone;
    private String emergencyContactEmail;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Patient() {}

    public Patient(String name, Integer age, String room, String status, String conditions,
                   String bloodType, String allergies, String emergencyContactName, String emergencyContactPhone) {
        this.name = name;
        this.age = age;
        this.room = room;
        this.status = status;
        this.conditions = conditions;
        this.bloodType = bloodType;
        this.allergies = allergies;
        this.emergencyContactName = emergencyContactName;
        this.emergencyContactPhone = emergencyContactPhone;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Patient(String name, Integer age, String room, String status, String conditions,
                   String bloodType, String allergies, String emergencyContactName, String emergencyContactPhone, String emergencyContactEmail) {
        this(name, age, room, status, conditions, bloodType, allergies, emergencyContactName, emergencyContactPhone);
        this.emergencyContactEmail = emergencyContactEmail;
    }

    public Patient(String referenceCode, String name, Integer age, String room, String status, String conditions,
                   String bloodType, String allergies, String emergencyContactName, String emergencyContactPhone) {
        this(name, age, room, status, conditions, bloodType, allergies, emergencyContactName, emergencyContactPhone);
        this.referenceCode = referenceCode;
    }

    public Patient(String referenceCode, String name, Integer age, String room, String status, String conditions,
                   String bloodType, String allergies, String emergencyContactName, String emergencyContactPhone, String emergencyContactEmail) {
        this(name, age, room, status, conditions, bloodType, allergies, emergencyContactName, emergencyContactPhone, emergencyContactEmail);
        this.referenceCode = referenceCode;
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getReferenceCode() { return referenceCode; }
    public void setReferenceCode(String referenceCode) { this.referenceCode = referenceCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getRoom() { return room; }
    public void setRoom(String room) { this.room = room; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getConditions() { return conditions; }
    public void setConditions(String conditions) { this.conditions = conditions; }

    public String getBloodType() { return bloodType; }
    public void setBloodType(String bloodType) { this.bloodType = bloodType; }

    public String getAllergies() { return allergies; }
    public void setAllergies(String allergies) { this.allergies = allergies; }

    public String getEmergencyContactName() { return emergencyContactName; }
    public void setEmergencyContactName(String emergencyContactName) { this.emergencyContactName = emergencyContactName; }

    public String getEmergencyContactPhone() { return emergencyContactPhone; }
    public void setEmergencyContactPhone(String emergencyContactPhone) { this.emergencyContactPhone = emergencyContactPhone; }

    public String getEmergencyContactEmail() { return emergencyContactEmail; }
    public void setEmergencyContactEmail(String emergencyContactEmail) { this.emergencyContactEmail = emergencyContactEmail; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    @Override
    public String toString() {
        return "Patient{id=" + id + ", name='" + name + "', room='" + room + "', status='" + status + "'}";
    }
}
