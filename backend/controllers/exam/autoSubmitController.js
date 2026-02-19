const {
  ExamAttempt,
  Exam,
  Student,
  GuestParticipant,
  StudentResponse,
  Question,
} = require("../../model");
const { Op } = require("sequelize");
const gradingService = require("../../services/exam/gradingService");
const socketService = require("../../services/socketService");

/**
 * Check for sealed unsubmitted exams for a student
 * GET /api/student/exam/check-sealed
 */
const checkSealedExamsStudent = async (req, res) => {
  try {
    const std_id = req.student.std_id;

    const sealedAttempts = await ExamAttempt.findAll({
      where: {
        std_id,
        status: "in_progress",
        is_sealed: true,
      },
      include: [
        {
          model: Exam,
          as: "exam",
          attributes: ["exam_id", "title", "has_time_limit", "time_limit_minutes"],
        },
      ],
      attributes: [
        "attempt_id",
        "exam_id",
        "sealed_at",
        "sealed_hash",
        "sealed_responses",
        "started_at",
        "questions_answered",
      ],
      order: [["sealed_at", "DESC"]],
    });

    res.json({
      success: true,
      hasSealedExams: sealedAttempts.length > 0,
      sealedAttempts: sealedAttempts.map((a) => ({
        attempt_id: a.attempt_id,
        exam_id: a.exam_id,
        exam_title: a.exam?.title,
        sealed_at: a.sealed_at,
        questions_answered: a.questions_answered,
        has_sealed_responses: !!a.sealed_responses,
      })),
    });
  } catch (error) {
    console.error("Error checking sealed exams for student:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check sealed exams",
    });
  }
};

/**
 * Check for sealed unsubmitted exams for a guest (by email)
 * GET /api/public/exam/check-sealed/:email
 */
const checkSealedExamsPublic = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Find guest by email
    const guest = await GuestParticipant.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!guest) {
      return res.json({
        success: true,
        hasSealedExams: false,
        sealedAttempts: [],
      });
    }

    const sealedAttempts = await ExamAttempt.findAll({
      where: {
        guest_id: guest.guest_id,
        status: "in_progress",
        is_sealed: true,
      },
      include: [
        {
          model: Exam,
          as: "exam",
          attributes: ["exam_id", "uuid", "title", "has_time_limit", "time_limit_minutes"],
        },
      ],
      attributes: [
        "attempt_id",
        "exam_id",
        "sealed_at",
        "sealed_hash",
        "sealed_responses",
        "started_at",
        "questions_answered",
      ],
      order: [["sealed_at", "DESC"]],
    });

    res.json({
      success: true,
      hasSealedExams: sealedAttempts.length > 0,
      sealedAttempts: sealedAttempts.map((a) => ({
        attempt_id: a.attempt_id,
        exam_id: a.exam_id,
        exam_uuid: a.exam?.uuid,
        exam_title: a.exam?.title,
        sealed_at: a.sealed_at,
        questions_answered: a.questions_answered,
        has_sealed_responses: !!a.sealed_responses,
      })),
      session_token: guest.session_token, // Return for auto-submit authentication
    });
  } catch (error) {
    console.error("Error checking sealed exams for guest:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check sealed exams",
    });
  }
};

/**
 * Save sealed state to server (student)
 * POST /api/student/exam/attempt/:id/seal
 */
