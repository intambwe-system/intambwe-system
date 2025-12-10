// routes/attendance.routes.js
const express = require('express');
const router = express.Router();
const attendanceController = require('../../controllers/attendance/attendanceController');
const { authenticateToken, authorizeRoles } = require('../../middleware/employeeAuth');

// ==================== CRUD Operations ====================

// CREATE or update attendance (upsert behavior in controller)
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  attendanceController.recordAttendance
);

// READ attendance list with filters and pagination
router.get(
  '/',
  authenticateToken,
  attendanceController.getAttendance
);

// READ single attendance record by ID
router.get(
  '/:id',
  authenticateToken,
  attendanceController.getAttendanceById
);

// UPDATE attendance record
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  attendanceController.updateAttendance
);

router.patch(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  attendanceController.updateAttendance
);

// DELETE attendance record
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  attendanceController.deleteAttendance
);

// ==================== Summary & Analytics Routes ====================

// Get student attendance summary
// Example: GET /attendance/student/123/summary?start_date=2024-01-01&end_date=2024-12-31
router.get(
  '/student/:student_id/summary',
  authenticateToken,
  attendanceController.getStudentAttendanceSummary
);

// ==================== Grouped Data Routes ====================

// Get attendance grouped by CLASS
// Example: GET /attendance/group/class?start_date=2024-01-01&end_date=2024-12-31&status=present
router.get(
  '/group/class',
  authenticateToken,
  attendanceController.getAttendanceByClass
);

// Get attendance grouped by DATE
// Example: GET /attendance/group/date?start_date=2024-01-01&class_id=5
router.get(
  '/group/date',
  authenticateToken,
  attendanceController.getAttendanceByDate
);

// Get attendance grouped by STUDENT
// Example: GET /attendance/group/student?class_id=5&start_date=2024-01-01
router.get(
  '/group/student',
  authenticateToken,
  attendanceController.getAttendanceByStudent
);

// Get attendance grouped by EMPLOYEE (who recorded it)
// Example: GET /attendance/group/employee?start_date=2024-01-01&status=present
router.get(
  '/group/employee',
  authenticateToken,
  attendanceController.getAttendanceByEmployee
);

// Get attendance grouped by STATUS (present, absent, late)
// Example: GET /attendance/group/status?class_id=5&start_date=2024-01-01
router.get(
  '/group/status',
  authenticateToken,
  attendanceController.getAttendanceByStatus
);

// Get attendance grouped by METHOD (QR, RFID, manual)
// Example: GET /attendance/group/method?class_id=5&start_date=2024-01-01
router.get(
  '/group/method',
  authenticateToken,
  attendanceController.getAttendanceByMethod
);

module.exports = router;