// routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
<<<<<<< HEAD:backend/routes/employee/employeeRoutes.js
const employeeController = require('../../controllers/employee/employeeController');
const { authenticateToken, authorizeOwnerOrAdmin, authorizeRoles } = require('../../middleware/employeeAuth');
=======
const employeeController = require('../../../controllers/employee/employeeController');
const { authenticateToken, authorizeOwnerOrAdmin, authorizeRoles } = require('../../../middleware/employeeAuth');
const classSubjectController = require('../../../controllers/class/classSubjectController');
>>>>>>> e632a225d24350b9c49a95d572ae883a5528feae:backend/routes/attendance/employee/employeeRoutes.js

// CREATE
router.post('/admin', employeeController.createAdminEmployee);
router.post('/', authenticateToken, authorizeRoles('admin') ,employeeController.createEmployee);

// READ
router.get('/',authenticateToken, authorizeRoles('admin'), employeeController.getAllEmployees);
router.get('/search', employeeController.searchEmployees);
router.get('/me/subjects', authenticateToken, authorizeRoles('teacher', 'admin'), classSubjectController.getMyTeachingSubjects);
router.get('/:id', employeeController.getEmployeeById);

// UPDATE
router.put('/:id', employeeController.updateEmployee);
router.patch('/:id', employeeController.updateEmployee);

// DELETE
router.delete('/:id',authenticateToken, authorizeRoles('admin'), employeeController.deleteEmployee);

module.exports = router;
