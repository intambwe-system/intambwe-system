// models/ClassSubject.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClassSubject = sequelize.define('ClassSubject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Class',
      key: 'class_id',
    },
  },
  sbj_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Subject',
      key: 'sbj_id',
    },
  },
  teacher_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Employee',
      key: 'emp_id',
    },
  },
  credit: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  total_max: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'ClassSubject',
  timestamps: true,
  indexes: [
    {
      unique: true,
      name: 'uniq_class_subject',
      fields: ['class_id', 'sbj_id'],
    },
    {
      name: 'idx_classsubject_class',
      fields: ['class_id'],
    },
    {
      name: 'idx_classsubject_subject',
      fields: ['sbj_id'],
    },
    {
      name: 'idx_classsubject_teacher',
      fields: ['teacher_id'],
    },
  ],
});

module.exports = ClassSubject;
