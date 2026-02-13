const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Exam = sequelize.define(
  "Exam",
  {
    exam_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    uuid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      unique: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // References to existing models
    sbj_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Subject",
        key: "sbj_id",
      },
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "Class",
        key: "class_id",
      },
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Employee",
        key: "emp_id",
      },
    },

    // Exam Configuration
    exam_mode: {
      type: DataTypes.ENUM("graded", "survey", "practice"),
      defaultValue: "graded",
    },
    status: {
      type: DataTypes.ENUM("draft", "published", "archived"),
      defaultValue: "draft",
    },

    // Timing
    has_time_limit: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    time_limit_minutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    auto_submit_on_timeout: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    timer_warning_minutes: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
    },

    // Scheduling
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    // Attempts
    max_attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },

    // Grading
    pass_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 50.0,
    },
    total_points: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },

    // Randomization
    randomize_questions: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    randomize_options: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // Results Display
    show_results_immediately: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    show_correct_answers: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    show_explanations: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    // Security
    access_password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    detect_tab_switch: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    max_tab_switches: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
    },

    // Public/Non-Student Access
    allow_non_students: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Allow non-registered users to take this exam",
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Exam is accessible via public link without login",
    },
    require_participant_info: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Require name, email, phone from non-students",
    },

    // Metadata
    ac_year: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    semester: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },

    // Statistics
    attempt_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: "exams",
    timestamps: true,
    indexes: [
      { fields: ["uuid"] },
      { fields: ["created_by"] },
      { fields: ["status"] },
      { fields: ["sbj_id"] },
      { fields: ["class_id"] },
      { fields: ["start_date", "end_date"] },
    ],
  }
);

module.exports = Exam;
