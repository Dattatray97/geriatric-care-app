package com.geriatriccare.controller;

import com.geriatriccare.model.Appointment;
import com.geriatriccare.repository.AppointmentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.lang.NonNull;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/appointments")
@CrossOrigin(origins = "*")
public class AppointmentController {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @GetMapping
    public ResponseEntity<List<Appointment>> getAllAppointments() {
        return ResponseEntity.ok(appointmentRepository.findAllByOrderByAppointmentDateDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Appointment> getById(@PathVariable @NonNull Long id) {
        Appointment appt = appointmentRepository.findById(id).orElse(null);
        if (appt == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(appt);
    }

    @PostMapping
    public ResponseEntity<Appointment> createAppointment(@RequestBody @NonNull Appointment appointment) {
        Appointment saved = appointmentRepository.save(appointment);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Appointment> updateAppointment(@PathVariable @NonNull Long id, @RequestBody Appointment updated) {
        Appointment appt = appointmentRepository.findById(id).orElse(null);
        if (appt == null) return ResponseEntity.notFound().build();

        if (updated.getPatientName() != null) appt.setPatientName(updated.getPatientName());
        if (updated.getDoctorName() != null) appt.setDoctorName(updated.getDoctorName());
        if (updated.getType() != null) appt.setType(updated.getType());
        if (updated.getAppointmentDate() != null) appt.setAppointmentDate(updated.getAppointmentDate());
        if (updated.getLocation() != null) appt.setLocation(updated.getLocation());
        if (updated.getStatus() != null) appt.setStatus(updated.getStatus());
        if (updated.getNotes() != null) appt.setNotes(updated.getNotes());

        Appointment saved = appointmentRepository.save(appt);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteAppointment(@PathVariable @NonNull Long id) {
        appointmentRepository.deleteById(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Appointment deleted");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/patient/{patientName}")
    public ResponseEntity<List<Appointment>> getByPatient(@PathVariable String patientName) {
        return ResponseEntity.ok(appointmentRepository.findByPatientName(patientName));
    }
}
