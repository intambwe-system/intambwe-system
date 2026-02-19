const express = require("express");
const router = express.Router();
const examController = require("../../controllers/exam/examController");
const questionController = require("../../controllers/exam/questionController");
const attemptController = require("../../controllers/exam/attemptController");
const gradingController = require("../../controllers/exam/gradingController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../../middleware/employeeAuth");
const { authenticateStudent } = require("../../middleware/studentAuth");

// ============================================
// EXAM MANAGEMENT ROUTES (Teacher/Admin)
// ============================================

// Create exam
router.post(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  examController.createExam
);

// Get all exams (teacher sees their own, admin sees all)
router.get(
  "/",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  examController.getAllExams
);

// Get exam by ID
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  examController.getExamById
);

// Update exam
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  examController.updateExam
);

// Delete exam
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  examController.deleteExam
);

// Publish exam
router.post(
  "/:id/publish",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  examController.publishExam
);

// Unpublish exam (revert to draft)
router.post(
  "/:id/unpublish",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  examController.unpublishExam
);

// Archive exam
router.post(
  "/:id/archive",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  examController.archiveExam
);

// Unarchive exam (revert to draft)
router.post(
  "/:id/unarchive",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  examController.unarchiveExam
);

// Duplicate exam
router.post(
  "/:id/duplicate",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  examController.duplicateExam
);

// ============================================
// QUESTION MANAGEMENT ROUTES
// ============================================

// Add question to exam
router.post(
  "/:examId/question",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  questionController.addQuestion
);

// Get all questions for exam
router.get(
  "/:examId/question",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  questionController.getExamQuestions
);

// Update question
router.put(
  "/:examId/question/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  questionController.updateQuestion
);

// Delete question
router.delete(
  "/:examId/question/:id",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  questionController.deleteQuestion
);

// Reorder questions
router.post(
  "/:examId/question/reorder",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  questionController.reorderQuestions
);

// ============================================
// ANSWER OPTION ROUTES
// ============================================

// Add option to question
router.post(
  "/question/:questionId/option",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  questionController.addOption
);

// Update option
router.put(
  "/question/:questionId/option/:optionId",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  questionController.updateOption
);

// Delete option
router.delete(
  "/question/:questionId/option/:optionId",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  questionController.deleteOption
);

// ============================================
// PUBLIC EXAM PARTICIPANT MANAGEMENT (Admin/Teacher)
// ============================================

// Get all participants/attempts for a public exam with email/phone filter
router.get(
  "/:examId/participants",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { examId } = req.params;
      const { search, status, page = 1, limit = 20 } = req.query;
      const { ExamAttempt, GuestParticipant, Exam } = require("../../model");
      const { Op } = require("sequelize");

      // Build guest filter for search by email or phone
      const guestWhere = {};
      if (search) {
        guestWhere[Op.or] = [
          { email: { [Op.like]: `%${search}%` } },
          { phone: { [Op.like]: `%${search}%` } },
          { full_name: { [Op.like]: `%${search}%` } },
        ];
      }

      // Build attempt filter
      const attemptWhere = { exam_id: examId, is_guest: true };
      if (status) {
        attemptWhere.status = status;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: attempts } = await ExamAttempt.findAndCountAll({
        where: attemptWhere,
        include: [
          {
            model: GuestParticipant,
            as: "guest",
            where: Object.keys(guestWhere).length ? guestWhere : undefined,
            attributes: ["guest_id", "full_name", "email", "phone", "ip_address", "createdAt"],
          },
        ],
        attributes: [
          "attempt_id", "attempt_number", "status", "started_at", "submitted_at",
          "total_score", "max_score", "percentage", "grade", "pass_status",
          "time_taken_seconds", "tab_switches", "questions_answered",
        ],
        order: [["started_at", "DESC"]],
        limit: parseInt(limit),
        offset,
      });

      res.json({
        success: true,
        data: attempts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching participants:", error);
      res.status(500).json({ success: false, message: "Failed to fetch participants" });
    }
  }
);

