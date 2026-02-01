-- EduPass PostgreSQL Database Setup Script
-- This script creates the database and required extensions

-- Create database (run this as postgres superuser)
CREATE DATABASE edupass;

-- Connect to the database
\c edupass;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges to the database user (replace 'edupass_user' with your username)
-- GRANT ALL PRIVILEGES ON DATABASE edupass TO edupass_user;

-- Tables will be created automatically by the application on first run
-- See backend/src/config/database.js for table definitions
