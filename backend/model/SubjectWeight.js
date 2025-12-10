const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const SubjectWeight = sequelize.define(
  "SubjectWeight",
  {
    weight_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    sbj_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Subject",
        key: "sbj_id",
      },
    },
    assessment_weight: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 30, // default 30% for assessment
    },
    exam_weight: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 70, // default 70% for exam
    },
  },
  { tableName: "SubjectWeight", timestamps: true }
);

module.exports = SubjectWeight;
