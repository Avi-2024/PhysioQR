-- Database initialization for unified Solo-CRM database.
-- This runs automatically when Docker Compose starts the PostgreSQL container.
-- Each microservice has its own schema for logical isolation.

CREATE SCHEMA IF NOT EXISTS auth_iam;
CREATE SCHEMA IF NOT EXISTS lead_management;
CREATE SCHEMA IF NOT EXISTS integration;

-- Required extension for lead name trigram search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
