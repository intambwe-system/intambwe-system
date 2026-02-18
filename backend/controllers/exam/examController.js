const {
  Exam,
  Question,
  AnswerOption,
  ExamAttempt,
  Subject,
  Class,
  Employee,
  Student,
} = require("../../model");
const { Op } = require("sequelize");

// Create a new exam
const createExam = async (req, res) => {
  try {
    const {
      title,
      description,
      instructions,
      sbj_id,
      class_id,
      exam_mode,
      has_time_limit,
      time_limit_minutes,
      auto_submit_on_timeout,
      timer_warning_minutes,
      start_date,
      end_date,
      max_attempts,
      total_points,
      pass_percentage,
      randomize_questions,
      randomize_options,
      show_results_immediately,
      show_correct_answers,
      show_explanations,
      access_password,
      detect_tab_switch,
      max_tab_switches,
      ac_year,
      semester,
      is_public,
      allow_non_students,
      require_participant_info,
      assessment_type,
    } = req.body;

    const created_by = req.employee.emp_id;

    const exam = await Exam.create({
      title,
      description,
      instructions,
      sbj_id,
      class_id,
      created_by,
      exam_mode: exam_mode || "graded",
      status: "draft",
      has_time_limit: has_time_limit || false,
      time_limit_minutes,
      auto_submit_on_timeout: auto_submit_on_timeout !== false,
      timer_warning_minutes: timer_warning_minutes || 5,
      start_date,
      end_date,
      max_attempts: max_attempts || 1,
      total_points: total_points || null,
      pass_percentage: pass_percentage || 50,
      randomize_questions: randomize_questions || false,
      randomize_options: randomize_options || false,
      show_results_immediately: show_results_immediately || false,
      show_correct_answers: show_correct_answers || false,
      show_explanations: show_explanations || false,
      access_password,
      detect_tab_switch: detect_tab_switch || false,
      max_tab_switches: max_tab_switches || 3,
      ac_year,
      semester,
      is_public: is_public || false,
      allow_non_students: allow_non_students || false,
      require_participant_info: require_participant_info ?? true,
      assessment_type: assessment_type || null,
    });

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      data: exam,
    });
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create exam",
      error: error.message,
    });
  }
};

// Get all exams (with filters)
const getAllExams = async (req, res) => {
  try {
    const { status, sbj_id, class_id, created_by, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) where.status = status;
    if (sbj_id) where.sbj_id = sbj_id;
    if (class_id) where.class_id = class_id;
    if (created_by) where.created_by = created_by;

    // If teacher, only show their exams
    if (req.employee.emp_role === "teacher") {
      where.created_by = req.employee.emp_id;
    }

    const { count, rows: exams } = await Exam.findAndCountAll({
      where,
      include: [
        { model: Subject, as: "subject", attributes: ["sbj_id", "sbj_name", "sbj_code"] },
        { model: Class, as: "class", attributes: ["class_id", "class_name"] },
        { model: Employee, as: "creator", attributes: ["emp_id", "emp_name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: exams,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exams",
      error: error.message,
    });
  }
};

// Get single exam by ID
const getExamById = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Exam.findByPk(id, {
      include: [
        { model: Subject, as: "subject", attributes: ["sbj_id", "sbj_name", "sbj_code"] },
        { model: Class, as: "class", attributes: ["class_id", "class_name"] },
        { model: Employee, as: "creator", attributes: ["emp_id", "emp_name"] },
        {
          model: Question,
          include: [{ model: AnswerOption, order: [["option_order", "ASC"]] }],
          order: [["question_order", "ASC"]],
        },
      ],
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    res.json({
      success: true,
      data: exam,
    });
  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam",
      error: error.message,
    });
  }
};

// Update exam
const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findByPk(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check ownership or admin
    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this exam",
      });
    }

    // Don't allow updating published exams (except status)
    if (exam.status === "published" && req.body.status !== "archived") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify a published exam. Archive it first.",
      });
    }

    await exam.update(req.body);

    res.json({
      success: true,
      message: "Exam updated successfully",
      data: exam,
    });
  } catch (error) {
    console.error("Error updating exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update exam",
      error: error.message,
    });
  }
};

