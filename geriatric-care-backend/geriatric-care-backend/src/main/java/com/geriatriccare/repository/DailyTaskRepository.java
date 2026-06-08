package com.geriatriccare.repository;

import com.geriatriccare.model.DailyTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DailyTaskRepository extends JpaRepository<DailyTask, Long> {
    List<DailyTask> findAllByOrderByCreatedAtDesc();
    List<DailyTask> findByPatientNameOrderByCreatedAtDesc(String patientName);
}
