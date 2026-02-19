const express = require("express");
const router = express.Router();
const resumeRequestController = require("../../controllers/exam/resumeRequestController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../../middleware/employeeAuth");

// ============================================
// RESUME REQUEST ROUTES (Teacher/Admin)
// ============================================

// Get pending resume requests
router.get(
  "/pending",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  resumeRequestController.getPendingRequests
);

// Get count of pending requests (for badge)
router.get(
  "/count",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  resumeRequestController.getPendingCount
);

// Approve a resume request
router.post(
  "/:id/approve",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  resumeRequestController.approveRequest
);

// Decline a resume request
router.post(
  "/:id/decline",
  authenticateToken,
  authorizeRoles("admin", "teacher"),
  resumeRequestController.declineRequest
);

module.exports = router;
