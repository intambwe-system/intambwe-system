const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ExamAttempt = sequelize.define(
  "ExamAttempt",
  {
    attempt_id: {
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
    std_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Now optional for guest participants
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
      comment: "For non-student/guest exam takers",
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Class",
        key: "class_id",
      },
    },
    is_guest: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "True if taken by a guest (non-student)",
    },

    // Attempt info
    attempt_number: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    status: {
      type: DataTypes.ENUM("in_progress", "submitted", "auto_submitted", "graded"),
      defaultValue: "in_progress",
    },

    // Timing
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    submitted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    time_taken_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    time_remaining_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // Scoring
    total_score: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    max_score: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    grade: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },
    pass_status: {
      type: DataTypes.ENUM("passed", "failed", "pending"),
      defaultValue: "pending",
    },

    // Progress
    questions_answered: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    questions_flagged: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // Security/Integrity
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true,
    },
    user_agent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    tab_switches: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    violation_log: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Log of security violations (tab switches, copy attempts, etc.)",
    },

    // Grading
    graded_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Employee",
        key: "emp_id",
      },
    },
    graded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    instructor_feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Question order for this attempt (if randomized)
    question_order: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of question IDs in the order shown to student",
    },
  },
  {
    tableName: "exam_attempts",
    timestamps: true,
    indexes: [
      { fields: ["uuid"] },
      { fields: ["exam_id"] },
      { fields: ["std_id"] },
      { fields: ["status"] },
      { unique: true, fields: ["exam_id", "std_id", "attempt_number"] },
    ],
  }
);

module.exports = ExamAttempt;
