// models/Assessment.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Assessment = sequelize.define("Assessment", {
  assessment_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sbj_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false, // Example: CAT 1, CAT 2, Final Exam
  },
  max_marks: {
    type: DataTypes.FLOAT,
    defaultValue: 100,
  },
  weight: {
    type: DataTypes.FLOAT,
    defaultValue: 0, // percentage contribution
  },
  formula: {
    type: DataTypes.STRING(255), // Example: "(marks / max_marks) * weight"
    allowNull: true,
  },
}, { tableName: "Assessment", timestamps: true });

module.exports = Assessment;
