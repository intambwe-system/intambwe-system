const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const StudentMark = sequelize.define(
  "StudentMark",
  {
    mark_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    std_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Student",
        key: "std_id",
      },
    },
    sbj_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Subject",
        key: "sbj_id",
      },
    },
    emp_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Employee",
        key: "emp_id",
      },
    },
    mark_type: {
      type: DataTypes.ENUM("assessment", "exam"),
      allowNull: false,
    },
    marks: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    weight_percentage: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 100, // teacher specifies for assessment/exam, e.g., 30 or 70
    },
    total_score: {
      type: DataTypes.FLOAT,
      allowNull: true, // calculated automatically based on weights
    },
    status: {
      type: DataTypes.ENUM("active", "archived"),
      defaultValue: "active",
    },
  },
  { tableName: "StudentMark", timestamps: true }
);

module.exports = StudentMark;
