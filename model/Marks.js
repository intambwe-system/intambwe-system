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
  cat_1: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  cat_2: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  cat_3: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  exam: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  total_marks: {
    type: DataTypes.VIRTUAL,
    get() {
      const cat1 = this.getDataValue('cat_1') || 0;
      const cat2 = this.getDataValue('cat_2') || 0;
      const cat3 = this.getDataValue('cat_3') || 0;
      const exam = this.getDataValue('exam') || 0;
      return parseFloat((cat1 + cat2 + cat3 + exam).toFixed(2));
    }
  },
  ac_year: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  semester: {
    type: DataTypes.STRING(20),
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
  remark: {
    type: DataTypes.TEXT,
    allowNull: true
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