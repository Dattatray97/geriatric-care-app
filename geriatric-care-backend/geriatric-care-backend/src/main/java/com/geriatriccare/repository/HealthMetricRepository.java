package com.geriatriccare.repository;

import com.geriatriccare.model.HealthMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface HealthMetricRepository extends JpaRepository<HealthMetric, Long> {
    List<HealthMetric> findAllByOrderByRecordedAtDesc();
    List<HealthMetric> findByPatientName(String patientName);
    HealthMetric findTopByOrderByRecordedAtDesc();
}