// Delete exam
const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { force } = req.query;
    const exam = await Exam.findByPk(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check ownership or admin
    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this exam",
      });
    }

    // Check if exam has attempts
    const attemptCount = await ExamAttempt.count({ where: { exam_id: id } });
    if (attemptCount > 0 && force !== 'true') {
      return res.status(400).json({
        success: false,
        message: `Cannot delete exam with ${attemptCount} existing attempt(s). Use force=true to delete anyway, or archive it instead.`,
        attemptCount,
      });
    }

    // If force delete, also delete related attempts and responses
    if (attemptCount > 0 && force === 'true') {
      const { StudentResponse } = require("../../model");
      const attempts = await ExamAttempt.findAll({ where: { exam_id: id } });
      for (const attempt of attempts) {
        await StudentResponse.destroy({ where: { attempt_id: attempt.attempt_id } });
      }
      await ExamAttempt.destroy({ where: { exam_id: id } });
    }

    // Delete questions and answer options
    const { Question, AnswerOption } = require("../../model");
    const questions = await Question.findAll({ where: { exam_id: id } });
    for (const question of questions) {
      await AnswerOption.destroy({ where: { question_id: question.question_id } });
    }
    await Question.destroy({ where: { exam_id: id } });

    await exam.destroy();

    res.json({
      success: true,
      message: "Exam deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete exam",
      error: error.message,
    });
  }
};

// Publish exam
const publishExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findByPk(id, {
      include: [{ model: Question }],
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check ownership or admin
    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to publish this exam",
      });
    }

    // Validate exam has questions
    if (!exam.Questions || exam.Questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot publish exam without questions",
      });
    }

    // Calculate total points
    const totalPoints = exam.Questions.reduce(
      (sum, q) => sum + parseFloat(q.points || 0),
      0
    );

    await exam.update({
      status: "published",
      total_points: totalPoints,
    });

    res.json({
      success: true,
      message: "Exam published successfully",
      data: exam,
    });
  } catch (error) {
    console.error("Error publishing exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish exam",
      error: error.message,
    });
  }
};

