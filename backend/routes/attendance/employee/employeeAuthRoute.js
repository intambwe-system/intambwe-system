// routes/employeeAuthRoutes.js
const express = require("express");
const router = express.Router();
const employeeAuthController = require("../../../controllers/employee/employeeAuthController");
const authMiddleware = require("../../../middleware/employeeAuth");

// Public routes (no authentication required)

// POST /api/auth/login - Login employee
router.post("/login", employeeAuthController.login);

// POST /api/auth/google - Login employee with Google
router.post("/google", employeeAuthController.googleLogin);

// POST /api/auth/refresh-token - Refresh access token
router.post("/refresh-token", employeeAuthController.refreshToken);

// POST /api/auth/forgot-password - Request password reset
router.post("/forgot-password", employeeAuthController.forgotPassword);

// POST /api/auth/reset-password - Reset password with token
router.post("/reset-password", employeeAuthController.resetPassword);

// Protected routes (authentication required)

// POST /api/auth/logout - Logout employee
router.post(
  "/logout",
  authMiddleware.authenticateToken,
  employeeAuthController.logout
);

// GET /api/auth/profile - Get current employee profile
router.get(
  "/profile",
  authMiddleware.authenticateToken,
  employeeAuthController.getProfile
);

// POST /api/auth/change-password - Change current employee password
router.post(
  "/change-password",
  authMiddleware.authenticateToken,
  employeeAuthController.changePassword
);

// GET /api/auth/verify-token - Verify if token is valid
router.get(
  "/verify-token",
  authMiddleware.authenticateToken,
  employeeAuthController.verifyToken
);

module.exports = router;
