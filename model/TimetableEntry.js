// models/TimetableEntry.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TimetableEntry = sequelize.define('TimetableEntry', {
  entry_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  timetable_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Timetable',
      key: 'timetable_id'
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
  sbj_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Subject',
      key: 'sbj_id'
    }
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Employee',
      key: 'emp_id'
    }
  },
  day_of_week: {
    type: DataTypes.ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
    allowNull: false
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  period_type: {
    type: DataTypes.ENUM('CLASS', 'BREAK', 'LUNCH', 'ASSEMBLY', 'EVENT'),
    defaultValue: 'CLASS'
  },
  attendance_required: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
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
  tableName: 'Timetable_Entry',
  timestamps: false
});

module.exports = TimetableEntry;