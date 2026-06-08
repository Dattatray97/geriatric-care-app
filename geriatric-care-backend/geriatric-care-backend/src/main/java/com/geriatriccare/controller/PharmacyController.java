package com.geriatriccare.controller;

import com.geriatriccare.model.Medication;
import com.geriatriccare.repository.MedicationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.lang.NonNull;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/v1/pharmacy")
@CrossOrigin(origins = "*")
public class PharmacyController {

    @Autowired
    private MedicationRepository medicationRepository;

    @GetMapping("/schedule")
    public ResponseEntity<Map<String, Object>> getMedicationSchedule() {
        Map<String, Object> schedule = new HashMap<>();
        List<Medication> medications = medicationRepository.findAllByOrderByCreatedAtDesc();

        schedule.put("medications", medications);
        schedule.put("lastUpdated", LocalDateTime.now());
        schedule.put("totalMedications", medications.size());
        schedule.put("pendingDoses", medications.stream()
            .filter(med -> "pending".equals(med.getStatus()))
            .count());

        return ResponseEntity.ok(schedule);
    }

    // GET all medications
    @GetMapping("/medications")
    public ResponseEntity<List<Medication>> getAllMedications() {
        return ResponseEntity.ok(medicationRepository.findAllByOrderByCreatedAtDesc());
    }

    // POST add new medication
    @PostMapping("/medications")
    public ResponseEntity<Medication> addMedication(@RequestBody @NonNull Medication medication) {
        Medication saved = medicationRepository.save(medication);
        return ResponseEntity.ok(saved);
    }

    // PUT edit medication
    @PutMapping("/medications/{id}")
    public ResponseEntity<Medication> updateMedication(@PathVariable @NonNull Long id, @RequestBody Medication updated) {
        Medication med = medicationRepository.findById(id).orElse(null);
        if (med == null) return ResponseEntity.notFound().build();

        if (updated.getName() != null) med.setName(updated.getName());
        if (updated.getDescription() != null) med.setDescription(updated.getDescription());
        if (updated.getDosage() != null) med.setDosage(updated.getDosage());
        if (updated.getFrequency() != null) med.setFrequency(updated.getFrequency());
        if (updated.getTimeSlots() != null) med.setTimeSlots(updated.getTimeSlots());
        if (updated.getWithFood() != null) med.setWithFood(updated.getWithFood());
        if (updated.getStatus() != null) med.setStatus(updated.getStatus());
        if (updated.getPrescribedBy() != null) med.setPrescribedBy(updated.getPrescribedBy());
        if (updated.getRefillsRemaining() != null) med.setRefillsRemaining(updated.getRefillsRemaining());

        Medication saved = medicationRepository.save(med);
        return ResponseEntity.ok(saved);
    }

    // DELETE medication
    @DeleteMapping("/medications/{id}")
    public ResponseEntity<Map<String, Object>> deleteMedication(@PathVariable @NonNull Long id) {
        medicationRepository.deleteById(id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Medication deleted");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/prescription/upload")
    public ResponseEntity<Map<String, Object>> uploadPrescription(@RequestBody Map<String, Object> prescriptionRequest) {
        Map<String, Object> response = new HashMap<>();

        response.put("prescriptionId", "RX-" + System.currentTimeMillis());
        response.put("status", "uploaded");
        response.put("message", "Prescription uploaded successfully");
        response.put("processingTime", "24-48 hours");
        response.put("pharmacistReview", "Dr. Williams will review within 24 hours");
        response.put("uploadTime", LocalDateTime.now());

        return ResponseEntity.ok(response);
    }

    @PostMapping("/refill")
    public ResponseEntity<Map<String, Object>> requestRefill(@RequestBody Map<String, Object> refillRequest) {
        Map<String, Object> response = new HashMap<>();

        response.put("refillId", "REF-" + System.currentTimeMillis());
        response.put("status", "requested");
        response.put("medications", refillRequest.get("medications"));
        response.put("estimatedReady", LocalDateTime.now().plusHours(2));
        response.put("pharmacyContact", "Downtown Pharmacy - (555) 123-4567");
        response.put("requestTime", LocalDateTime.now());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Map<String, Object>>> getMedicationOrders() {
        List<Map<String, Object>> orders = Arrays.asList(
            Map.of(
                "id", "RX-12345",
                "medication", "Metformin 500mg",
                "quantity", 30,
                "status", "ready",
                "orderDate", LocalDateTime.now().minusDays(1),
                "readyDate", LocalDateTime.now().minusHours(2),
                "pharmacy", "Downtown Pharmacy",
                "prescribedBy", "Dr. Johnson"
            ),
            Map.of(
                "id", "RX-12344",
                "medication", "Amlodipine 10mg",
                "quantity", 30,
                "status", "processing",
                "orderDate", LocalDateTime.now().minusDays(3),
                "estimatedReady", LocalDateTime.now().plusHours(4),
                "pharmacy", "Downtown Pharmacy",
                "prescribedBy", "Dr. Johnson"
            )
        );

        return ResponseEntity.ok(orders);
    }

    @GetMapping("/interactions")
    public ResponseEntity<Map<String, Object>> checkDrugInteractions(@RequestParam String medications) {
        Map<String, Object> interactions = new HashMap<>();

        // Simulate drug interaction check
        interactions.put("metformin", Map.of(
            "interactions", Arrays.asList(
                Map.of("drug", "Alcohol", "severity", "moderate", "description", "May increase risk of lactic acidosis"),
                Map.of("drug", "Contrast Dye", "severity", "high", "description", "May cause kidney problems")
            ),
            "recommendations", Arrays.asList("Avoid alcohol consumption", "Inform doctor before imaging procedures")
        ));

        interactions.put("amlodipine", Map.of(
            "interactions", Arrays.asList(
                Map.of("drug", "Grapefruit", "severity", "moderate", "description", "May increase blood levels of amlodipine")
            ),
            "recommendations", Arrays.asList("Avoid grapefruit and grapefruit juice")
        ));

        interactions.put("overallRisk", "low");
        interactions.put("lastChecked", LocalDateTime.now());

        return ResponseEntity.ok(interactions);
    }

    @GetMapping("/adherence")
    public ResponseEntity<Map<String, Object>> getMedicationAdherence() {
        Map<String, Object> adherence = new HashMap<>();

        // Calculate adherence percentage
        adherence.put("overallAdherence", 92);
        adherence.put("thisWeek", 95);
        adherence.put("thisMonth", 88);
        adherence.put("missedDoses", 2);
        adherence.put("totalScheduled", 25);
        adherence.put("takenOnTime", 23);
        adherence.put("streak", 5);
        adherence.put("lastMissed", LocalDateTime.now().minusDays(2));

        return ResponseEntity.ok(adherence);
    }
}