// routes/studentAuthRoutes.js
const express = require('express');
const router = express.Router();
const studentAuthController = require('../../controllers/student/studentAuthController');
const authMiddleware = require('../../middleware/studentAuth');

// Public routes (no authentication required)

// POST /api/student-auth/login - Login student
router.post('/login', studentAuthController.login);

// POST /api/student-auth/first-login - First login with temporary password
router.post('/first-login', studentAuthController.firstLogin);

// POST /api/student-auth/google - Login student with Google
router.post('/google', studentAuthController.googleLogin);

// POST /api/student-auth/refresh-token - Refresh access token
router.post('/refresh-token', studentAuthController.refreshToken);

// POST /api/student-auth/request-password-reset - Request password reset
router.post('/request-password-reset', studentAuthController.requestPasswordReset);

// POST /api/student-auth/reset-password - Reset password with token
router.post('/reset-password', studentAuthController.resetPassword);

// Protected routes (authentication required)

// POST /api/student-auth/logout - Logout student
router.post('/logout', authMiddleware.authenticateStudent, studentAuthController.logout);

// GET /api/student-auth/profile - Get current student profile
router.get('/profile', authMiddleware.authenticateStudent, studentAuthController.getProfile);

// POST /api/student-auth/change-password - Change current student password
router.post('/change-password', authMiddleware.authenticateStudent, studentAuthController.changePassword);

// GET /api/student-auth/verify-token - Verify if token is valid
router.get('/verify-token', authMiddleware.authenticateStudent, studentAuthController.verifyToken);

// Admin/Employee protected routes (for setting up student credentials)
// Note: You'll need to import employeeAuth middleware if employees manage student accounts

// POST /api/student-auth/setup-credentials/:std_id - Setup credentials for new student
// Uncomment and add employeeAuth if needed:
// const employeeAuth = require('../../middleware/employeeAuth');
// router.post('/setup-credentials/:std_id', employeeAuth.authenticateToken, studentAuthController.setupCredentials);

module.exports = router;