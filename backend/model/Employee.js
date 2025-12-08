// models/Employee.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Employee = sequelize.define('Employee', {
  emp_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  emp_name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  emp_role: {
    type: DataTypes.ENUM('teacher', 'admin', 'stock_manager'),
    allowNull: false
  },
  emp_gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    allowNull: true
  },
  emp_email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  emp_phoneNumber: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  emp_password: {
    type: DataTypes.STRING(255),
    allowNull: false
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
  tableName: 'Employee',
  timestamps: false,
  indexes: [
    {
      name: 'idx_employee_role',
      fields: ['emp_role']
    }
  ]
});

module.exports = Employee;
