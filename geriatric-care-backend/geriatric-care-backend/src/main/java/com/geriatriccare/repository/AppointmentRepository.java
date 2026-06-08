package com.geriatriccare.repository;

import com.geriatriccare.model.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findAllByOrderByAppointmentDateDesc();
    List<Appointment> findByPatientName(String patientName);
    List<Appointment> findByStatus(String status);
}
