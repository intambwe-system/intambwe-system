const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DisciplineMarks = sequelize.define('DisciplineMarks', {
  dis_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },

  std_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Student',
      key: 'std_id'
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

  ac_year: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  semester: {
    type: DataTypes.STRING(50),
    allowNull: true
  },

  discipline_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 100
  },

  discipline_maxScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    defaultValue: 100
  },

  emp_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Employee',
      key: 'emp_id'
    }
  },

  date_recorded: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }

}, {
  tableName: 'DisciplineMarks',
  timestamps: false,
  indexes: [
    {
      name: 'idx_discipline_student',
      fields: ['std_id']
    },
    {
      name: 'unique_discipline_per_semester',
      unique: true,
      fields: ['std_id', 'semester', 'ac_year']
    }
  ]
});

module.exports = DisciplineMarks;
