// models/Attendance.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Student',
      key: 'std_id'
    }
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Class',
      key: 'class_id'
    }
  },
  emp_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Employee',
      key: 'emp_id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  time_in: {
    type: DataTypes.TIME,
    allowNull: false
  },
  time_out: {
    type: DataTypes.TIME,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late'),
    allowNull: false,
    defaultValue: 'present'
  },
  method: {
    type: DataTypes.ENUM('QR', 'RFID', 'manual'),
    allowNull: false,
    defaultValue: 'manual'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Attendance',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      name: 'idx_attendance_student',
      fields: ['student_id']
    },
    {
      name: 'idx_attendance_class',
      fields: ['class_id']
    },
    {
      name: 'idx_attendance_emp',
      fields: ['emp_id']
    },
    {
      name: 'idx_attendance_date',
      fields: ['date']
    },
    {
      name: 'idx_attendance_student_date',
      fields: ['student_id', 'date']
    },
    {
      name: 'idx_attendance_class_date',
      fields: ['class_id', 'date']
    },
    {
      name: 'idx_attendance_status',
      fields: ['status']
    },
    {
      name: 'idx_attendance_method',
      fields: ['method']
    }
  ]
});

module.exports = Attendance;