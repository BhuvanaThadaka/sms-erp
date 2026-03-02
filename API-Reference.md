# 🏫 School ERP — API Quick Reference & Test Guide

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All protected routes require: `Authorization: Bearer <token>`

---

## 🔐 Auth Endpoints

| Method | URL | Body | Auth |
|--------|-----|------|------|
| POST | `/auth/register` | `{firstName, lastName, email, password}` | ❌ |
| POST | `/auth/login` | `{email, password}` | ❌ |
| GET | `/auth/me` | — | ✅ |

### Login Bodies
```json
// Admin
{ "email": "admin@school.com", "password": "Admin@123" }

// Teacher
{ "email": "teacher@school.com", "password": "Teacher@123" }

// Student
{ "email": "student@school.com", "password": "Student@123" }
```

---

## 👥 Users

| Method | URL | Role |
|--------|-----|------|
| POST | `/users` | ADMIN |
| GET | `/users` | ADMIN, TEACHER |
| GET | `/users?role=TEACHER` | ADMIN, TEACHER |
| GET | `/users?role=STUDENT` | ADMIN, TEACHER |
| GET | `/users/me` | ALL |
| GET | `/users/:id` | ALL (student: own only) |
| PATCH | `/users/:id` | ALL (student: own only) |
| DELETE | `/users/:id` | ADMIN |
| GET | `/users/class/:classId/students` | ADMIN, TEACHER |

### Create Teacher
```json
{
  "firstName": "Sarah", "lastName": "Johnson",
  "email": "teacher@school.com", "password": "Teacher@123",
  "role": "TEACHER", "employeeId": "EMP001"
}
```

### Create Student
```json
{
  "firstName": "Alice", "lastName": "Smith",
  "email": "alice@school.com", "password": "Student@123",
  "role": "STUDENT", "enrollmentNumber": "STU2024001"
}
```

---

## 🏛️ Classes

| Method | URL | Role |
|--------|-----|------|
| POST | `/classes` | ADMIN |
| GET | `/classes` | ALL |
| GET | `/classes/:id` | ALL |
| PATCH | `/classes/:id` | ADMIN |
| POST | `/classes/:id/assign-teacher` | ADMIN |

### Create Class
```json
{
  "name": "Grade 10 - Section A",
  "grade": "10", "section": "A",
  "academicYear": "2024-2025",
  "room": "Room 101", "maxStudents": 35
}
```

---

## ✅ Attendance

| Method | URL | Role |
|--------|-----|------|
| POST | `/attendance/mark` | ADMIN, TEACHER |
| POST | `/attendance/bulk-mark` | ADMIN, TEACHER |
| GET | `/attendance` | ALL (student: own only) |
| GET | `/attendance?date=2025-01-15` | ALL |
| GET | `/attendance?month=2025-01` | ALL |
| GET | `/attendance/student/:id/summary?academicYear=` | ALL |
| GET | `/attendance/class/:id/stats?date=` | ADMIN, TEACHER |

### Mark Single
```json
{
  "studentId": "<id>", "classId": "<id>",
  "status": "PRESENT",
  "date": "2025-01-15",
  "academicYear": "2024-2025"
}
```
> Status options: `PRESENT` | `ABSENT` | `LATE`

### Bulk Mark
```json
{
  "classId": "<id>",
  "date": "2025-01-20",
  "academicYear": "2024-2025",
  "records": [
    { "studentId": "<id>", "status": "PRESENT" },
    { "studentId": "<id>", "status": "ABSENT", "remarks": "Sick leave" }
  ]
}
```

---

## 📚 Sessions

| Method | URL | Role |
|--------|-----|------|
| POST | `/sessions` | ADMIN, TEACHER |
| GET | `/sessions?classId=&academicYear=` | ALL |
| GET | `/sessions/:id` | ALL |
| PATCH | `/sessions/:id` | ADMIN, TEACHER |

### Create Session
```json
{
  "classId": "<id>",
  "topic": "Introduction to Algebra",
  "sessionDate": "2025-01-15",
  "duration": 60,
  "academicYear": "2024-2025",
  "materials": ["https://drive.google.com/file1.pdf"],
  "learningObjectives": ["Understand variables", "Solve linear equations"]
}
```

---

## 📄 Notes

| Method | URL | Role |
|--------|-----|------|
| POST | `/notes` | ADMIN, TEACHER |
| GET | `/notes/class/:classId` | ALL |
| GET | `/notes/class/:classId?subject=Math` | ALL |
| DELETE | `/notes/:id` | ADMIN, TEACHER |

### Upload Note
```json
{
  "classId": "<id>",
  "title": "Algebra Chapter 1 Notes",
  "fileUrl": "https://drive.google.com/file.pdf",
  "fileName": "algebra-ch1.pdf",
  "subject": "Mathematics",
  "academicYear": "2024-2025"
}
```

---

## 📅 Schedule

