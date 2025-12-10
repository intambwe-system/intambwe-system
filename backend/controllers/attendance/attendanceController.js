// controllers/attendance/attendanceController.js
const { Attendance, Student, Class, Employee } = require('../../model');
const { Op } = require('sequelize');
const sequelize = require('../../config/database');

const attendanceController = {
  // Record new attendance
  async recordAttendance(req, res) {
    try {
      const { student_id, class_id, emp_id, date, time_in, time_out, status, method } = req.body;

      // Validation
      if (!student_id || !class_id || !date || !time_in || !status) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: student_id, class_id, date, time_in, status'
        });
      }

      // Verify student exists
      const student = await Student.findByPk(student_id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Verify class exists
      const classObj = await Class.findByPk(class_id);
      if (!classObj) {
        return res.status(404).json({
          success: false,
          message: 'Class not found'
        });
      }

      // Check if attendance already exists for this student on this date
      const existing = await Attendance.findOne({
        where: {
          student_id,
          class_id,
          date
        }
      });

      if (existing) {
        // Update existing record
        await existing.update({
          emp_id,
          time_in,
          time_out,
          status,
          method
        });

        return res.status(200).json({
          success: true,
          message: 'Attendance updated successfully',
          data: existing
        });
      }

      // Create new attendance record
      const attendance = await Attendance.create({
        student_id,
        class_id,
        emp_id,
        date,
        time_in,
        time_out,
        status,
        method: method || 'manual'
      });

      return res.status(201).json({
        success: true,
        message: 'Attendance recorded successfully',
        data: attendance
      });
    } catch (error) {
      console.error('Error recording attendance:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get attendance with filters
  async getAttendance(req, res) {
    try {
      const {
        student_id,
        class_id,
        emp_id,
        status,
        method,
        start_date,
        end_date,
        page = 1,
        limit = 20
      } = req.query;

      const whereClause = {};
      
      if (student_id) whereClause.student_id = student_id;
      if (class_id) whereClause.class_id = class_id;
      if (emp_id) whereClause.emp_id = emp_id;
      if (status) whereClause.status = status;
      if (method) whereClause.method = method;

      if (start_date || end_date) {
        whereClause.date = {};
        if (start_date) whereClause.date[Op.gte] = start_date;
        if (end_date) whereClause.date[Op.lte] = end_date;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await Attendance.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['std_id', 'std_fname', 'std_mname', 'std_lname', 'std_email']
          },
          {
            model: Class,
            as: 'class',
            attributes: ['class_id', 'class_name']
          },
          {
            model: Employee,
            as: 'recordedBy',
            attributes: ['emp_id', 'emp_name', 'emp_role']
          }
        ],
        order: [['date', 'DESC'], ['time_in', 'ASC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
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
      console.error('Error fetching attendance:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get single attendance by ID
  async getAttendanceById(req, res) {
    try {
      const { id } = req.params;

      const attendance = await Attendance.findByPk(id, {
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['std_id', 'std_fname', 'std_mname', 'std_lname', 'std_email', 'std_phone']
          },
          {
            model: Class,
            as: 'class',
            attributes: ['class_id', 'class_name']
          },
          {
            model: Employee,
            as: 'recordedBy',
            attributes: ['emp_id', 'emp_name', 'emp_role', 'emp_email']
          }
        ]
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: attendance
      });
    } catch (error) {
      console.error('Error fetching attendance:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Update attendance
  async updateAttendance(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const attendance = await Attendance.findByPk(id);
      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }

      await attendance.update(updateData);

      const updated = await Attendance.findByPk(id, {
        include: [
          { model: Student, as: 'student' },
          { model: Class, as: 'class' },
          { model: Employee, as: 'recordedBy' }
        ]
      });

      return res.status(200).json({
        success: true,
        message: 'Attendance updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('Error updating attendance:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Delete attendance
  async deleteAttendance(req, res) {
    try {
      const { id } = req.params;

      const attendance = await Attendance.findByPk(id);
      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: 'Attendance record not found'
        });
      }

      await attendance.destroy();

      return res.status(200).json({
        success: true,
        message: 'Attendance record deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting attendance:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Get student attendance summary
  async getStudentAttendanceSummary(req, res) {
    try {
      const { student_id } = req.params;
      const { start_date, end_date } = req.query;

      const whereClause = { student_id };
      
      if (start_date || end_date) {
        whereClause.date = {};
        if (start_date) whereClause.date[Op.gte] = start_date;
        if (end_date) whereClause.date[Op.lte] = end_date;
      }

      const records = await Attendance.findAll({ where: whereClause });

      const summary = {
        total: records.length,
        present: records.filter(r => r.status === 'present').length,
        absent: records.filter(r => r.status === 'absent').length,
        late: records.filter(r => r.status === 'late').length,
        attendanceRate: records.length > 0 
          ? ((records.filter(r => r.status === 'present' || r.status === 'late').length / records.length) * 100).toFixed(2)
          : 0
      };

      return res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching student summary:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Group by Class
  async getAttendanceByClass(req, res) {
    try {
      const { start_date, end_date, status } = req.query;

      const whereClause = {};
      if (status) whereClause.status = status;
      if (start_date || end_date) {
        whereClause.date = {};
        if (start_date) whereClause.date[Op.gte] = start_date;
        if (end_date) whereClause.date[Op.lte] = end_date;
      }

      const results = await Attendance.findAll({
        where: whereClause,
        attributes: [
          'class_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_records'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'present' THEN 1 END")), 'present_count'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'absent' THEN 1 END")), 'absent_count'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'late' THEN 1 END")), 'late_count']
        ],
        include: [
          {
            model: Class,
            as: 'class',
            attributes: ['class_id', 'class_name']
          }
        ],
        group: ['class_id', 'class.class_id'],
        raw: false
      });

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error fetching attendance by class:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Group by Date
  async getAttendanceByDate(req, res) {
    try {
      const { start_date, end_date, class_id, status } = req.query;

      const whereClause = {};
      if (class_id) whereClause.class_id = class_id;
      if (status) whereClause.status = status;
      if (start_date || end_date) {
        whereClause.date = {};
        if (start_date) whereClause.date[Op.gte] = start_date;
        if (end_date) whereClause.date[Op.lte] = end_date;
      }

      const results = await Attendance.findAll({
        where: whereClause,
        attributes: [
          'date',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_records'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'present' THEN 1 END")), 'present_count'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'absent' THEN 1 END")), 'absent_count'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status = 'late' THEN 1 END")), 'late_count']
        ],
        group: ['date'],
        order: [['date', 'DESC']],
        raw: true
      });

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error fetching attendance by date:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Group by Student
  async getAttendanceByStudent(req, res) {
    try {
      const { start_date, end_date, class_id, status } = req.query;

      const whereClause = {};
      if (class_id) whereClause.class_id = class_id;
      if (status) whereClause.status = status;
      if (start_date || end_date) {
        whereClause.date = {};
        if (start_date) whereClause.date[Op.gte] = start_date;
        if (end_date) whereClause.date[Op.lte] = end_date;
      }

      const results = await Attendance.findAll({
        where: whereClause,
        attributes: [
          'student_id',
          [sequelize.fn('COUNT', sequelize.col('Attendance.id')), 'total_records'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN Attendance.status = 'present' THEN 1 END")), 'present_count'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN Attendance.status = 'absent' THEN 1 END")), 'absent_count'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN Attendance.status = 'late' THEN 1 END")), 'late_count']
        ],
        include: [
          {
            model: Student,
            as: 'student',
            attributes: ['std_id', 'std_fname', 'std_mname', 'std_lname', 'std_email']
          }
        ],
        group: ['student_id', 'student.std_id'],
        raw: false
      });

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error fetching attendance by student:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Group by Employee
  async getAttendanceByEmployee(req, res) {
    try {
      const { start_date, end_date, status } = req.query;

      const whereClause = {};
      if (status) whereClause.status = status;
      if (start_date || end_date) {
        whereClause.date = {};
        if (start_date) whereClause.date[Op.gte] = start_date;
        if (end_date) whereClause.date[Op.lte] = end_date;
      }

      const results = await Attendance.findAll({
        where: whereClause,
        attributes: [
          'emp_id',
          [sequelize.fn('COUNT', sequelize.col('Attendance.id')), 'total_records'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN Attendance.status = 'present' THEN 1 END")), 'present_count'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN Attendance.status = 'absent' THEN 1 END")), 'absent_count'],
          [sequelize.fn('COUNT', sequelize.literal("CASE WHEN Attendance.status = 'late' THEN 1 END")), 'late_count']
        ],
        include: [
          {
            model: Employee,
            as: 'recordedBy',
            attributes: ['emp_id', 'emp_name', 'emp_role', 'emp_email']
          }
        ],
        group: ['emp_id', 'recordedBy.emp_id'],
        raw: false
      });

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error fetching attendance by employee:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Group by Status
  async getAttendanceByStatus(req, res) {
    try {
      const { start_date, end_date, class_id } = req.query;

      const whereClause = {};
      if (class_id) whereClause.class_id = class_id;
      if (start_date || end_date) {
        whereClause.date = {};
        if (start_date) whereClause.date[Op.gte] = start_date;
        if (end_date) whereClause.date[Op.lte] = end_date;
      }

      const results = await Attendance.findAll({
        where: whereClause,
        attributes: [
          'status',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      });

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error fetching attendance by status:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // Group by Method
  async getAttendanceByMethod(req, res) {
    try {
      const { start_date, end_date, class_id } = req.query;

      const whereClause = {};
      if (class_id) whereClause.class_id = class_id;
      if (start_date || end_date) {
        whereClause.date = {};
        if (start_date) whereClause.date[Op.gte] = start_date;
        if (end_date) whereClause.date[Op.lte] = end_date;
      }

      const results = await Attendance.findAll({
        where: whereClause,
        attributes: [
          'method',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['method'],
        raw: true
      });

      return res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error fetching attendance by method:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = attendanceController;