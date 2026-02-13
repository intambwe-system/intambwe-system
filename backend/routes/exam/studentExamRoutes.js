const express = require("express");
const router = express.Router();
const examController = require("../../controllers/exam/examController");
const attemptController = require("../../controllers/exam/attemptController");
const { authenticateStudent } = require("../../middleware/studentAuth");

// ============================================
// STUDENT EXAM ROUTES
// ============================================

// Get available exams for student
router.get(
  "/available",
  authenticateStudent,
  examController.getAvailableExams
);

// Get exam info for student (instructions page)
router.get(
  "/:id/info",
  authenticateStudent,
  examController.getExamInfoForStudent
);

// Start exam attempt
router.post(
  "/:id/start",
  authenticateStudent,
  attemptController.startAttempt
);

// Get attempt details (resume exam)
router.get(
  "/attempt/:id",
  authenticateStudent,
  attemptController.getAttempt
);

// Submit/save response
router.put(
  "/attempt/:id/response",
  authenticateStudent,
  attemptController.submitResponse
);

// Submit exam
router.post(
  "/attempt/:id/submit",
  authenticateStudent,
  attemptController.submitExam
);

// Get attempt result
router.get(
  "/attempt/:id/result",
  authenticateStudent,
  attemptController.getAttemptResult
);

// Log tab switch (for anti-cheating)
router.post(
  "/attempt/:id/tab-switch",
  authenticateStudent,
  attemptController.logTabSwitch
);

// Get all exam results for student (grouped by subject)
router.get(
  "/results",
  authenticateStudent,
  attemptController.getAllResults
);

module.exports = router;
