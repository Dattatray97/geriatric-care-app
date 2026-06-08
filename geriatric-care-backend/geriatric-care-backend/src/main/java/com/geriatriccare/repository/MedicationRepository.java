package com.geriatriccare.repository;

import com.geriatriccare.model.Medication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MedicationRepository extends JpaRepository<Medication, Long> {
    List<Medication> findAllByOrderByCreatedAtDesc();
    List<Medication> findByStatus(String status);
}
