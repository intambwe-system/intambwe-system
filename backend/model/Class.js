// models/Class.js
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Class = sequelize.define(
  "Class",
  {
    class_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      unique: true,
    },
    class_name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    RQF: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    dpt_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Department",
        key: "dpt_id",
      },
    },

    emp_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      unique: true,
      references: {
        model: "Employee",
        key: "emp_id",
      },
    },
    trade_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Trade",
        key: "trade_id",
      },
    },
  },
  {
    tableName: "Class",
    timestamps: true,
  }
);

module.exports = Class;