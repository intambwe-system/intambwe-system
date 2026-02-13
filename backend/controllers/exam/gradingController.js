const {
  Exam,
  ExamAttempt,
  StudentResponse,
  Question,
  AnswerOption,
  Student,
  Employee,
  GuestParticipant,
} = require("../../model");
const gradingService = require("../../services/exam/gradingService");
const { Op } = require("sequelize");

// Get exams pending manual grading
const getPendingGrading = async (req, res) => {
  try {
    const emp_id = req.employee.emp_id;
    const isAdmin = req.employee.emp_role === "admin";

    // Find exams with ungraded responses
    const whereClause = isAdmin ? {} : { created_by: emp_id };

    const exams = await Exam.findAll({
      where: {
        ...whereClause,
        status: "published",
      },
      include: [
        {
          model: ExamAttempt,
          where: {
            status: { [Op.in]: ["submitted", "auto_submitted"] },
          },
          required: true,
          include: [
            {
              model: StudentResponse,
              where: {
                requires_manual_grading: true,
                manually_graded: false,
              },
              required: true,
            },
            { model: GuestParticipant, as:'guest' },
            {
              model: Student,
              as: "student",
              attributes: ["std_id", "std_fname", "std_lname"],
            },
          ],
        },
      ],
    });

    // Format response
    const pendingExams = exams.map((exam) => ({
      exam_id: exam.exam_id,
      title: exam.title,
      attempts_pending: exam.ExamAttempts.length,
      total_responses_pending: exam.ExamAttempts.reduce(
        (sum, att) => sum + att.StudentResponses.length,
        0
      ),
    }));

    res.json({
      success: true,
      data: pendingExams,
    });
  } catch (error) {
    console.error("Error fetching pending grading:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending grading",
      error: error.message,
    });
  }
};

// Get all responses for an exam (for grading)
const getExamResponses = async (req, res) => {
  try {
    const { examId } = req.params;
    const { question_id, status } = req.query;

    const exam = await Exam.findByPk(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    // Verify permission
    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Build query
    const attemptWhere = { exam_id: examId };
    if (status) {
      attemptWhere.status = status;
    } else {
      attemptWhere.status = { [Op.in]: ["submitted", "auto_submitted", "graded"] };
    }

    const responseWhere = {};
    if (question_id) {
      responseWhere.question_id = question_id;
    }

    const attempts = await ExamAttempt.findAll({
      where: attemptWhere,
      include: [
        {
          model: StudentResponse,
          where: Object.keys(responseWhere).length > 0 ? responseWhere : undefined,
          required: false,
          include: [
            {
              model: Question,
              as: "question",
              include: [{ model: AnswerOption }],
            },
          ],
        },
        { model: GuestParticipant, as:'guest' },
        {
          model: Student,
          as: "student",
          attributes: ["std_id", "std_fname", "std_lname", "std_email"],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        exam: {
          exam_id: exam.exam_id,
          title: exam.title,
        },
        attempts,
      },
    });
  } catch (error) {
    console.error("Error fetching exam responses:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam responses",
      error: error.message,
    });
  }
};

// Grade a single response
const gradeResponse = async (req, res) => {
  try {
    const { responseId } = req.params;
    const { points_earned, feedback } = req.body;

    if (points_earned === undefined) {
      return res.status(400).json({
        success: false,
        message: "points_earned is required",
      });
    }

    const response = await StudentResponse.findByPk(responseId, {
      include: [
        { model: Question, as: "question" },
        {
          model: ExamAttempt,
          as: "attempt",
          include: [{ model: Exam, as: "exam" }],
        },
      ],
    });

    if (!response) {
      return res.status(404).json({
        success: false,
        message: "Response not found",
      });
    }

    // Verify permission
    const exam = response.attempt.exam;
    if (exam.created_by !== req.employee.emp_id && req.employee.emp_role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to grade this response",
      });
    }

    // Grade the response
    await gradingService.gradeResponseManually(
      responseId,
      points_earned,
      feedback,
      req.employee.emp_id
    );

    // Fetch updated response
    const updatedResponse = await StudentResponse.findByPk(responseId, {
      include: [
        { model: Question, as: "question" },
        { model: Employee, as: "grader", attributes: ["emp_id", "emp_name"] },
      ],
    });

    res.json({
      success: true,
      message: "Response graded successfully",
      data: updatedResponse,
    });
  } catch (error) {
    console.error("Error grading response:", error);
    res.status(500).json({
      success: false,
      message: "Failed to grade response",
      error: error.message,
    });
  }
};

