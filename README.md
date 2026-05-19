# Healthcare Appointment Booking System

A full-stack MERN application for clinic appointment booking with slot conflict resolution, timezone awareness, and waitlist management.

---

## Stack

- **Backend**: Node.js, Express 5, MongoDB (Mongoose), Luxon, JWT
- **Frontend**: React 19, Vite, TanStack Query, React Hook Form, React Hot Toast

---

## Setup & Run

### Prerequisites

- Node.js ≥ 18
- MongoDB running locally on port 27017 (or provide a remote URI)

### 1. Clone & install

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
# Edit .env — set MONGO_URI and JWT_SECRET at minimum
```

### 3. Seed demo data

```bash
cd backend
npm run seed
```

This creates:
| Role        | Email                  | Password    |
|-------------|------------------------|-------------|
| Clinic Admin | admin@clinic.com      | Admin@123   |
| Doctor       | sharma@clinic.com     | Doctor@123  |
| Doctor       | patel@clinic.com      | Doctor@123  |
| Doctor       | jones@clinic.com      | Doctor@123  |
| Doctor       | lee@clinic.com        | Doctor@123  |
| Patient      | alice@patient.com     | Patient@123 |
| Patient      | bob@patient.com       | Patient@123 |
| Patient      | carol@patient.com     | Patient@123 |

### 4. Start servers

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open http://localhost:5173

---

## Environment Variables

| Variable           | Required | Description                          |
|--------------------|----------|--------------------------------------|
| `PORT`             | No       | Backend port (default 5000)          |
| `MONGO_URI`        | Yes      | MongoDB connection string            |
| `JWT_SECRET`       | Yes      | Secret for signing JWT tokens        |
| `JWT_SECRET_EXPIRY`| No       | Token expiry (default 7d)            |
| `NODE_ENV`         | No       | development / production             |
| `CLIENT_URL`       | No       | Frontend origin for CORS             |

---

## API Reference

All endpoints are prefixed with `/api`.

### Auth

| Method | Path              | Body                              | Auth |
|--------|-------------------|-----------------------------------|------|
| POST   | /auth/register    | username, email, password, role   | —    |
| POST   | /auth/login       | email, password                   | —    |
| POST   | /auth/logout      | —                                 | JWT  |
| GET    | /auth/            | —                                 | JWT  |

### Doctor Profile

| Method | Path                        | Description                    | Auth   |
|--------|-----------------------------|--------------------------------|--------|
| GET    | /doctor/                    | Get own profile                | Doctor |
| POST   | /doctor/create              | Create profile                 | Doctor |
| PATCH  | /doctor/update              | Update profile                 | Doctor |
| POST   | /doctor/weekly-availability | Set weekly availability        | Doctor |
| POST   | /doctor/blackout-dates      | Set blackout dates             | Doctor |
| GET    | /doctor/search              | Search doctors (public)        | —      |

**Search params**: `specialty`, `location`, `date` (YYYY-MM-DD), `n` (slots per doctor)

### Appointments

| Method | Path                          | Description                    | Auth    |
|--------|-------------------------------|--------------------------------|---------|
| POST   | /appointment/book             | Book appointment               | Patient |
| GET    | /appointment/patient          | My appointments                | Patient |
| GET    | /appointment/doctor           | Day view (query: date)         | Doctor  |
| GET    | /appointment/                 | All appointments (query: status)| Doctor |
| PUT    | /appointment/:id/cancel       | Cancel appointment             | JWT     |
| POST   | /appointment/:id/reschedule   | Reschedule appointment         | JWT     |
| POST   | /appointment/:id/status-update| Update status                  | Doctor  |
| POST   | /appointment/:id/update-doctor-notes | Save doctor notes     | Doctor  |

### Waitlist

| Method | Path              | Description              | Auth    |
|--------|-------------------|--------------------------|---------|
| POST   | /waitlist/join    | Join waitlist for a slot | Patient |
| GET    | /waitlist/my      | My waitlist entries      | Patient |
| DELETE | /waitlist/:id     | Leave waitlist           | Patient |
| GET    | /waitlist/slot    | View slot queue          | Doctor  |
| POST   | /waitlist/process-next | Auto-book next in queue | — |

### Clinic Admin

| Method | Path                                    | Description                  |
|--------|-----------------------------------------|------------------------------|
| GET    | /clinic-admin/stats                     | Clinic overview stats        |
| GET    | /clinic-admin/doctors                   | All doctors (paginated)      |
| GET    | /clinic-admin/patients                  | All patients (paginated)     |
| GET    | /clinic-admin/appointments              | All appointments (paginated) |
| GET    | /clinic-admin/appointments-per-doctor   | Per-doctor stats             |
| PATCH  | /clinic-admin/doctors/:id               | Update doctor details        |
| PATCH  | /clinic-admin/doctors/:id/toggle-acceptance | Toggle accepting status |
| DELETE | /clinic-admin/doctors/:id               | Delete doctor                |
| DELETE | /clinic-admin/patients/:id              | Delete patient               |
| PATCH  | /clinic-admin/appointments/:id/status   | Update appointment status    |
| POST   | /clinic-admin/emergency/doctor          | Emergency add doctor         |
| POST   | /clinic-admin/emergency/patient         | Emergency add patient        |

---

## curl Examples

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"Test@123","role":"Patient"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@patient.com","password":"Patient@123"}'

# Search doctors
curl "http://localhost:5000/api/doctor/search?specialty=Cardiology&n=5"

# Book appointment (replace TOKEN and IDs)
curl -X POST http://localhost:5000/api/appointment/book \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"doctorId":"DOCTOR_PROFILE_ID","slotStartUTC":"2026-08-01T04:30:00.000Z","slotEndUTC":"2026-08-01T05:00:00.000Z","reason":"Checkup","timezone":"Asia/Kolkata"}'
```

---

## Key Features

- **Atomic slot reservation** — unique compound index on `doctorId + slotStartUTC` prevents double-booking
- **Server-generated slot grid** — slots computed on-the-fly from availability rules; no pre-seeded slot documents
- **Timezone-aware** — DB stores UTC, UI renders in browser/doctor local time via Luxon + Intl API
- **Cancellation window** — server enforces ≥ 4 hours before slot; UI cannot bypass this
- **Waitlist auto-booking** — cancellation triggers next-in-queue promotion
- **Role-based access** — Patient / Doctor / Clinic Admin with JWT middleware
- **Responsive** — works on 375px viewport

---

## Concurrency Test

Run two parallel booking requests on the same slot:

```bash
curl -X POST http://localhost:5000/api/appointment/book \
  -H "Authorization: Bearer TOKEN_PATIENT_1" \
  -H "Content-Type: application/json" \
  -d '{"doctorId":"ID","slotStartUTC":"2026-08-01T04:30:00Z","slotEndUTC":"2026-08-01T05:00:00Z","reason":"Test"}' &

curl -X POST http://localhost:5000/api/appointment/book \
  -H "Authorization: Bearer TOKEN_PATIENT_2" \
  -H "Content-Type: application/json" \
  -d '{"doctorId":"ID","slotStartUTC":"2026-08-01T04:30:00Z","slotEndUTC":"2026-08-01T05:00:00Z","reason":"Test"}' &

wait
```

Exactly one will succeed (201) and the other will receive 409 Conflict.