// Unpublish exam (revert to draft)
const unpublishExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findByPk(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check ownership or admin
    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to unpublish this exam",
      });
    }

    if (exam.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Exam is not published",
      });
    }

    // Check if there are any attempts
    const attemptCount = await ExamAttempt.count({ where: { exam_id: id } });
    if (attemptCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot unpublish exam with ${attemptCount} existing attempt(s). Archive it instead.`,
        attemptCount,
      });
    }

    await exam.update({ status: "draft" });

    res.json({
      success: true,
      message: "Exam unpublished successfully. You can now edit it.",
      data: exam,
    });
  } catch (error) {
    console.error("Error unpublishing exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unpublish exam",
      error: error.message,
    });
  }
};

// Archive exam
const archiveExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findByPk(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check ownership or admin
    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to archive this exam",
      });
    }

    await exam.update({ status: "archived" });

    res.json({
      success: true,
      message: "Exam archived successfully",
      data: exam,
    });
  } catch (error) {
    console.error("Error archiving exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to archive exam",
      error: error.message,
    });
  }
};

// Unarchive exam (revert to draft)
const unarchiveExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findByPk(id);

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Check ownership or admin
    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to unarchive this exam",
      });
    }

    if (exam.status !== "archived") {
      return res.status(400).json({
        success: false,
        message: "Exam is not archived",
      });
    }

    await exam.update({ status: "draft" });

    res.json({
      success: true,
      message: "Exam unarchived successfully. You can now edit it.",
      data: exam,
    });
  } catch (error) {
    console.error("Error unarchiving exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unarchive exam",
      error: error.message,
    });
  }
};

// Duplicate exam
const duplicateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const exam = await Exam.findByPk(id, {
      include: [
        {
          model: Question,
          include: [{ model: AnswerOption }],
        },
      ],
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Create new exam
    const newExam = await Exam.create({
      ...exam.toJSON(),
      exam_id: undefined,
      uuid: undefined,
      title: `${exam.title} (Copy)`,
      status: "draft",
      created_by: req.employee.emp_id,
      attempt_count: 0,
      createdAt: undefined,
      updatedAt: undefined,
    });

    // Duplicate questions and options
    for (const question of exam.Questions) {
      const newQuestion = await Question.create({
        ...question.toJSON(),
        question_id: undefined,
        uuid: undefined,
        exam_id: newExam.exam_id,
        created_by: req.employee.emp_id,
        createdAt: undefined,
        updatedAt: undefined,
      });

      // Duplicate answer options
      for (const option of question.AnswerOptions) {
        await AnswerOption.create({
          ...option.toJSON(),
          option_id: undefined,
          question_id: newQuestion.question_id,
          createdAt: undefined,
          updatedAt: undefined,
        });
      }
    }

    res.status(201).json({
      success: true,
      message: "Exam duplicated successfully",
      data: newExam,
    });
  } catch (error) {
    console.error("Error duplicating exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to duplicate exam",
      error: error.message,
    });
  }
};

// Get exam info for student (instructions page - no answers exposed)
const getExamInfoForStudent = async (req, res) => {
  try {
    const { id: examId } = req.params;
    const std_id = req.student.std_id;

    const student = await Student.findByPk(std_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const exam = await Exam.findByPk(examId, {
      include: [
        { model: Subject, as: "subject", attributes: ["sbj_id", "sbj_name", "sbj_code"] },
        { model: Question, attributes: ["question_id"] }, // Only count questions, don't expose content
      ],
      attributes: {
        exclude: ["access_password"], // Don't expose password
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Verify exam is published
    if (exam.status !== "published") {
      return res.status(400).json({
        success: false,
        message: "Exam is not available",
      });
    }

    // Check if student's class matches
    if (exam.class_id && exam.class_id !== student.class_id) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in the class for this exam",
      });
    }

    // Get attempt count
    const attemptCount = await ExamAttempt.count({
      where: { exam_id: examId, std_id },
    });

    // Check for an in-progress attempt
    const inProgressAttempt = await ExamAttempt.findOne({
      where: { exam_id: examId, std_id, status: 'in_progress' },
      attributes: ['attempt_id', 'questions_answered', 'started_at'],
    });

    console.log('getExamInfoForStudent - examId:', examId, 'std_id:', std_id, 'inProgressAttempt:', inProgressAttempt ? inProgressAttempt.toJSON() : null);

    // Return exam info with question count (not actual questions)
    res.json({
      success: true,
      data: {
        ...exam.toJSON(),
        Questions: exam.Questions ? exam.Questions.map(() => ({})) : [], // Just return count placeholder
        question_count: exam.Questions?.length || 0,
        attempts_used: attemptCount,
        can_attempt: attemptCount < exam.max_attempts,
        has_password: !!exam.access_password, // Tell if password needed without exposing it
        has_in_progress: !!inProgressAttempt,
        in_progress_attempt: inProgressAttempt
          ? {
              attempt_id: inProgressAttempt.attempt_id,
              questions_answered: inProgressAttempt.questions_answered || 0,
              started_at: inProgressAttempt.started_at,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching exam info for student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam info",
      error: error.message,
    });
  }
};

// Get available exams for students
const getAvailableExams = async (req, res) => {
  try {
    const std_id = req.student.std_id;
    const student = await Student.findByPk(std_id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const now = new Date();

    const exams = await Exam.findAll({
      where: {
        status: "published",
        is_public: false, // Hide public exams from students - they use the public link instead
        [Op.and]: [
          {
            [Op.or]: [
              { class_id: student.class_id },
              { class_id: null },
            ],
          },
          {
            [Op.or]: [
              { start_date: null },
              { start_date: { [Op.lte]: now } },
            ],
          },
          {
            [Op.or]: [
              { end_date: null },
              { end_date: { [Op.gte]: now } },
            ],
          },
        ],
      },
      include: [
        { model: Subject, as: "subject", attributes: ["sbj_id", "sbj_name", "sbj_code"] },
        { model: Employee, as: "creator", attributes: ["emp_id", "emp_name"] },
      ],
      attributes: {
        exclude: ["access_password"],
      },
    });

    // Get attempt counts for each exam
    const examsWithAttempts = await Promise.all(
      exams.map(async (exam) => {
        const attemptCount = await ExamAttempt.count({
          where: { exam_id: exam.exam_id, std_id },
        });
        const lastAttempt = await ExamAttempt.findOne({
          where: { exam_id: exam.exam_id, std_id },
          order: [["attempt_number", "DESC"]],
        });

        return {
          ...exam.toJSON(),
          attempts_used: attemptCount,
          can_attempt: attemptCount < exam.max_attempts,
          last_attempt: lastAttempt,
        };
      })
    );

    res.json({
      success: true,
      data: examsWithAttempts,
    });
  } catch (error) {
    console.error("Error fetching available exams:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available exams",
      error: error.message,
    });
  }
};

module.exports = {
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  deleteExam,
  publishExam,
  unpublishExam,
  archiveExam,
  unarchiveExam,
  duplicateExam,
  getAvailableExams,
  getExamInfoForStudent,
};
