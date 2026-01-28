# Secure QR Voter Verification System

A secure, transaction-based voter identification system ensuring one-person-one-vote via QR verification.

## Core Features

1.  **Voter Identity**: Each voter is assigned a unique QR code (identity token).
2.  **Verification**: At the polling booth, the QR code is scanned.
3.  **Auditability**: Every attempt (success or failure) is logged.
4.  **Security**:
    - **Double-Voting Prevention**: Database validites prevent verify twice functionality.
    - **Transactions**: Updates are atomic; verification cannot "partially" fail or succeed.
    - **Expired Tokens**: Tokens have validity periods.

## Project Structure

- `backend/`: Express.js + Drizzle ORM + PostgreSQL
- `frontend/`: React + Vite + Chakra UI

## Setup Instructions

### Prerequisites

- Bun (or Node.js)
- PostgreSQL Database

### Backend Setup

1.  Navigate to `backend`:
    ```bash
    cd backend
    ```
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Configure Database:
    - Copy `.env` (created automatically with default `postgres://postgres:postgres@localhost:5432/voting_db`)
    - Update `DATABASE_URL` with your credentials.
4.  Run Migrations:
    ```bash
    bun run generate
    bun run migrate
    ```
5.  Start Server:
    ```bash
    bun run dev
    ```

### Frontend Setup

1.  Navigate to `frontend`:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    bun install
    ```
3.  Start Dev Server:
    ```bash
    bun dev
    ```
4.  Open http://localhost:5173

## How to Test

1.  Open **Frontend** at `http://localhost:5173`.
2.  Click **"Generate Demo Identity"** to create a fresh Voter + QR Code (Stored in DB).
3.  Open a second tab or device at `http://localhost:5173/booth`.
4.  (If using a webcam) Scan the QR code.
5.  (Simulated) You can inspect the QR content (it's the token string) and verify manually if needed, or use the camera.
6.  **First Scan**: Should show Green "Verified!".
7.  **Second Scan**: Should show Red "Access Denied - Already Verified".
