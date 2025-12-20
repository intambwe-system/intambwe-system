const express = require('express');
const router = express.Router();
const reportController = require('../../controllers/report/reportController');
const { authenticateToken, authorizeRoles } = require('../../middleware/employeeAuth');

// ==================== STUDENT ASSESSMENT REPORT ====================
/**
 * @route   GET /api/report/student/:std_id/assessment
 * @desc    Get comprehensive student assessment report with ranking
 * @access  Private (Admin, Teacher, Student can view own)
 * @query   ac_year - Academic year (required)
 */
router.get(
  '/student/:std_id/assessment',
  authenticateToken,
  authorizeRoles('admin', 'teacher', 'student'),
  reportController.getStudentAssessmentReport
);

// ==================== CLASS RANKING ====================
/**
 * @route   GET /api/report/class/:class_id/ranking
 * @desc    Get class ranking for all students
 * @access  Private (Admin, Teacher only)
 * @query   ac_year - Academic year (required)
 */
router.get(
  '/class/:class_id/ranking',
  authenticateToken,
  authorizeRoles('admin', 'teacher'),
  reportController.getClassRanking
);

module.exports = router