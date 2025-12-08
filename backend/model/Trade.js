const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Trade = sequelize.define(
  "Trade",
  {
    trade_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    trade_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    trade_description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "Trade",
    timestamps: false,
  }
);

module.exports = Trade;
