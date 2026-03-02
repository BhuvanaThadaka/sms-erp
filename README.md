# 🏫 School ERP Backend — Real-Time Student Teacher Tracking System

A production-ready NestJS backend for managing academic operations, built with MongoDB, Socket.IO real-time features, JWT authentication, and role-based access control.

---

## 🏗️ Architecture Overview

```
src/
├── main.ts                          # Entry point, global setup
├── app.module.ts                    # Root module
├── auth/                            # JWT Auth (register, login, strategy)
│   ├── dto/
│   ├── strategies/
│   ├── auth.service.ts
│   ├── auth.controller.ts
│   └── auth.module.ts
├── users/                           # User management (ADMIN/TEACHER/STUDENT)
├── classes/                         # Class/grade management
├── attendance/                      # Real-time attendance marking
├── sessions/                        # Teaching sessions & materials
├── notes/                           # Uploaded class notes
├── schedule/                        # Class scheduling & rescheduling
├── events/                          # Academic events & calendar
├── reports/                         # Quarterly reports + PDF generation
├── audit-logs/                      # System activity audit trail
├── websockets/                      # Socket.IO gateway (real-time)
└── common/                          # Shared guards, decorators, filters
    ├── enums/
    ├── guards/
    ├── decorators/
    ├── interceptors/
    └── filters/
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 6+ (local or Atlas)

### Installation

```bash
cd school-erp-backend
npm install
```

### Environment Configuration

```bash
cp .env.example .env
# Edit .env with your values
```

### Run Development Server

```bash
npm run start:dev
```

Server starts at `http://localhost:3000/api/v1`
WebSocket available on same port at `/school-erp`

---

## 🔐 Authentication

### Roles
| Role    | Permissions |
|---------|-------------|
| ADMIN   | Full system control — manage all users, classes, reports, audit logs |
| TEACHER | Mark attendance, create sessions, manage notes, generate reports |
| STUDENT | View own attendance, sessions, notes, schedule, and reports only |

### Auth Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new account |
| POST | `/api/v1/auth/login` | Login and get JWT token |
| GET | `/api/v1/auth/me` | Get current user profile |

### Login Response
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR...",
    "user": { "role": "TEACHER", "email": "..." }
  }
}
```

Include token in headers: `Authorization: Bearer <token>`

---

## 📡 API Endpoints

### Users
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/users` | ADMIN |
| GET | `/users` | ADMIN, TEACHER |
| GET | `/users/me` | All |
| GET | `/users/:id` | All (students: own only) |
| PATCH | `/users/:id` | All (students: own only) |
| DELETE | `/users/:id` | ADMIN |
| GET | `/users/class/:classId/students` | ADMIN, TEACHER |

### Classes
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/classes` | ADMIN |
| GET | `/classes` | All (teachers see their own) |
| GET | `/classes/:id` | All |
| PATCH | `/classes/:id` | ADMIN |
| POST | `/classes/:id/assign-teacher` | ADMIN |

### Attendance
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/attendance/mark` | ADMIN, TEACHER |
| POST | `/attendance/bulk-mark` | ADMIN, TEACHER |
| GET | `/attendance` | All (students: own only) |
| GET | `/attendance/student/:id/summary` | All (students: own only) |
| GET | `/attendance/class/:id/stats` | ADMIN, TEACHER |

### Sessions
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/sessions` | ADMIN, TEACHER |
| GET | `/sessions` | All |
| GET | `/sessions/:id` | All |
| PATCH | `/sessions/:id` | ADMIN, TEACHER |

### Notes
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/notes` | ADMIN, TEACHER |
| GET | `/notes/class/:classId` | All |
| DELETE | `/notes/:id` | ADMIN, TEACHER |

### Schedule
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/schedule` | ADMIN, TEACHER |
| GET | `/schedule/class/:classId` | All |
| GET | `/schedule/my` | TEACHER |
| PATCH | `/schedule/:id/reschedule` | ADMIN, TEACHER |
| DELETE | `/schedule/:id` | ADMIN |

### Events
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/events` | ADMIN, TEACHER |
| GET | `/events` | All |
| PATCH | `/events/:id` | ADMIN, TEACHER |
| DELETE | `/events/:id` | ADMIN |

### Reports
| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/reports/generate` | ADMIN, TEACHER |
| POST | `/reports/bulk-generate` | ADMIN, TEACHER |
| GET | `/reports` | All (students: own only) |
| GET | `/reports/:id` | All (students: own only) |

### Audit Logs
| Method | Endpoint | Role |
|--------|----------|------|
| GET | `/audit-logs` | ADMIN only |

---

## 🔌 WebSocket Events (Socket.IO)

### Connection
```javascript
const socket = io('http://localhost:3000/school-erp', {
  auth: { token: 'Bearer <jwt_token>' }
});
```

### Client → Server Events
| Event | Payload | Description |
|-------|---------|-------------|
| `joinClass` | `classId: string` | Join a class room |
| `leaveClass` | `classId: string` | Leave a class room |
| `joinUserRoom` | `userId: string` | Join personal notification room |

### Server → Client Events
| Event | Payload | Trigger |
|-------|---------|---------|
| `attendanceUpdate` | `{studentId, status, date}` | On attendance marked/updated |
| `sessionUpdate` | `{sessionId, topic, teacher}` | On session created |
| `scheduleUpdate` | `{type, schedule}` | On schedule created/rescheduled |
| `reportGenerated` | `{reportId, quarter, pdfUrl}` | On report generated for student |
| `systemNotification` | `{message, type}` | Broadcast notifications |

---

## 📊 Data Models

### User
- firstName, lastName, email, password (hashed), role, phone, address, classId, isActive, enrollmentNumber, employeeId

### Class  
- name, grade, section, academicYear, classTeacher (ref), teachers (refs), room, maxStudents

### Attendance
- studentId, classId, markedBy, status (PRESENT/ABSENT/LATE), date, academicYear, remarks
- **Unique index**: studentId + classId + date

### Session
- classId, teacher, topic, description, sessionDate, duration, materials, academicYear

### Report
- studentId, classId, quarter (Q1-Q4), academicYear, attendancePercentage, totalDays, presentDays, absentDays, lateDays, teacherRemarks, pdfUrl
- **Unique index**: studentId + quarter + academicYear

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017/school-erp` | MongoDB connection |
| `JWT_SECRET` | — | JWT signing secret (**required**) |
| `JWT_EXPIRES_IN` | `7d` | JWT expiry |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `PDF_STORAGE_PATH` | `./uploads/reports` | Local PDF storage |
| `PDF_BASE_URL` | `http://localhost:3000/reports` | PDF download base URL |

---

## 🛡️ Security Features

- **JWT Bearer token** authentication
- **bcrypt** password hashing (12 rounds)
- **Role-based guards** (JwtAuthGuard + RolesGuard) on all routes
- **Students isolated** — cannot access other students' data
- **Whitelist validation** — unknown fields rejected
- **Global exception filter** — structured error responses
- **CORS** configured for frontend origin only

---

## 📁 Production Build

```bash
npm run build
npm run start:prod
```

---

## 🌱 Seeding Initial Admin

After starting the server, register via API and then manually update the role in MongoDB:

```javascript
// In MongoDB shell
db.users.updateOne({ email: "admin@school.com" }, { $set: { role: "ADMIN" } })
```