const sealExamAttemptStudent = async (req, res) => {
  try {
    const { id: attemptId } = req.params;
    const { sealed_responses, sealed_at, sealed_hash, seal_reason, time_remaining_at_seal } =
      req.body;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [{ model: Exam, as: "exam" }],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify ownership
    if (attempt.std_id !== req.student.std_id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Can only seal in-progress attempts
    if (attempt.status !== "in_progress") {
      return res.json({
        success: true,
        message: "Attempt already submitted",
        already_submitted: true,
      });
    }

    // Update with sealed data
    await attempt.update({
      is_sealed: true,
      sealed_at: sealed_at ? new Date(sealed_at) : new Date(),
      sealed_hash,
      sealed_responses,
      time_remaining_seconds: time_remaining_at_seal,
      violation_log: {
        ...(attempt.violation_log || {}),
        seal_event: {
          seal_reason,
          sealed_at,
          time_remaining_at_seal,
          server_received_at: new Date().toISOString(),
        },
      },
    });

    res.json({
      success: true,
      message: "Exam sealed successfully",
      data: {
        attempt_id: attemptId,
        sealed_at: attempt.sealed_at,
      },
    });
  } catch (error) {
    console.error("Error sealing exam attempt:", error);
    res.status(500).json({
      success: false,
      message: "Failed to seal exam",
    });
  }
};

/**
 * Save sealed state to server (public/guest)
 * POST /api/public/exam/attempt/:id/seal
 */
const sealExamAttemptPublic = async (req, res) => {
  try {
    const { id: attemptId } = req.params;
    const {
      sealed_responses,
      sealed_at,
      sealed_hash,
      seal_reason,
      time_remaining_at_seal,
      session_token,
    } = req.body;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [
        { model: Exam, as: "exam" },
        { model: GuestParticipant, as: "guest" },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify session token
    if (!attempt.guest || attempt.guest.session_token !== session_token) {
      return res.status(403).json({
        success: false,
        message: "Invalid session token",
      });
    }

    // Can only seal in-progress attempts
    if (attempt.status !== "in_progress") {
      return res.json({
        success: true,
        message: "Attempt already submitted",
        already_submitted: true,
      });
    }

    // Update with sealed data
    await attempt.update({
      is_sealed: true,
      sealed_at: sealed_at ? new Date(sealed_at) : new Date(),
      sealed_hash,
      sealed_responses,
      time_remaining_seconds: time_remaining_at_seal,
      violation_log: {
        ...(attempt.violation_log || {}),
        seal_event: {
          seal_reason,
          sealed_at,
          time_remaining_at_seal,
          server_received_at: new Date().toISOString(),
        },
      },
    });

    res.json({
      success: true,
      message: "Exam sealed successfully",
      data: {
        attempt_id: attemptId,
        sealed_at: attempt.sealed_at,
      },
    });
  } catch (error) {
    console.error("Error sealing exam attempt (public):", error);
    res.status(500).json({
      success: false,
      message: "Failed to seal exam",
    });
  }
};

/**
 * Auto-submit a sealed exam (student)
 * POST /api/student/exam/attempt/:id/auto-submit
 */
const autoSubmitSealedStudent = async (req, res) => {
  try {
    const { id: attemptId } = req.params;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [
        { model: Exam, as: "exam" },
        { model: StudentResponse },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify ownership
    if (attempt.std_id !== req.student.std_id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Already submitted
    if (attempt.status !== "in_progress") {
      return res.json({
        success: true,
        message: "Attempt already submitted",
        data: { attempt },
      });
    }

    // Must be sealed to auto-submit
    if (!attempt.is_sealed) {
      return res.status(400).json({
        success: false,
        message: "Attempt is not sealed. Cannot auto-submit.",
      });
    }

    // Process sealed responses if available
    if (attempt.sealed_responses && typeof attempt.sealed_responses === "object") {
      for (const [questionId, responseData] of Object.entries(attempt.sealed_responses)) {
        if (!responseData) continue;

        const question = await Question.findByPk(questionId);
        if (!question || question.exam_id !== attempt.exam_id) continue;

        // Find or create response
        let response = await StudentResponse.findOne({
          where: { attempt_id: attemptId, question_id: questionId },
        });

        const responsePayload = {
          attempt_id: attemptId,
          question_id: parseInt(questionId),
          selected_option_id: responseData.selected_option_id || null,
          selected_option_ids: responseData.selected_option_ids || null,
          text_response: responseData.text_response || null,
          is_flagged: responseData.is_flagged || false,
          answered_at: new Date(attempt.sealed_at),
          max_points: question.points,
          requires_manual_grading: question.requires_manual_grading,
        };

        if (response) {
          await response.update(responsePayload);
        } else {
          await StudentResponse.create(responsePayload);
        }
      }

      // Update questions answered count
      const answeredCount = await StudentResponse.count({
        where: {
          attempt_id: attemptId,
          [Op.or]: [
            { selected_option_id: { [Op.ne]: null } },
            { selected_option_ids: { [Op.ne]: null } },
            { text_response: { [Op.ne]: null, [Op.ne]: "" } },
          ],
        },
      });
      await attempt.update({ questions_answered: answeredCount });
    }

    // Calculate time taken
    const timeTaken = Math.floor(
      (new Date(attempt.sealed_at) - new Date(attempt.started_at)) / 1000
    );

    // Auto-grade
    const gradingResult = await gradingService.gradeAttempt(attemptId);

    // Determine if submission is late (past exam window)
    const examEndTime = new Date(attempt.started_at);
    if (attempt.exam.has_time_limit) {
      examEndTime.setMinutes(examEndTime.getMinutes() + attempt.exam.time_limit_minutes);
    } else {
      examEndTime.setHours(examEndTime.getHours() + 24); // 24 hour default
    }

    const isLateSubmission = new Date() > examEndTime;
    const finalStatus = gradingResult.requiresManualGrading ? "submitted" : "graded";

    // Update attempt
    await attempt.update({
      status: finalStatus,
      submitted_at: attempt.sealed_at, // Use sealed timestamp
      time_taken_seconds: timeTaken,
      total_score: gradingResult.totalScore,
      max_score: gradingResult.maxScore,
      percentage: gradingResult.percentage,
      grade: gradingResult.grade,
      pass_status: gradingResult.passed ? "passed" : "failed",
      violation_log: {
        ...(attempt.violation_log || {}),
        auto_submit: {
          submitted_at: new Date().toISOString(),
          sealed_at: attempt.sealed_at,
          is_late_submission: isLateSubmission,
        },
      },
    });

    // Emit socket event
    const student = await Student.findByPk(attempt.std_id);
    const studentName = student
      ? `${student.std_fname} ${student.std_lname}`.trim()
      : "A student";
    socketService.emitToExamRoom(attempt.exam_id, "exam:submitted", {
      examId: attempt.exam_id,
      attemptId,
      studentName,
      questionsAnswered: attempt.questions_answered,
      timestamp: new Date(),
      sealed: true,
      auto_submitted: true,
    });

    res.json({
      success: true,
      message: isLateSubmission
        ? "Sealed exam auto-submitted (late - flagged for review)"
        : "Sealed exam auto-submitted successfully",
      data: {
        attempt: await ExamAttempt.findByPk(attemptId),
        is_late_submission: isLateSubmission,
        ...(attempt.exam.show_results_immediately && { result: gradingResult }),
      },
    });
  } catch (error) {
    console.error("Error auto-submitting sealed exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to auto-submit sealed exam",
    });
  }
};

/**
 * Auto-submit a sealed exam (public/guest)
 * POST /api/public/exam/attempt/:id/auto-submit
 */
const autoSubmitSealedPublic = async (req, res) => {
  try {
    const { id: attemptId } = req.params;
    const { session_token } = req.body;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [
        { model: Exam, as: "exam" },
        { model: GuestParticipant, as: "guest" },
        { model: StudentResponse },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify session token
    if (!attempt.guest || attempt.guest.session_token !== session_token) {
      return res.status(403).json({
        success: false,
        message: "Invalid session token",
      });
    }

    // Already submitted
    if (attempt.status !== "in_progress") {
      return res.json({
        success: true,
        message: "Attempt already submitted",
        data: { attempt },
      });
    }

    // Must be sealed to auto-submit
    if (!attempt.is_sealed) {
      return res.status(400).json({
        success: false,
        message: "Attempt is not sealed. Cannot auto-submit.",
      });
    }

    // Process sealed responses if available
    if (attempt.sealed_responses && typeof attempt.sealed_responses === "object") {
      for (const [questionId, responseData] of Object.entries(attempt.sealed_responses)) {
        if (!responseData) continue;

        const question = await Question.findByPk(questionId);
        if (!question || question.exam_id !== attempt.exam_id) continue;

        let response = await StudentResponse.findOne({
          where: { attempt_id: attemptId, question_id: questionId },
        });

        const responsePayload = {
          attempt_id: attemptId,
          question_id: parseInt(questionId),
          selected_option_id: responseData.selected_option_id || null,
          selected_option_ids: responseData.selected_option_ids || null,
          text_response: responseData.text_response || null,
          is_flagged: responseData.is_flagged || false,
          answered_at: new Date(attempt.sealed_at),
          max_points: question.points,
          requires_manual_grading: question.requires_manual_grading,
        };

        if (response) {
          await response.update(responsePayload);
        } else {
          await StudentResponse.create(responsePayload);
        }
      }

      const answeredCount = await StudentResponse.count({
        where: {
          attempt_id: attemptId,
          [Op.or]: [
            { selected_option_id: { [Op.ne]: null } },
            { selected_option_ids: { [Op.ne]: null } },
            { text_response: { [Op.ne]: null, [Op.ne]: "" } },
          ],
        },
      });
      await attempt.update({ questions_answered: answeredCount });
    }

    const timeTaken = Math.floor(
      (new Date(attempt.sealed_at) - new Date(attempt.started_at)) / 1000
    );

    const gradingResult = await gradingService.gradeAttempt(attemptId);

    const examEndTime = new Date(attempt.started_at);
    if (attempt.exam.has_time_limit) {
      examEndTime.setMinutes(examEndTime.getMinutes() + attempt.exam.time_limit_minutes);
    } else {
      examEndTime.setHours(examEndTime.getHours() + 24);
    }

    const isLateSubmission = new Date() > examEndTime;
    const finalStatus = gradingResult.requiresManualGrading ? "submitted" : "graded";

    await attempt.update({
      status: finalStatus,
      submitted_at: attempt.sealed_at,
      time_taken_seconds: timeTaken,
      total_score: gradingResult.totalScore,
      max_score: gradingResult.maxScore,
      percentage: gradingResult.percentage,
      grade: gradingResult.grade,
      pass_status: gradingResult.passed ? "passed" : "failed",
      violation_log: {
        ...(attempt.violation_log || {}),
        auto_submit: {
          submitted_at: new Date().toISOString(),
          sealed_at: attempt.sealed_at,
          is_late_submission: isLateSubmission,
        },
      },
    });

    socketService.emitToExamRoom(attempt.exam_id, "exam:submitted", {
      examId: attempt.exam_id,
      attemptId,
      studentName: attempt.guest?.full_name || "A guest",
      questionsAnswered: attempt.questions_answered,
      timestamp: new Date(),
      sealed: true,
      auto_submitted: true,
      is_guest: true,
    });

    res.json({
      success: true,
      message: isLateSubmission
        ? "Sealed exam auto-submitted (late - flagged for review)"
        : "Sealed exam auto-submitted successfully",
      data: {
        attempt: await ExamAttempt.findByPk(attemptId),
        is_late_submission: isLateSubmission,
        ...(attempt.exam.show_results_immediately && { result: gradingResult }),
      },
    });
  } catch (error) {
    console.error("Error auto-submitting sealed exam (public):", error);
    res.status(500).json({
      success: false,
      message: "Failed to auto-submit sealed exam",
    });
  }
};

module.exports = {
  checkSealedExamsStudent,
  checkSealedExamsPublic,
  sealExamAttemptStudent,
  sealExamAttemptPublic,
  autoSubmitSealedStudent,
  autoSubmitSealedPublic,
};
