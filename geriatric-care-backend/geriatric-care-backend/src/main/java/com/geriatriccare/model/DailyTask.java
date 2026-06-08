package com.geriatriccare.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "daily_tasks")
public class DailyTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String text;

    @Column(name = "patient_name")
    private String patientName;

    private Boolean completed = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public DailyTask() {}

    public DailyTask(String text) {
        this.text = text;
        this.completed = false;
        this.createdAt = LocalDateTime.now();
    }

    public DailyTask(String text, String patientName) {
        this.text = text;
        this.patientName = patientName;
        this.completed = false;
        this.createdAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (completed == null) completed = false;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getText() { return text; }
    public void setText(String text) { this.text = text; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public Boolean getCompleted() { return completed; }
    public void setCompleted(Boolean completed) { this.completed = completed; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
