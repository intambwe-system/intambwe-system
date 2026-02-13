const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Question = sequelize.define(
  "Question",
  {
    question_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    exam_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "exams",
        key: "exam_id",
      },
    },

    // Question content
    question_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    question_type: {
      type: DataTypes.ENUM(
        "multiple_choice_single",
        "multiple_choice_multiple",
        "true_false",
        "fill_in_blank",
        "short_answer",
        "essay"
      ),
      allowNull: false,
    },

    // Configuration
    points: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 1.0,
    },
    question_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    difficulty: {
      type: DataTypes.ENUM("easy", "medium", "hard"),
      defaultValue: "medium",
    },

    // For fill-in-blank
    case_sensitive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    correct_answers: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of acceptable answers for fill_in_blank type",
    },

    // For essay/short answer
    word_limit_min: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    word_limit_max: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    requires_manual_grading: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // For multiple choice
    allow_partial_credit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // Media
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },

    // Explanation shown after grading
    explanation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Creator
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Employee",
        key: "emp_id",
      },
    },
  },
  {
    tableName: "questions",
    timestamps: true,
    indexes: [
      { fields: ["uuid"] },
      { fields: ["exam_id"] },
      { fields: ["question_type"] },
      { fields: ["difficulty"] },
      { fields: ["exam_id", "question_order"] },
    ],
  }
);

module.exports = Question;
