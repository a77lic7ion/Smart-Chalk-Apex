-- Smart Chalk Apex Database Initialization
-- This file creates the initial database schema

-- Create database if it doesn't exist (handled by Docker)
-- CREATE DATABASE IF NOT EXISTS smart_chalk;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Training Data table
CREATE TABLE IF NOT EXISTS training_data (
    id SERIAL PRIMARY KEY,
    source_id VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    curriculum TEXT,
    standard TEXT,
    grade VARCHAR(255),
    subject VARCHAR(255),
    content JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Saved Tests table
CREATE TABLE IF NOT EXISTS saved_tests (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Presentations table
CREATE TABLE IF NOT EXISTS presentations (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Slides table
CREATE TABLE IF NOT EXISTS slides (
    id VARCHAR(255) PRIMARY KEY,
    presentation_id VARCHAR(255) REFERENCES presentations(id) ON DELETE CASCADE,
    content JSONB
);

-- Image Placeholders table
CREATE TABLE IF NOT EXISTS image_placeholders (
    id VARCHAR(255) PRIMARY KEY,
    presentation_id VARCHAR(255) REFERENCES presentations(id) ON DELETE CASCADE,
    query TEXT
);

-- Lesson Plans table
CREATE TABLE IF NOT EXISTS lesson_plans (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Generic Saved Content table for exams, homework, etc.
CREATE TABLE IF NOT EXISTS saved_content (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'exam', 'homework', 'parsed_exam', 'manual_exam'
    content JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Image Library table
CREATE TABLE IF NOT EXISTS image_library (
    id VARCHAR(255) PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    topic VARCHAR(255),
    image_url TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_training_data_user_id ON training_data(user_id);
CREATE INDEX IF NOT EXISTS idx_training_data_subject ON training_data(subject);
CREATE INDEX IF NOT EXISTS idx_saved_tests_user_id ON saved_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON presentations(user_id);
CREATE INDEX IF NOT EXISTS idx_slides_presentation_id ON slides(presentation_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_user_id ON lesson_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_content_user_id ON saved_content(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_content_type ON saved_content(type);
CREATE INDEX IF NOT EXISTS idx_image_library_user_id ON image_library(user_id);

-- Insert a default admin user for testing (optional)
INSERT INTO users (email, name) 
VALUES ('admin@smartchalk.com', 'Admin User') 
ON CONFLICT (email) DO NOTHING;