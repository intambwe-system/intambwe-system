const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const GuestParticipant = sequelize.define(
  "GuestParticipant",
  {
    guest_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },

    // Participant Info
    full_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    // Session token for tracking
    session_token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },

    // IP and device info for security
    ip_address: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "guest_participants",
    timestamps: true,
    indexes: [
      { fields: ["uuid"] },
      { fields: ["email"] },
      { fields: ["session_token"], unique: true },
    ],
  }
);

module.exports = GuestParticipant;
