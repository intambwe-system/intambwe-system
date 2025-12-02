
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
  subject_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Subject',
      key: 'sbj_id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  time_in: {
    type: DataTypes.TIME,
    allowNull: true
  },
  time_out: {
    type: DataTypes.TIME,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('PRESENT', 'ABSENT', 'LATE'),
    allowNull: false,
    defaultValue: 'ABSENT'
  },
  method: {
    type: DataTypes.ENUM('QR', 'RFID', 'FACE'),
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Attendance',
  timestamps: false
});

module.exports = Attendance;