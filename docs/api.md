# REST API Interface Reference

This document highlights available endpoints exposed by the Cloudflare Worker serverless controllers.

## Base URL
Local Emulator: `http://localhost:8787`
Production API: `https://mrcpch-study-platform.yourname.workers.dev`

All private endpoints require the `Authorization: Bearer <your_jwt_token>` header.

---

## Authentication Endpoints

### 1. Register Account
* **Endpoint**: `POST /api/auth/register`
* **Body**:
  ```json
  {
    "email": "student@example.com",
    "password": "strong_password",
    "fullName": "Name Surname"
  }
  ```
* **Response**: `201 Created` with secure short-lived Access Token.

### 2. Login
* **Endpoint**: `POST /api/auth/login`
* **Body**:
  ```json
  {
    "email": "student@example.com",
    "password": "password"
  }
  ```
* **Response**: `200 OK` + JSON carrying JWT token and profile meta.

### 3. Logout
* **Endpoint**: `POST /api/auth/logout`
* **Response**: `200 OK` with session cookie clear commands.

---

## Core Question Banks

### Get All Active Banks
* **Endpoint**: `GET /api/question-banks`
* **Response**: Array of Banks carrying category names and total nested counts.

### Create Question Bank (Admin Only)
* **Endpoint**: `POST /api/question-banks`
* **Body**:
  ```json
  {
    "name": "Neonatal Infections",
    "description": "NICE Guidelines for GBS and early neonatal sepsis",
    "category": "Neonatal"
  }
  ```

---

## Exam Sessions

### Submit Finished Attempt
* **Endpoint**: `POST /api/exams/submit`
* **Body**:
  ```json
  {
    "bankId": "qb_cards",
    "answers": {
      "q_card1": 0,
      "q_card2": 1
    }
  }
  ```
* **Response**: Detailed scorecard containing percentage, correct questions, and analysis.
