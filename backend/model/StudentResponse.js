const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const StudentResponse = sequelize.define(
  "StudentResponse",
  {
    response_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    // References
    attempt_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "exam_attempts",
        key: "attempt_id",
      },
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "questions",
        key: "question_id",
      },
    },

    // Response data (flexible storage for different question types)
    selected_option_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "answer_options",
        key: "option_id",
      },
      comment: "For single choice questions",
    },
    selected_option_ids: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "For multiple choice questions - array of option IDs",
    },
    text_response: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "For essay, short_answer, and fill_in_blank questions",
    },

    // Grading
    is_correct: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    points_earned: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
    },
    max_points: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },

    // Manual grading
    requires_manual_grading: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    manually_graded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    grader_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Employee",
        key: "emp_id",
      },
    },
    grader_feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    graded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Metadata
    time_spent_seconds: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    is_flagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    answered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "student_responses",
    timestamps: true,
    indexes: [
      { fields: ["attempt_id"] },
      { fields: ["question_id"] },
      { fields: ["requires_manual_grading", "manually_graded"] },
      { unique: true, fields: ["attempt_id", "question_id"] },
    ],
  }
);

module.exports = StudentResponse;
