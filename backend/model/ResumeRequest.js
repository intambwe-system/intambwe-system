const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ResumeRequest = sequelize.define(
  "ResumeRequest",
  {
    request_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },

    // References
    exam_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "exams",
        key: "exam_id",
      },
    },
    attempt_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "exam_attempts",
        key: "attempt_id",
      },
    },
    std_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Student",
        key: "std_id",
      },
    },
    guest_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "guest_participants",
        key: "guest_id",
      },
    },

    // Requester info
    requester_type: {
      type: DataTypes.ENUM("student", "guest"),
      allowNull: false,
    },
    requester_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    requester_email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    // Status
    status: {
      type: DataTypes.ENUM("pending", "approved", "declined", "expired"),
      defaultValue: "pending",
    },

    // Timing info (from localStorage and server)
    time_remaining_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Time remaining from user's localStorage",
    },
    server_time_remaining: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Server-calculated time remaining (authoritative)",
    },
    original_started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Original exam start time",
    },
    interrupted_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the session was detected as interrupted",
    },

    // Response
    responded_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Employee",
        key: "emp_id",
      },
    },
    responded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    decline_reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Auto-expiry config (10 minutes by default)
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Request auto-declines after this time",
    },

    // Connection tracking
    socket_id: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: "Socket ID of the waiting client",
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "resume_requests",
    timestamps: true,
    indexes: [
      { fields: ["uuid"] },
      { fields: ["exam_id"] },
      { fields: ["attempt_id"] },
      { fields: ["status"] },
      { fields: ["std_id"] },
      { fields: ["guest_id"] },
      { fields: ["expires_at"] },
    ],
  }
);

module.exports = ResumeRequest;