| Method | URL | Role |
|--------|-----|------|
| POST | `/schedule` | ADMIN, TEACHER |
| GET | `/schedule/class/:classId` | ALL |
| GET | `/schedule/teacher/:teacherId` | ADMIN, TEACHER |
| GET | `/schedule/my` | TEACHER |
| PATCH | `/schedule/:id/reschedule` | ADMIN, TEACHER |
| DELETE | `/schedule/:id` | ADMIN |

### Create Schedule
```json
{
  "classId": "<id>", "teacher": "<id>",
  "subject": "Mathematics",
  "dayOfWeek": "MONDAY",
  "startTime": "09:00", "endTime": "10:00",
  "room": "Room 101", "academicYear": "2024-2025"
}
```
> Days: `MONDAY` | `TUESDAY` | `WEDNESDAY` | `THURSDAY` | `FRIDAY` | `SATURDAY` | `SUNDAY`

### Reschedule
```json
{
  "rescheduledDate": "2025-01-27",
  "rescheduleReason": "Teacher at workshop"
}
```

---

## 🗓️ Events

| Method | URL | Role |
|--------|-----|------|
| POST | `/events` | ADMIN, TEACHER |
| GET | `/events?academicYear=&classId=` | ALL |
| GET | `/events?startDate=&endDate=` | ALL |
| GET | `/events/:id` | ALL |
| PATCH | `/events/:id` | ADMIN, TEACHER |
| DELETE | `/events/:id` | ADMIN |

### Create Event
```json
{
  "title": "Q1 Mathematics Exam",
  "type": "EXAM",
  "startDate": "2025-02-10",
  "endDate": "2025-02-10",
  "applicableClasses": ["<classId>"],
  "isAllClasses": false,
  "venue": "Exam Hall A",
  "academicYear": "2024-2025"
}
```
> Types: `EXAM` | `HOLIDAY` | `MEETING` | `SPECIAL` | `ACTIVITY`

---

## 📊 Reports

| Method | URL | Role |
|--------|-----|------|
| POST | `/reports/generate` | ADMIN, TEACHER |
| POST | `/reports/bulk-generate` | ADMIN, TEACHER |
| GET | `/reports` | ALL (student: own only) |
| GET | `/reports?quarter=Q1&classId=` | ALL |
| GET | `/reports/:id` | ALL (student: own only) |

### Generate Report
```json
{
  "studentId": "<id>", "classId": "<id>",
  "quarter": "Q1", "academicYear": "2024-2025",
  "teacherRemarks": "Excellent performance...",
  "participationSummary": "Active participant...",
  "overallPerformance": "EXCELLENT"
}
```
> Quarters: `Q1` | `Q2` | `Q3` | `Q4`
> Performance: `EXCELLENT` | `GOOD` | `AVERAGE` | `BELOW_AVERAGE`

### Bulk Generate
```json
{
  "classId": "<id>",
  "quarter": "Q1",
  "academicYear": "2024-2025"
}
```

---

## 🔍 Audit Logs (Admin only)

| Method | URL |
|--------|-----|
| GET | `/audit-logs` |
| GET | `/audit-logs?action=ATTENDANCE_MARKED` |
| GET | `/audit-logs?entityType=Report` |
| GET | `/audit-logs?performedBy=<userId>` |
| GET | `/audit-logs?from=2025-01-01&to=2025-01-31` |

> Actions: `ATTENDANCE_MARKED`, `ATTENDANCE_UPDATED`, `SESSION_CREATED`, `SESSION_UPDATED`, `REPORT_GENERATED`, `PROFILE_UPDATED`, `USER_CREATED`, `CLASS_CREATED`, `NOTE_UPLOADED`, `SCHEDULE_CREATED`, `EVENT_CREATED`

---

## 🔌 WebSocket (Socket.IO)

```javascript
const socket = io('http://localhost:3000/school-erp', {
  auth: { token: '<JWT_TOKEN>' }
});

// Join class room to receive live updates
socket.emit('joinClass', '<classId>');

// Listen to events
socket.on('attendanceUpdate', (data) => console.log('Attendance:', data));
socket.on('sessionUpdate', (data) => console.log('Session:', data));
socket.on('scheduleUpdate', (data) => console.log('Schedule:', data));
socket.on('reportGenerated', (data) => console.log('Report:', data));

// Join your personal room (for report notifications)
socket.emit('joinUserRoom', '<userId>');
```

---

## 🧪 Recommended Test Order

1. **Auth** → Login as Admin (saves token)
2. **Users** → Create Teacher, then Student
3. **Classes** → Create a class, assign teacher
4. **Attendance** → Mark attendance for student
5. **Sessions** → Create session with materials
6. **Notes** → Upload notes linked to session
7. **Schedule** → Create weekly timetable
8. **Events** → Add exam and holiday events
9. **Reports** → Generate Q1 report (checks attendance auto-calc)
10. **Audit Logs** → Review all system activity
