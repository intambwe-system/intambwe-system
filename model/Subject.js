
// models/Subject.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subject = sequelize.define('Subject', {
  sbj_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  sbj_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  sbj_credit: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  sbj_totalmax: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  sbj_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Employee',
      key: 'emp_id'
    }
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Class',
      key: 'class_id'
    }
  },
  dpt_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Department',
      key: 'dpt_id'
    }
  }
}, {
  tableName: 'Subject',
  timestamps: false,
  indexes: [
    {
      name: 'idx_subject_teacher',
      fields: ['teacher_id']
    }
  ]
});

module.exports = Subject;
