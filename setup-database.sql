-- ============================================================
-- ElderGuard Nexus - PostgreSQL Database Setup
-- Run these commands in pgAdmin Query Tool BEFORE starting the app
-- ============================================================

-- Step 1: Create the database (run this in pgAdmin on the 'postgres' database)
CREATE DATABASE geriatric_care_db;

-- Step 2: Connect to the new database (in pgAdmin, right-click geriatric_care_db → Query Tool)
-- Then run:

-- NOTE: The tables below are created AUTOMATICALLY by Spring Boot JPA (ddl-auto: update)
-- You do NOT need to run these manually. They are here for reference only.

-- ============================================================
-- Tables (AUTO-CREATED by Hibernate on app startup)
-- ============================================================

-- Care Orders Table
-- CREATE TABLE care_orders (
--     id BIGSERIAL PRIMARY KEY,
--     patient_name VARCHAR(255) NOT NULL,
--     order_type VARCHAR(255) NOT NULL,
--     description VARCHAR(1000),
--     status VARCHAR(255) NOT NULL,
--     priority VARCHAR(255),
--     created_at TIMESTAMP,
--     updated_at TIMESTAMP
-- );

-- Health Metrics Table
-- CREATE TABLE health_metrics (
--     id BIGSERIAL PRIMARY KEY,
--     patient_name VARCHAR(255),
--     heart_rate INTEGER,
--     systolic_bp INTEGER,
--     diastolic_bp INTEGER,
--     steps INTEGER,
--     blood_sugar INTEGER,
--     status VARCHAR(255),
--     recorded_at TIMESTAMP
-- );

-- Daily Tasks Table
-- CREATE TABLE daily_tasks (
--     id BIGSERIAL PRIMARY KEY,
--     text VARCHAR(255) NOT NULL,
--     patient_name VARCHAR(255),
--     completed BOOLEAN DEFAULT FALSE,
--     created_at TIMESTAMP
-- );

-- Medications Table
-- CREATE TABLE medications (
--     id BIGSERIAL PRIMARY KEY,
--     name VARCHAR(255) NOT NULL,
--     description VARCHAR(255),
--     dosage VARCHAR(255),
--     frequency VARCHAR(255),
--     time_slots VARCHAR(255),
--     with_food BOOLEAN,
--     status VARCHAR(255),
--     prescribed_by VARCHAR(255),
--     refills_remaining INTEGER,
--     created_at TIMESTAMP
-- );

-- Emergency Alerts Table
-- CREATE TABLE emergency_alerts (
--     id BIGSERIAL PRIMARY KEY,
--     alert_id VARCHAR(255) UNIQUE,
--     type VARCHAR(255),
--     patient_name VARCHAR(255),
--     location VARCHAR(255),
--     message VARCHAR(1000),
--     status VARCHAR(255),
--     response_time VARCHAR(255),
--     created_at TIMESTAMP
-- );

-- ============================================================
-- Useful queries to verify data in pgAdmin
-- ============================================================

-- View all care orders
SELECT * FROM care_orders ORDER BY created_at DESC;

-- View all health metrics
SELECT * FROM health_metrics ORDER BY recorded_at DESC;

-- View all daily tasks
SELECT * FROM daily_tasks ORDER BY created_at DESC;

-- View all medications
SELECT * FROM medications ORDER BY created_at DESC;

-- View all emergency alerts
SELECT * FROM emergency_alerts ORDER BY created_at DESC;

-- Count records in all tables
SELECT 'care_orders' AS table_name, COUNT(*) AS record_count FROM care_orders
UNION ALL
SELECT 'health_metrics', COUNT(*) FROM health_metrics
UNION ALL
SELECT 'daily_tasks', COUNT(*) FROM daily_tasks
UNION ALL
SELECT 'medications', COUNT(*) FROM medications
UNION ALL
SELECT 'emergency_alerts', COUNT(*) FROM emergency_alerts;
