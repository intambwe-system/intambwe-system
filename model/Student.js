// models/Student.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Student = sequelize.define('Student', {
  std_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  std_fname: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  std_lname: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  std_email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  std_dob: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  std_gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: true
  },
  std_grade: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  class_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Class',
      key: 'class_id'
    }
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true
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
  tableName: 'Student',
  timestamps: false,
  indexes: [
    {
      name: 'idx_student_class',
      fields: ['class_id']
    }
  ]
});

module.exports = Student;