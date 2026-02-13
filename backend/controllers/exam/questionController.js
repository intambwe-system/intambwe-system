const { Question, AnswerOption, Exam } = require("../../model");

// Add question to exam
const addQuestion = async (req, res) => {
  try {
    const { examId } = req.params;
    const {
      question_text,
      question_type,
      points,
      question_order,
      difficulty,
      case_sensitive,
      correct_answers,
      word_limit_min,
      word_limit_max,
      requires_manual_grading,
      allow_partial_credit,
      image_url,
      explanation,
      options, // Array of answer options for MCQ/True-False
    } = req.body;

    // Verify exam exists and user has permission
    const exam = await Exam.findByPk(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to add questions to this exam",
      });
    }

    if (exam.status === "published") {
      return res.status(400).json({
        success: false,
        message: "Cannot add questions to a published exam",
      });
    }

    // Determine if manual grading is needed
    const needsManualGrading =
      requires_manual_grading ||
      question_type === "essay" ||
      question_type === "short_answer";

    // Get next question order
    const maxOrder = await Question.max("question_order", {
      where: { exam_id: examId },
    });

    const question = await Question.create({
      exam_id: examId,
      question_text,
      question_type,
      points: points || 1,
      question_order: question_order || (maxOrder || 0) + 1,
      difficulty: difficulty || "medium",
      case_sensitive: case_sensitive || false,
      correct_answers,
      word_limit_min,
      word_limit_max,
      requires_manual_grading: needsManualGrading,
      allow_partial_credit: allow_partial_credit || false,
      image_url,
      explanation,
      created_by: req.employee.emp_id,
    });

    // Create answer options if provided (for MCQ, True/False)
    if (options && options.length > 0) {
      const optionPromises = options.map((opt, index) =>
        AnswerOption.create({
          question_id: question.question_id,
          option_text: opt.option_text,
          option_order: opt.option_order || index + 1,
          is_correct: opt.is_correct || false,
          feedback: opt.feedback,
          image_url: opt.image_url,
        })
      );
      await Promise.all(optionPromises);
    }

    // Fetch question with options
    const questionWithOptions = await Question.findByPk(question.question_id, {
      include: [{ model: AnswerOption, order: [["option_order", "ASC"]] }],
    });

    res.status(201).json({
      success: true,
      message: "Question added successfully",
      data: questionWithOptions,
    });
  } catch (error) {
    console.error("Error adding question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add question",
      error: error.message,
    });
  }
};

// Get all questions for an exam
const getExamQuestions = async (req, res) => {
  try {
    const { examId } = req.params;

    const questions = await Question.findAll({
      where: { exam_id: examId },
      include: [{ model: AnswerOption, order: [["option_order", "ASC"]] }],
      order: [["question_order", "ASC"]],
    });

    res.json({
      success: true,
      data: questions,
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch questions",
      error: error.message,
    });
  }
};

// Update question
const updateQuestion = async (req, res) => {
  try {
    const { examId, id } = req.params;

    const question = await Question.findOne({
      where: { question_id: id, exam_id: examId },
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Verify exam ownership
    const exam = await Exam.findByPk(examId);
    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this question",
      });
    }

    if (exam.status === "published") {
      return res.status(400).json({
        success: false,
        message: "Cannot modify questions in a published exam",
      });
    }

    const { options, ...questionData } = req.body;

    // Update question
    await question.update(questionData);

    // Update options if provided
    if (options) {
      // Delete existing options
      await AnswerOption.destroy({ where: { question_id: id } });

      // Create new options
      const optionPromises = options.map((opt, index) =>
        AnswerOption.create({
          question_id: id,
          option_text: opt.option_text,
          option_order: opt.option_order || index + 1,
          is_correct: opt.is_correct || false,
          feedback: opt.feedback,
          image_url: opt.image_url,
        })
      );
      await Promise.all(optionPromises);
    }

    // Fetch updated question with options
    const updatedQuestion = await Question.findByPk(id, {
      include: [{ model: AnswerOption, order: [["option_order", "ASC"]] }],
    });

    res.json({
      success: true,
      message: "Question updated successfully",
      data: updatedQuestion,
    });
  } catch (error) {
    console.error("Error updating question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update question",
      error: error.message,
    });
  }
};

// Delete question
const deleteQuestion = async (req, res) => {
  try {
    const { examId, id } = req.params;

    const question = await Question.findOne({
      where: { question_id: id, exam_id: examId },
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    // Verify exam ownership
    const exam = await Exam.findByPk(examId);
    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this question",
      });
    }

    if (exam.status === "published") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete questions from a published exam",
      });
    }

    await question.destroy();

    res.json({
      success: true,
      message: "Question deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting question:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete question",
      error: error.message,
    });
  }
};

// Reorder questions
const reorderQuestions = async (req, res) => {
  try {
    const { examId } = req.params;
    const { questionIds } = req.body; // Array of question IDs in new order

    // Verify exam ownership
    const exam = await Exam.findByPk(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to reorder questions",
      });
    }

    // Update order for each question
    const updatePromises = questionIds.map((questionId, index) =>
      Question.update(
        { question_order: index + 1 },
        { where: { question_id: questionId, exam_id: examId } }
      )
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: "Questions reordered successfully",
    });
  } catch (error) {
    console.error("Error reordering questions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reorder questions",
      error: error.message,
    });
  }
};

// Add answer option
const addOption = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { option_text, option_order, is_correct, feedback, image_url } = req.body;

    const question = await Question.findByPk(questionId, {
      include: [{ model: Exam }],
    });

    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const option = await AnswerOption.create({
      question_id: questionId,
      option_text,
      option_order: option_order || 0,
      is_correct: is_correct || false,
      feedback,
      image_url,
    });

    res.status(201).json({
      success: true,
      message: "Option added successfully",
      data: option,
    });
  } catch (error) {
    console.error("Error adding option:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add option",
      error: error.message,
    });
  }
};

// Update answer option
const updateOption = async (req, res) => {
  try {
    const { questionId, optionId } = req.params;

    const option = await AnswerOption.findOne({
      where: { option_id: optionId, question_id: questionId },
    });

    if (!option) {
      return res.status(404).json({
        success: false,
        message: "Option not found",
      });
    }

    await option.update(req.body);

    res.json({
      success: true,
      message: "Option updated successfully",
      data: option,
    });
  } catch (error) {
    console.error("Error updating option:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update option",
      error: error.message,
    });
  }
};

// Delete answer option
const deleteOption = async (req, res) => {
  try {
    const { questionId, optionId } = req.params;

    const option = await AnswerOption.findOne({
      where: { option_id: optionId, question_id: questionId },
    });

    if (!option) {
      return res.status(404).json({
        success: false,
        message: "Option not found",
      });
    }

    await option.destroy();

    res.json({
      success: true,
      message: "Option deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting option:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete option",
      error: error.message,
    });
  }
};

module.exports = {
  addQuestion,
  getExamQuestions,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
  addOption,
  updateOption,
  deleteOption,
};