// Finalize grading for an attempt
const finalizeAttemptGrading = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { feedback } = req.body;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [{ model: Exam, as: "exam" }],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify permission
    if (
      attempt.exam.created_by !== req.employee.emp_id &&
      req.employee.emp_role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    await gradingService.finalizeGrading(attemptId, feedback, req.employee.emp_id);

    const updatedAttempt = await ExamAttempt.findByPk(attemptId, {
      include: [
        { model: Student, as: "student" },
        { model: GuestParticipant, as:'guest' },
        { model: Employee, as: "grader", attributes: ["emp_id", "emp_name"] },
      ],
    });

    res.json({
      success: true,
      message: "Grading finalized successfully",
      data: updatedAttempt,
    });
  } catch (error) {
    console.error("Error finalizing grading:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to finalize grading",
    });
  }
};

// Bulk grade responses (apply same score/feedback to multiple)
const bulkGradeResponses = async (req, res) => {
  try {
    const { response_ids, points_earned, feedback } = req.body;

    if (!response_ids || !Array.isArray(response_ids) || response_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "response_ids array is required",
      });
    }

    const results = [];
    const errors = [];

    for (const responseId of response_ids) {
      try {
        await gradingService.gradeResponseManually(
          responseId,
          points_earned,
          feedback,
          req.employee.emp_id
        );
        results.push({ responseId, success: true });
      } catch (error) {
        errors.push({ responseId, error: error.message });
      }
    }

    res.json({
      success: errors.length === 0,
      message: `Graded ${results.length} responses, ${errors.length} errors`,
      data: { results, errors },
    });
  } catch (error) {
    console.error("Error bulk grading:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk grade responses",
      error: error.message,
    });
  }
};

// Get grading statistics for an exam
const getGradingStats = async (req, res) => {
  try {
    const { examId } = req.params;

    const exam = await Exam.findByPk(examId, {
      include: [
        {
          model: ExamAttempt,
          include: [{ model: StudentResponse }],
        },
      ],
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    const attempts = exam.ExamAttempts;
    const gradedAttempts = attempts.filter((a) => a.status === "graded");
    const pendingAttempts = attempts.filter(
      (a) => a.status === "submitted" || a.status === "auto_submitted"
    );

    // Calculate statistics
    const scores = gradedAttempts.map((a) => parseFloat(a.percentage) || 0);
    const averageScore =
      scores.length > 0
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = gradedAttempts.filter(
      (a) => a.pass_status === "passed"
    ).length;
    const passRate =
      gradedAttempts.length > 0
        ? (passCount / gradedAttempts.length) * 100
        : 0;

    // Count pending manual grading
    let pendingManualGrading = 0;
    for (const attempt of pendingAttempts) {
      for (const response of attempt.StudentResponses) {
        if (response.requires_manual_grading && !response.manually_graded) {
          pendingManualGrading++;
        }
      }
    }

    // Grade distribution
    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    for (const attempt of gradedAttempts) {
      if (attempt.grade && gradeDistribution[attempt.grade] !== undefined) {
        gradeDistribution[attempt.grade]++;
      }
    }

    res.json({
      success: true,
      data: {
        exam_id: exam.exam_id,
        title: exam.title,
        total_attempts: attempts.length,
        graded_attempts: gradedAttempts.length,
        pending_attempts: pendingAttempts.length,
        pending_manual_grading: pendingManualGrading,
        statistics: {
          average_score: Math.round(averageScore * 100) / 100,
          highest_score: highestScore,
          lowest_score: lowestScore,
          pass_rate: Math.round(passRate * 100) / 100,
          grade_distribution: gradeDistribution,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching grading stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch grading statistics",
      error: error.message,
    });
  }
};

module.exports = {
  getPendingGrading,
  getExamResponses,
  gradeResponse,
  finalizeAttemptGrading,
  bulkGradeResponses,
  getGradingStats,
};
