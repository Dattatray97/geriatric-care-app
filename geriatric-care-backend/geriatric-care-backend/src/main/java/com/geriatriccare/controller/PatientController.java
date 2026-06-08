package com.geriatriccare.controller;

import com.geriatriccare.model.Patient;
import com.geriatriccare.repository.PatientRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.lang.NonNull;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/patients")
@CrossOrigin(origins = "*")
public class PatientController {

    @Autowired
    private PatientRepository patientRepository;

    @GetMapping
    public ResponseEntity<List<Patient>> getAllPatients() {
        return ResponseEntity.ok(patientRepository.findAllByOrderByCreatedAtDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Patient> getPatientById(@PathVariable @NonNull Long id) {
        Patient patient = patientRepository.findById(id).orElse(null);
        if (patient == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(patient);
    }

    // Family login endpoint: look up patient by reference code
    @GetMapping("/ref/{code}")
    public ResponseEntity<Patient> getByReferenceCode(@PathVariable String code) {
        return patientRepository.findByReferenceCode(code)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Patient> createPatient(@RequestBody @NonNull Patient patient) {
        Patient saved = patientRepository.save(patient);
        // Auto-generate reference code if not set
        if (saved.getReferenceCode() == null) {
            saved.setReferenceCode("EG-1" + String.format("%04d", saved.getId()));
            saved = patientRepository.save(saved);
        }
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Patient> updatePatient(@PathVariable @NonNull Long id, @RequestBody Patient updated) {
        Patient patient = patientRepository.findById(id).orElse(null);
        if (patient == null) {
            return ResponseEntity.notFound().build();
        }
        if (updated.getName() != null) patient.setName(updated.getName());
        if (updated.getAge() != null) patient.setAge(updated.getAge());
        if (updated.getRoom() != null) patient.setRoom(updated.getRoom());
        if (updated.getStatus() != null) patient.setStatus(updated.getStatus());
        if (updated.getConditions() != null) patient.setConditions(updated.getConditions());
        if (updated.getBloodType() != null) patient.setBloodType(updated.getBloodType());
        if (updated.getAllergies() != null) patient.setAllergies(updated.getAllergies());
        if (updated.getEmergencyContactName() != null) patient.setEmergencyContactName(updated.getEmergencyContactName());
        if (updated.getEmergencyContactPhone() != null) patient.setEmergencyContactPhone(updated.getEmergencyContactPhone());
        if (updated.getEmergencyContactEmail() != null) patient.setEmergencyContactEmail(updated.getEmergencyContactEmail());

        Patient saved = patientRepository.save(patient);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deletePatient(@PathVariable @NonNull Long id) {
        patientRepository.deleteById(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Patient deleted successfully");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/search")
    public ResponseEntity<List<Patient>> searchPatients(@RequestParam String q) {
        return ResponseEntity.ok(patientRepository.findByNameContainingIgnoreCase(q));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Patient>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(patientRepository.findByStatus(status));
    }

    // Family login validation: match name against emergency contact name and optionally patient number
    @PostMapping("/validate-family")
    public ResponseEntity<Map<String, Object>> validateFamilyLogin(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String patientNumber = body.get("patientNumber");

        if (name == null || name.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Name is required");
            return ResponseEntity.status(400).body(error);
        }
        if (patientNumber == null || patientNumber.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "EG Patient Number is required");
            return ResponseEntity.status(400).body(error);
        }

        // First, look up by reference code (EG Patient Number)
        var patientOpt = patientRepository.findByReferenceCode(patientNumber.trim());
        if (patientOpt.isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "No patient found with EG Patient Number: " + patientNumber.trim() + ". Please check the number.");
            return ResponseEntity.status(401).body(error);
        }

        Patient patient = patientOpt.get();

        // Verify that the name matches the emergency contact name
        if (patient.getEmergencyContactName() == null ||
            !patient.getEmergencyContactName().trim().equalsIgnoreCase(name.trim())) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Your name does not match the emergency contact for this patient. Please check your details.");
            return ResponseEntity.status(401).body(error);
        }

        // Return success with the matched patient's details
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("patientName", patient.getName());
        response.put("referenceCode", patient.getReferenceCode());
        response.put("emergencyContactName", patient.getEmergencyContactName());
        return ResponseEntity.ok(response);
    }
}

