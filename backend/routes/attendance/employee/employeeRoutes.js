// routes/employeeRoutes.js
const express = require('express');
const router = express.Router();
const employeeController = require('../../../controllers/employee/employeeController');
const { authenticateToken, authorizeOwnerOrAdmin, authorizeRoles } = require('../../../middleware/employeeAuth');

// CREATE
router.post('/admin', employeeController.createAdminEmployee);
router.post('/', authenticateToken, authorizeRoles('admin') ,employeeController.createEmployee);

// READ
router.get('/',authenticateToken, authorizeRoles('admin'), employeeController.getAllEmployees);
router.get('/search', employeeController.searchEmployees);
router.get('/:id', employeeController.getEmployeeById);

// UPDATE
router.put('/:id', employeeController.updateEmployee);
router.patch('/:id', employeeController.updateEmployee);

// DELETE
router.delete('/:id',authenticateToken, authorizeRoles('admin'), employeeController.deleteEmployee);

module.exports = router;
