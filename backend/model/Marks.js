// models/Marks.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Marks = sequelize.define('Marks', {
  mark_id: {
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

  sbj_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Subject',
      key: 'sbj_id'
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

  // ✅ Formative Assessments (multiple)
  FA: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of { score, maxScore }'
  },

  // ✅ Integrated Assessments (multiple)
  IA: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
    comment: 'Array of { score, maxScore }'
  },

  // ✅ Comprehensive Assessment (single)
  CA_score: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },

  CA_maxScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },

  ac_year: {
    type: DataTypes.STRING(100),
    allowNull: true
  },

  semester: {
    type: DataTypes.STRING(50),
    allowNull: true
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
  tableName: 'Marks',
  timestamps: false,
  indexes: [
    {
      name: 'idx_marks_student',
      fields: ['std_id']
    },
    {
      name: 'idx_marks_subject',
      fields: ['sbj_id']
    },
    {
      name: 'unique_student_subject_semester',
      unique: true,
      fields: ['std_id', 'sbj_id', 'semester', 'ac_year']
    }
  ]
});

module.exports = Marks;