// Delete a public exam attempt (admin only)
router.delete(
  "/:examId/participants/:attemptId",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { examId, attemptId } = req.params;
      const { ExamAttempt, StudentResponse } = require("../../model");

      const attempt = await ExamAttempt.findOne({
        where: { attempt_id: attemptId, exam_id: examId, is_guest: true },
      });

      if (!attempt) {
        return res.status(404).json({ success: false, message: "Attempt not found" });
      }

      await StudentResponse.destroy({ where: { attempt_id: attemptId } });
      await attempt.destroy();

      res.json({ success: true, message: "Attempt deleted successfully" });
    } catch (error) {
      console.error("Error deleting attempt:", error);
      res.status(500).json({ success: false, message: "Failed to delete attempt" });
    }
  }
);

// ============================================
// STUDENT EXAM PARTICIPANT MANAGEMENT (Admin/Teacher)
// ============================================

// Get all student participants/attempts for an exam
router.get(
  "/:examId/student-participants",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
    try {
      const { examId } = req.params;
      const { search, status, page = 1, limit = 20 } = req.query;
      const { ExamAttempt, Student, Exam } = require("../../model");
      const { Op } = require("sequelize");

      // Build student filter for search
      const studentWhere = {};
      if (search) {
        studentWhere[Op.or] = [
          { std_email: { [Op.like]: `%${search}%` } },
          { std_fname: { [Op.like]: `%${search}%` } },
          { std_lname: { [Op.like]: `%${search}%` } },
          { std_id: !isNaN(search) ? parseInt(search) : -1 },
        ];
      }

      // Build attempt filter (only student attempts, not guests)
      const attemptWhere = {
        exam_id: examId,
        std_id: { [Op.ne]: null },
        is_guest: false,
      };
      if (status) {
        attemptWhere.status = status;
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: attempts } = await ExamAttempt.findAndCountAll({
        where: attemptWhere,
        include: [
          {
            model: Student,
            as: "student",
            where: Object.keys(studentWhere).length ? studentWhere : undefined,
            attributes: ["std_id", "std_fname", "std_lname", "std_email", "std_phone"],
          },
        ],
        attributes: [
          "attempt_id", "attempt_number", "status", "started_at", "submitted_at",
          "total_score", "max_score", "percentage", "grade", "pass_status",
          "time_taken_seconds", "tab_switches", "questions_answered",
        ],
        order: [["started_at", "DESC"]],
        limit: parseInt(limit),
        offset,
      });

      res.json({
        success: true,
        data: attempts,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Error fetching student participants:", error);
      res.status(500).json({ success: false, message: "Failed to fetch student participants" });
    }
  }
);

// Delete a student exam attempt (admin only)
router.delete(
  "/:examId/student-participants/:attemptId",
  authenticateToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { examId, attemptId } = req.params;
      const { ExamAttempt, StudentResponse } = require("../../model");

      const attempt = await ExamAttempt.findOne({
        where: { attempt_id: attemptId, exam_id: examId, is_guest: false },
      });

      if (!attempt) {
        return res.status(404).json({ success: false, message: "Attempt not found" });
      }

      await StudentResponse.destroy({ where: { attempt_id: attemptId } });
      await attempt.destroy();

      res.json({ success: true, message: "Student attempt deleted successfully" });
    } catch (error) {
      console.error("Error deleting student attempt:", error);
      res.status(500).json({ success: false, message: "Failed to delete student attempt" });
    }
  }
);

// ============================================
// GRADING ROUTES (Teacher/Admin)
// ============================================

// Get exams pending manual grading
router.get(
  "/grading/pending",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  gradingController.getPendingGrading
);

// Get all responses for an exam
router.get(
  "/grading/:examId/responses",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  gradingController.getExamResponses
);

// Grade a single response
router.put(
  "/grading/response/:responseId",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  gradingController.gradeResponse
);

// Finalize grading for an attempt
router.post(
  "/grading/attempt/:attemptId/finalize",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  gradingController.finalizeAttemptGrading
);

// Bulk grade responses
router.post(
  "/grading/bulk",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  gradingController.bulkGradeResponses
);

// Get grading statistics
router.get(
  "/grading/:examId/stats",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  gradingController.getGradingStats
);

module.exports = router;
