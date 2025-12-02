// controllers/employeeController.js
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const employeeValidator = require('../validators/employeeValidator');
const bcrypt = require('bcrypt');

const employeeController = {
  // CREATE - Add new employee
  async createEmployee(req, res) {
    try {
      const employeeData = req.body;

      // Validate input data
      const validation = employeeValidator.validateEmployeeData(employeeData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Check if email already exists
      const existingEmployee = await Employee.findOne({
        where: { emp_email: employeeData.emp_email }
      });

      if (existingEmployee) {
        return res.status(409).json({
          success: false,
          message: 'Email already exists'
        });
      }

      // Check if department exists (if provided)
      if (employeeData.dpt_id) {
        const department = await Department.findByPk(employeeData.dpt_id);
        if (!department) {
          return res.status(404).json({
            success: false,
            message: 'Department not found'
          });
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(employeeData.emp_password, 10);
      employeeData.emp_password = hashedPassword;

      // Create employee
      const newEmployee = await Employee.create(employeeData);

      // Remove password from response
      const employeeResponse = newEmployee.toJSON();
      delete employeeResponse.emp_password;

      return res.status(201).json({
        success: true,
        message: 'Employee created successfully',
        data: employeeResponse
      });

    } catch (error) {
      console.error('Error creating employee:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // READ - Get all employees
  async getAllEmployees(req, res) {
    try {
      const { role, dpt_id, page = 1, limit = 10 } = req.query;

      // Build where clause
      const whereClause = {};
      if (role) whereClause.emp_role = role;
      if (dpt_id) whereClause.dpt_id = dpt_id;

      // Calculate pagination
      const offset = (page - 1) * limit;

      // Fetch employees with pagination
      const { count, rows } = await Employee.findAndCountAll({
        where: whereClause,
        attributes: { exclude: ['emp_password'] },
        include: [{
          model: Department,
          attributes: ['dpt_id', 'dpt_name']
        }],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['emp_id', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching employees:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // READ - Get employee by ID
  async getEmployeeById(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID'
        });
      }

      const employee = await Employee.findByPk(id, {
        attributes: { exclude: ['emp_password'] },
        include: [{
          model: Department,
          attributes: ['dpt_id', 'dpt_name']
        }]
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: employee
      });

    } catch (error) {
      console.error('Error fetching employee:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // UPDATE - Update employee
  async updateEmployee(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID'
        });
      }

      // Find employee
      const employee = await Employee.findByPk(id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Validate update data
      const validation = employeeValidator.validateEmployeeData(updateData, true);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Check if email is being updated and already exists
      if (updateData.emp_email && updateData.emp_email !== employee.emp_email) {
        const existingEmployee = await Employee.findOne({
          where: { emp_email: updateData.emp_email }
        });
        if (existingEmployee) {
          return res.status(409).json({
            success: false,
            message: 'Email already exists'
          });
        }
      }

      // Check if department exists (if being updated)
      if (updateData.dpt_id) {
        const department = await Department.findByPk(updateData.dpt_id);
        if (!department) {
          return res.status(404).json({
            success: false,
            message: 'Department not found'
          });
        }
      }

      // Hash password if being updated
      if (updateData.emp_password) {
        updateData.emp_password = await bcrypt.hash(updateData.emp_password, 10);
      }

      // Update employee
      await employee.update(updateData);

      // Fetch updated employee without password
      const updatedEmployee = await Employee.findByPk(id, {
        attributes: { exclude: ['emp_password'] },
        include: [{
          model: Department,
          attributes: ['dpt_id', 'dpt_name']
        }]
      });

      return res.status(200).json({
        success: true,
        message: 'Employee updated successfully',
        data: updatedEmployee
      });

    } catch (error) {
      console.error('Error updating employee:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // DELETE - Delete employee
  async deleteEmployee(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID'
        });
      }

      // Find employee
      const employee = await Employee.findByPk(id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Delete employee
      await employee.destroy();

      return res.status(200).json({
        success: true,
        message: 'Employee deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting employee:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // SEARCH - Search employees
  async searchEmployees(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const { Op } = require('sequelize');

      const employees = await Employee.findAll({
        where: {
          [Op.or]: [
            { emp_name: { [Op.like]: `%${query}%` } },
            { emp_email: { [Op.like]: `%${query}%` } },
            { emp_phoneNumber: { [Op.like]: `%${query}%` } }
          ]
        },
        attributes: { exclude: ['emp_password'] },
        include: [{
          model: Department,
          attributes: ['dpt_id', 'dpt_name']
        }],
        limit: 20
      });

      return res.status(200).json({
        success: true,
        data: employees,
        count: employees.length
      });

    } catch (error) {
      console.error('Error searching employees:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = employeeController;
