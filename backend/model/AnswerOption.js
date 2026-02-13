const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const AnswerOption = sequelize.define(
  "AnswerOption",
  {
    option_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    question_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "questions",
        key: "question_id",
      },
    },

    // Option content
    option_text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    option_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },

    // Correctness
    is_correct: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // Feedback for this option (shown when selected)
    feedback: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // Media
    image_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: "answer_options",
    timestamps: true,
    indexes: [
      { fields: ["question_id"] },
      { fields: ["question_id", "option_order"] },
    ],
  }
);

module.exports = AnswerOption;
