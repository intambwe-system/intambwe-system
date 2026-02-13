// controllers/studentController.js

const {  Student,Class } = require('../../model');
const { Op } = require('sequelize');
const emailService = require('../../services/emailService');
const bcrypt = require('bcryptjs');
const { generateSecurePassword } = require('../../middleware/studentAuth');



const studentController = {
  // CREATE - Add new student
    async createStudent(req, res) {
    try {
      const studentData = req.body;

      console.log(studentData);
      

      // Validate required fields
      if (!studentData.std_fname || !studentData.std_lname) {
        return res.status(400).json({
          success: false,
          message: 'First name and last name are required'
        });
      }

      // Validate email format
      if (studentData.std_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(studentData.std_email)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid email format'
          });
        }

        const existing = await Student.findOne({
          where: { std_email: studentData.std_email },
        });

        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Email already exists',
          });
        }
      }

      // Validate class
      if (studentData.class_id) {
        const classExists = await Class.findByPk(studentData.class_id);
        if (!classExists) {
          return res.status(404).json({
            success: false,
            message: 'Class not found',
          });
        }
      }

      // Generate temporary password (8 characters for easy admin sharing)
      // const tempPassword = generateSecurePassword(8);
      const tempPassword = 'student123';

      // Hash password before saving
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Create student with temp password (no email sent)
      const newStudent = await Student.create({
        ...studentData,
        std_password: hashedPassword,
        temp_password: tempPassword, // Store plain text for admin reference
        password_changed: false, // Will be set to true when student changes password
      });

      return res.status(201).json({
        success: true,
        message: 'Student created successfully. Temporary password generated.',
        data: {
          ...newStudent.toJSON(),
          temp_password: tempPassword, // Return temp password for admin to share with student
        },
      });

    } catch (error) {
      console.error('Error creating student:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },

  // READ - Get all students
  async getAllStudents(req, res) {
    try {
      const { 
        class_id, 
        dpt_id, 
        gender, 
        page = 1, 
        limit = 1000 
      } = req.query;

      // Build where clause
      const whereClause = {};
      if (class_id) whereClause.class_id = class_id;
      if (dpt_id) whereClause.dpt_id = dpt_id;
      if (gender) whereClause.std_gender = gender;

      // Calculate pagination
      const offset = (page - 1) * limit;

      // Fetch students with pagination
      const { count, rows } = await Student.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Class,
            attributes: ['class_id', 'class_name']
          },
          
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['std_id', 'DESC']]
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
      console.error('Error fetching students:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // READ - Get student by ID
  async getStudentById(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID'
        });
      }

      const student = await Student.findByPk(id, {
        include: [
          {
            model: Class,
            attributes: ['class_id', 'class_name']
          },
          
        ]
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: student
      });

    } catch (error) {
      console.error('Error fetching student:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // READ - Get students by class
  async getStudentsByClass(req, res) {
    try {
      const { class_id } = req.params;

      // Validate class_id
      if (!class_id || isNaN(class_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid class ID'
        });
      }

      const students = await Student.findAll({
        where: { class_id },
        include: [
          {
            model: Class,
            attributes: ['class_id', 'class_name']
          },
          
        ],
        order: [['std_lname', 'ASC'], ['std_fname', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: students,
        count: students.length
      });

    } catch (error) {
      console.error('Error fetching students by class:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // UPDATE - Update student
  async updateStudent(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID'
        });
      }

      // Find student
      const student = await Student.findByPk(id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Validate email if being updated
      if (updateData.std_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.std_email)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid email format'
          });
        }

        // Check if email is being updated and already exists
        if (updateData.std_email !== student.std_email) {
          const existingStudent = await Student.findOne({
            where: { std_email: updateData.std_email }
          });
          if (existingStudent) {
            return res.status(409).json({
              success: false,
              message: 'Email already exists'
            });
          }
        }
      }

      // Check if class exists (if being updated)
      if (updateData.class_id) {
        const classExists = await Class.findByPk(updateData.class_id);
        if (!classExists) {
          return res.status(404).json({
            success: false,
            message: 'Class not found'
          });
        }
      }

      
      // Update student
      await student.update(updateData);

      // Fetch updated student with relations
      const updatedStudent = await Student.findByPk(id, {
        include: [
          {
            model: Class,
            attributes: ['class_id', 'class_name']
          },
          
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Student updated successfully',
        data: updatedStudent
      });

    } catch (error) {
      console.error('Error updating student:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // DELETE - Delete student
  async deleteStudent(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID'
        });
      }

      // Find student
      const student = await Student.findByPk(id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Delete student
      await student.destroy();

      return res.status(200).json({
        success: true,
        message: 'Student deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting student:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // SEARCH - Search students
  async searchStudents(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const students = await Student.findAll({
        where: {
          [Op.or]: [
            { std_fname: { [Op.like]: `%${query}%` } },
            { std_lname: { [Op.like]: `%${query}%` } },
            { std_email: { [Op.like]: `%${query}%` } }
          ]
        },
        include: [
          {
            model: Class,
            attributes: ['class_id', 'class_name']
          },
          
        ],
        limit: 20,
        order: [['std_lname', 'ASC'], ['std_fname', 'ASC']]
      });

      return res.status(200).json({
        success: true,
        data: students,
        count: students.length
      });

    } catch (error) {
      console.error('Error searching students:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET STATISTICS - Get student statistics
  async getStudentStats(req, res) {
    try {
      const totalStudents = await Student.count();

      const studentsByGender = await Student.findAll({
        attributes: [
          'std_gender',
          [sequelize.fn('COUNT', sequelize.col('std_id')), 'count']
        ],
        group: ['std_gender'],
        raw: true
      });

      const studentsByClass = await Student.findAll({
        attributes: [
          'class_id',
          [sequelize.fn('COUNT', sequelize.col('std_id')), 'count']
        ],
        include: [{
          model: Class,
          attributes: ['class_name']
        }],
        group: ['class_id'],
        raw: true
      });

      return res.status(200).json({
        success: true,
        data: {
          total: totalStudents,
          byGender: studentsByGender,
          byClass: studentsByClass
        }
      });

    } catch (error) {
      console.error('Error fetching student statistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = studentController;