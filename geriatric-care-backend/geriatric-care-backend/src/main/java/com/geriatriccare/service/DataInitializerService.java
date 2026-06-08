package com.geriatriccare.service;

import com.geriatriccare.model.*;
import com.geriatriccare.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class DataInitializerService implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(DataInitializerService.class);

    @Autowired
    private MedicationRepository medicationRepository;

    @Autowired
    private HealthMetricRepository healthMetricRepository;

    @Autowired
    private CareOrderRepository careOrderRepository;

    @Autowired
    private PatientRepository patientRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Override
    public void run(String... args) {

        // Seed patients
        if (patientRepository.count() == 0) {
            logger.info("Seeding sample patient data into PostgreSQL...");

            patientRepository.save(new Patient(
                "EG-10001", "John Smith", 82, "Room 101", "STABLE",
                "Diabetes Type 2, Hypertension", "O+", "Penicillin",
                "Sarah Johnson", "+1234567890", "sarah.johnson@email.com"
            ));
            patientRepository.save(new Patient(
                "EG-10002", "Dorothy Chen", 91, "Room 103", "CRITICAL",
                "Parkinson's, Arthritis", "A+", "Sulfa drugs",
                "David Chen", "+1234567893", "david.chen@email.com"
            ));
            patientRepository.save(new Patient(
                "EG-10003", "Eleanor Davis", 77, "Room 105", "ATTENTION",
                "Hypertension, Glaucoma", "B+", "None",
                "Robert Davis", "+1234567894", "robert.davis@email.com"
            ));
            patientRepository.save(new Patient(
                "EG-10004", "Harold Thompson", 82, "Room 102", "CRITICAL",
                "Heart Failure, COPD", "AB+", "Aspirin",
                "Janet Thompson", "+1234567895", "janet.thompson@email.com"
            ));
            patientRepository.save(new Patient(
                "EG-10005", "Margaret Williams", 79, "Room 104", "STABLE",
                "Type 2 Diabetes", "O-", "None",
                "Karen Williams", "+1234567896", "karen.williams@email.com"
            ));

            logger.info("Patients seeded: {} records", patientRepository.count());
        } else {
            // Auto-assign reference codes to existing patients that don't have one
            patientRepository.findAllByOrderByCreatedAtDesc().forEach(p -> {
                if (p.getReferenceCode() == null) {
                    p.setReferenceCode("EG-1" + String.format("%04d", p.getId()));
                    patientRepository.save(p);
                }
            });
        }

        // Seed medications
        if (medicationRepository.count() == 0) {
            logger.info("Seeding sample medication data into PostgreSQL...");

            medicationRepository.save(new Medication(
                "Metformin 500mg", "For diabetes management", "500mg", "Twice daily",
                "8:00 AM, 8:00 PM", true, "taken", "Dr. Johnson", 2
            ));
            medicationRepository.save(new Medication(
                "Amlodipine 10mg", "For blood pressure control", "10mg", "Once daily",
                "2:00 PM", false, "pending", "Dr. Johnson", 1
            ));
            medicationRepository.save(new Medication(
                "Vitamin D3 1000IU", "Daily supplement", "1000IU", "Once daily",
                "8:00 PM", true, "scheduled", "Dr. Smith", 3
            ));

            logger.info("Medications seeded: {} records", medicationRepository.count());
        }

        // Seed health metrics
        if (healthMetricRepository.count() == 0) {
            logger.info("Seeding sample health metric data into PostgreSQL...");

            healthMetricRepository.save(new HealthMetric("John Smith", 72, 120, 80, 3500, 110, "normal"));
            healthMetricRepository.save(new HealthMetric("John Smith", 75, 118, 78, 4200, 105, "normal"));
            healthMetricRepository.save(new HealthMetric("John Smith", 68, 125, 82, 2800, 115, "normal"));

            logger.info("Health metrics seeded: {} records", healthMetricRepository.count());
        }

        // Seed care orders
        if (careOrderRepository.count() == 0) {
            logger.info("Seeding sample care order data into PostgreSQL...");

            careOrderRepository.save(new CareOrder(
                "John Smith", "medication", "Monthly medication refill for Metformin and Amlodipine",
                "completed", "medium", "Dr. Johnson", LocalDateTime.now().plusDays(2)
            ));
            careOrderRepository.save(new CareOrder(
                "John Smith", "food", "Diabetic-friendly lunch - Mediterranean Salad",
                "in_progress", "low", "Kitchen Staff", LocalDateTime.now().plusHours(2)
            ));
            careOrderRepository.save(new CareOrder(
                "John Smith", "healthcare", "Annual checkup with Dr. Johnson",
                "pending", "high", "Nurse Jane", LocalDateTime.now().plusDays(1)
            ));

            logger.info("Care orders seeded: {} records", careOrderRepository.count());
        }

        // Seed appointments
        if (appointmentRepository.count() == 0) {
            logger.info("Seeding sample appointment data into PostgreSQL...");

            appointmentRepository.save(new Appointment(
                "John Smith", "Dr. Johnson", "checkup",
                LocalDateTime.now().plusDays(2).withHour(15).withMinute(0),
                "Downtown Medical Center", "scheduled",
                "Annual physical examination"
            ));
            appointmentRepository.save(new Appointment(
                "Dorothy Chen", "Dr. Patel", "specialist",
                LocalDateTime.now().plusDays(5).withHour(10).withMinute(30),
                "Neurology Dept, ElderCare Hospital", "scheduled",
                "Parkinson's follow-up"
            ));
            appointmentRepository.save(new Appointment(
                "Harold Thompson", "Dr. Williams", "follow-up",
                LocalDateTime.now().plusDays(1).withHour(9).withMinute(0),
                "Cardiology Wing, Downtown Medical", "scheduled",
                "Heart failure monitoring"
            ));
            appointmentRepository.save(new Appointment(
                "Eleanor Davis", "Dr. Smith", "lab-test",
                LocalDateTime.now().plusDays(3).withHour(11).withMinute(0),
                "Lab Center, Downtown Medical", "scheduled",
                "Blood work and eye pressure check"
            ));

            logger.info("Appointments seeded: {} records", appointmentRepository.count());
        }
        // Seed recurring Monday checkups
        logger.info("Scheduling routine Monday checkups...");
        LocalDateTime nextMonday = LocalDateTime.now();
        while (nextMonday.getDayOfWeek() != java.time.DayOfWeek.MONDAY) {
            nextMonday = nextMonday.plusDays(1);
        }
        
        // Ensure time is 10:00 AM
        nextMonday = nextMonday.withHour(10).withMinute(0).withSecond(0).withNano(0);
        
        List<Patient> allPatients = patientRepository.findAllByOrderByCreatedAtDesc();
        
        // Add appointments for the next 4 Mondays for all patients, but only if they don't already have one
        for (int i = 0; i < 4; i++) {
            LocalDateTime appointmentTime = nextMonday.plusWeeks(i);
            
            for (Patient p : allPatients) {
                // simple check if this appointment exists (avoid duplicates if re-run)
                long exists = appointmentRepository.findAll().stream()
                    .filter(a -> a.getPatientName().equals(p.getName()) && a.getType().equals("Routine Checkup"))
                    .count();
                
                if (exists < 4) {
                    appointmentRepository.save(new Appointment(
                        p.getName(), "Dr. Johnson", "Routine Checkup",
                        appointmentTime.plusMinutes((long)(Math.random() * 120)), // stagger times
                        "Clinic Room A", "scheduled",
                        "Weekly routine checkup"
                    ));
                }
            }
        }
        logger.info("Monday checkups scheduled successfully.");

        logger.info("=== Database initialization complete ===");
        logger.info("Total patients: {}", patientRepository.count());
        logger.info("Total medications: {}", medicationRepository.count());
        logger.info("Total health metrics: {}", healthMetricRepository.count());
        logger.info("Total care orders: {}", careOrderRepository.count());
        logger.info("Total appointments: {}", appointmentRepository.count());
    }
}
