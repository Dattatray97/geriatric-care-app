package com.geriatriccare.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "health_metrics")
public class HealthMetric {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String patientName;
    private Integer heartRate;
    private Integer systolicBP;
    private Integer diastolicBP;
    private Integer steps;
    private Integer bloodSugar;
    private String status;

    @Column(name = "recorded_at")
    private LocalDateTime recordedAt;

    public HealthMetric() {}

    public HealthMetric(String patientName, Integer heartRate, Integer systolicBP, Integer diastolicBP,
                        Integer steps, Integer bloodSugar, String status) {
        this.patientName = patientName;
        this.heartRate = heartRate;
        this.systolicBP = systolicBP;
        this.diastolicBP = diastolicBP;
        this.steps = steps;
        this.bloodSugar = bloodSugar;
        this.status = status;
        this.recordedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onCreate() {
        recordedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public Integer getHeartRate() { return heartRate; }
    public void setHeartRate(Integer heartRate) { this.heartRate = heartRate; }

    public Integer getSystolicBP() { return systolicBP; }
    public void setSystolicBP(Integer systolicBP) { this.systolicBP = systolicBP; }

    public Integer getDiastolicBP() { return diastolicBP; }
    public void setDiastolicBP(Integer diastolicBP) { this.diastolicBP = diastolicBP; }

    public Integer getSteps() { return steps; }
    public void setSteps(Integer steps) { this.steps = steps; }

    public Integer getBloodSugar() { return bloodSugar; }
    public void setBloodSugar(Integer bloodSugar) { this.bloodSugar = bloodSugar; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getRecordedAt() { return recordedAt; }
    public void setRecordedAt(LocalDateTime recordedAt) { this.recordedAt = recordedAt; }
}
