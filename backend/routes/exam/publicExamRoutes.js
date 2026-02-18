const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const {
  Exam,
  Question,
  AnswerOption,
  ExamAttempt,
  StudentResponse,
  GuestParticipant,
  Subject,
  sequelize,
} = require("../../model");
const gradingService = require("../../services/exam/gradingService");
const socketService = require("../../services/socketService");

// ============================================
// PUBLIC EXAM ROUTES (No Authentication Required)
// ============================================

/**
 * Get public exam info by UUID
 * GET /api/public/exam/:uuid
 */
router.get("/:uuid", async (req, res) => {
  try {
    const { uuid } = req.params;

    const exam = await Exam.findOne({
      where: {
        uuid,
        is_public: true,
        status: "published",
      },
      include: [{ model: Subject, as: "subject", attributes: ["sbj_name"] }],
      attributes: [
        "exam_id",
        "uuid",
        "title",
        "description",
        "instructions",
        "has_time_limit",
        "time_limit_minutes",
        "max_attempts",
        "pass_percentage",
        "total_points",
        "detect_tab_switch",
        "max_tab_switches",
        "require_participant_info",
        "show_results_immediately",
        "access_password",
      ],
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found or not available",
      });
    }

    // Count questions
    const questionCount = await Question.count({
      where: { exam_id: exam.exam_id },
    });

    res.json({
      success: true,
      exam: {
        ...exam.toJSON(),
        question_count: questionCount,
        has_password: !!exam.access_password,
      },
    });
  } catch (error) {
    console.error("Error fetching public exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam",
    });
  }
});

/**
 * Register guest and start exam
 * POST /api/public/exam/:uuid/start
 */
router.post("/:uuid/start", async (req, res) => {
  try {
    const { uuid } = req.params;
    const { full_name, email, phone, password } = req.body;

    const exam = await Exam.findOne({
      where: {
        uuid,
        is_public: true,
        status: "published",
      },
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found or not available",
      });
    }

    // Check password if required
    if (exam.access_password && exam.access_password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid access password",
      });
    }

    // Validate participant info if required
    if (exam.require_participant_info) {
      if (!full_name || !email) {
        return res.status(400).json({
          success: false,
          message: "Name and email are required",
        });
      }
    }

    // Check scheduling
    const now = new Date();
    if (exam.start_date && now < new Date(exam.start_date)) {
      return res.status(400).json({
        success: false,
        message: `Exam not available until ${new Date(exam.start_date).toLocaleString()}`,
      });
    }
    if (exam.end_date && now > new Date(exam.end_date)) {
      return res.status(400).json({
        success: false,
        message: "Exam submission deadline has passed",
      });
    }

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString("hex");

    // Find existing guest by email OR create new one
    let guest;

    // Try to find existing guest by email (for re-attempts)
    if (exam.require_participant_info && email) {
      guest = await GuestParticipant.findOne({ where: { email } });

      if (guest) {
        // Update session token and info for this session
        await guest.update({
          full_name: full_name || guest.full_name,
          phone: phone || guest.phone,
          session_token: sessionToken,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get("User-Agent"),
        });
      }
    }

    // Create new guest if not found
    if (!guest) {
      if (exam.require_participant_info) {
        guest = await GuestParticipant.create({
          full_name: full_name || "Anonymous",
          email: email || `guest_${Date.now()}@anonymous.com`,
          phone: phone || null,
          session_token: sessionToken,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get("User-Agent"),
        });
      } else {
        guest = await GuestParticipant.create({
          full_name: "Anonymous",
          email: `guest_${Date.now()}@anonymous.com`,
          session_token: sessionToken,
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get("User-Agent"),
        });
      }
    }

    // Check existing attempts by this guest
    const existingAttempts = await ExamAttempt.count({
      where: {
        exam_id: exam.exam_id,
        guest_id: guest.guest_id,
      },
    });

    if (existingAttempts >= exam.max_attempts) {
      return res.status(400).json({
        success: false,
        message: `Maximum attempts (${exam.max_attempts}) reached`,
      });
    }

    // Get questions
    let questions = await Question.findAll({
      where: { exam_id: exam.exam_id },
      include: [
        {
          model: AnswerOption,
          attributes: ["option_id", "option_text", "option_order"],
        },
      ],
      order: exam.randomize_questions
        ? sequelize.random()
        : [["question_order", "ASC"]],
    });

    // Randomize options if needed
    if (exam.randomize_options) {
      questions = questions.map((q) => {
        const qJson = q.toJSON();
        if (qJson.AnswerOptions) {
          qJson.AnswerOptions = qJson.AnswerOptions.sort(
            () => Math.random() - 0.5
          );
        }
        return qJson;
      });
    }

    // Create attempt
    const attempt = await ExamAttempt.create({
      exam_id: exam.exam_id,
      guest_id: guest.guest_id,
      is_guest: true,
      attempt_number: existingAttempts + 1,
      status: "in_progress",
      started_at: new Date(),
      time_remaining_seconds: exam.has_time_limit
        ? exam.time_limit_minutes * 60
        : null,
      max_score: exam.total_points,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get("User-Agent"),
      question_order: questions.map((q) => q.question_id || q.question_id),
    });

    res.json({
      success: true,
      session_token: sessionToken,
      attempt: {
        attempt_id: attempt.attempt_id,
        attempt_number: attempt.attempt_number,
        started_at: attempt.started_at,
        time_remaining_seconds: attempt.time_remaining_seconds,
      },
      questions: questions.map((q) => ({
        question_id: q.question_id,
        question_text: q.question_text,
        question_type: q.question_type,
        points: q.points,
        image_url: q.image_url,
        word_limit_min: q.word_limit_min,
        word_limit_max: q.word_limit_max,
        AnswerOptions: q.AnswerOptions,
      })),
      time_remaining_seconds: attempt.time_remaining_seconds,
    });
  } catch (error) {
    console.error("Error starting public exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start exam",
    });
  }
});

/**
 * Save response for public exam
 * PUT /api/public/exam/attempt/:attemptId/response
 */
router.put("/attempt/:attemptId/response", async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { session_token, question_id, selected_option_id, selected_option_ids, text_response, is_flagged } = req.body;

    // Verify session token
    const guest = await GuestParticipant.findOne({
      where: { session_token },
    });

    if (!guest) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    const attempt = await ExamAttempt.findOne({
      where: {
        attempt_id: attemptId,
        guest_id: guest.guest_id,
        status: "in_progress",
      },
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found or already submitted",
      });
    }

    // Find or create response
    let response = await StudentResponse.findOne({
      where: {
        attempt_id: attemptId,
        question_id,
      },
    });

    if (response) {
      await response.update({
        selected_option_id,
        selected_option_ids,
        text_response,
        is_flagged: is_flagged || false,
      });
    } else {
      response = await StudentResponse.create({
        attempt_id: attemptId,
        question_id,
        selected_option_id,
        selected_option_ids,
        text_response,
        is_flagged: is_flagged || false,
      });
    }

    // Real-time: notify teachers watching this exam of live progress
    const freshAttempt = await ExamAttempt.findByPk(attemptId);
    if (freshAttempt) {
      socketService.emitToExamRoom(freshAttempt.exam_id, "exam:response_saved", {
        examId: freshAttempt.exam_id,
        attemptId,
        questionsAnswered: freshAttempt.questions_answered,
      });
    }

    res.json({
      success: true,
      response: {
        response_id: response.response_id,
        question_id: response.question_id,
      },
    });
  } catch (error) {
    console.error("Error saving response:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save response",
    });
  }
});

/**
 * Submit public exam
 * POST /api/public/exam/attempt/:attemptId/submit
 */
router.post("/attempt/:attemptId/submit", async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { session_token } = req.body;

    // Verify session token
    const guest = await GuestParticipant.findOne({
      where: { session_token },
    });

    if (!guest) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    const attempt = await ExamAttempt.findOne({
      where: {
        attempt_id: attemptId,
        guest_id: guest.guest_id,
      },
      include: [
        { model: Exam, as: "exam" },
        {
          model: StudentResponse,
          include: [
            {
              model: Question,
              as: "question",
              include: [{ model: AnswerOption }],
            },
          ],
        },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Attempt already submitted",
      });
    }

    // Calculate time taken
    const timeTaken = Math.floor(
      (new Date() - new Date(attempt.started_at)) / 1000
    );

    // Grade the attempt
    let totalScore = 0;
    let requiresManualGrading = false;

    for (const response of attempt.StudentResponses) {
      const question = response.question;

      // Check if question requires manual grading (essay, short_answer)
      if (question.requires_manual_grading || ['essay', 'short_answer'].includes(question.question_type)) {
        await response.update({
          points_earned: 0,
          is_correct: null,
          requires_manual_grading: true,
          max_points: parseFloat(question.points) || 1,
        });
        requiresManualGrading = true;
        continue;
      }

      // Auto-grade using gradeQuestion function
      const result = gradingService.gradeQuestion(question, response);

      await response.update({
        points_earned: result.pointsEarned,
        is_correct: result.isCorrect,
        max_points: parseFloat(question.points) || 1,
      });

      totalScore += result.pointsEarned;
    }

    // Calculate percentage and grade
    const maxScore = parseFloat(attempt.exam.total_points) || 100;
    const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
    const passPercentage = parseFloat(attempt.exam.pass_percentage) || 50;
    const passStatus = requiresManualGrading
      ? "pending"
      : percentage >= passPercentage
        ? "passed"
        : "failed";

    const grade = gradingService.calculateLetterGrade(percentage);

    // Update attempt
    await attempt.update({
      status: requiresManualGrading ? "submitted" : "graded",
      submitted_at: new Date(),
      time_taken_seconds: timeTaken,
      total_score: totalScore,
      percentage: percentage.toFixed(2),
      grade,
      pass_status: passStatus,
      questions_answered: attempt.StudentResponses.length,
    });

    // Real-time: notify teachers watching this exam
    const participantName = guest.full_name || guest.email || guest.phone || 'Guest';
    socketService.emitToExamRoom(attempt.exam_id, "exam:submitted", {
      examId: attempt.exam_id,
      attemptId,
      studentName: participantName,
      questionsAnswered: attempt.StudentResponses.length,
      timestamp: new Date(),
    });

    res.json({
      success: true,
      attempt: {
        attempt_id: attempt.attempt_id,
        status: attempt.status,
        total_score: totalScore,
        max_score: maxScore,
        percentage: percentage.toFixed(2),
        grade,
        pass_status: passStatus,
        time_taken_seconds: timeTaken,
        requires_manual_grading: requiresManualGrading,
      },
      show_results: attempt.exam.show_results_immediately,
    });
  } catch (error) {
    console.error("Error submitting exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit exam",
    });
  }
});

/**
 * Get public exam result
 * GET /api/public/exam/attempt/:attemptId/result
 */
router.get("/attempt/:attemptId/result", async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { session_token } = req.query;

    // Verify session token
    const guest = await GuestParticipant.findOne({
      where: { session_token },
    });

    if (!guest) {
      return res.status(401).json({
        success: false,
        message: "Invalid session",
      });
    }

    const attempt = await ExamAttempt.findOne({
      where: {
        attempt_id: attemptId,
        guest_id: guest.guest_id,
      },
      include: [
        {
          model: Exam,
          as: "exam",
          attributes: [
            "title",
            "show_results_immediately",
            "show_correct_answers",
            "show_explanations",
            "pass_percentage",
          ],
        },
        {
          model: StudentResponse,
          include: [
            {
              model: Question,
              as: "question",
              include: [{ model: AnswerOption }],
            },
          ],
        },
        {
          model: GuestParticipant,
          as: "guest",
          attributes: ["full_name", "email"],
        },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Result not found",
      });
    }

    if (!attempt.exam.show_results_immediately && attempt.status !== "graded") {
      return res.json({
        success: true,
        message: "Results will be available after grading",
        attempt: {
          attempt_id: attempt.attempt_id,
          status: attempt.status,
          submitted_at: attempt.submitted_at,
        },
      });
    }

    // Build response with appropriate visibility
    const responses = attempt.StudentResponses.map((r) => {
      const response = {
        question_id: r.question_id,
        question_text: r.question.question_text,
        question_type: r.question.question_type,
        points: r.question.points,
        points_earned: r.points_earned,
        is_correct: r.is_correct,
        text_response: r.text_response,
        selected_option_id: r.selected_option_id,
        selected_option_ids: r.selected_option_ids,
        grading_feedback: r.grading_feedback,
        auto_graded: r.auto_graded,
      };

      if (attempt.exam.show_correct_answers) {
        response.correct_options = r.question.AnswerOptions?.filter(
          (o) => o.is_correct
        ).map((o) => o.option_id);
        response.correct_answers = r.question.correct_answers;
      }

      if (attempt.exam.show_explanations) {
        response.explanation = r.question.explanation;
      }

      response.options = r.question.AnswerOptions?.map((o) => ({
        option_id: o.option_id,
        option_text: o.option_text,
        is_correct: attempt.exam.show_correct_answers ? o.is_correct : undefined,
      }));

      return response;
    });

    res.json({
      success: true,
      attempt: {
        attempt_id: attempt.attempt_id,
        exam_title: attempt.exam.title,
        participant_name: attempt.guest?.full_name,
        participant_email: attempt.guest?.email,
        status: attempt.status,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        time_taken_seconds: attempt.time_taken_seconds,
        total_score: attempt.total_score,
        max_score: attempt.max_score,
        percentage: attempt.percentage,
        grade: attempt.grade,
        pass_status: attempt.pass_status,
        instructor_feedback: attempt.instructor_feedback,
      },
      responses,
    });
  } catch (error) {
    console.error("Error fetching result:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch result",
    });
  }
});

/**
 * Log tab switch for public exam
 * POST /api/public/exam/attempt/:attemptId/tab-switch
 */
router.post("/attempt/:attemptId/tab-switch", async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { session_token } = req.body;

    const guest = await GuestParticipant.findOne({
      where: { session_token },
    });

    if (!guest) {
      return res.status(401).json({ success: false });
    }

    const attempt = await ExamAttempt.findOne({
      where: {
        attempt_id: attemptId,
        guest_id: guest.guest_id,
        status: "in_progress",
      },
    });

    if (!attempt) {
      return res.status(404).json({ success: false });
    }

    const violations = attempt.violation_log || [];
    violations.push({
      type: "tab_switch",
      timestamp: new Date().toISOString(),
    });

    await attempt.update({
      tab_switches: (attempt.tab_switches || 0) + 1,
      violation_log: violations,
    });

    res.json({
      success: true,
      tab_switches: attempt.tab_switches + 1,
    });
  } catch (error) {
    console.error("Error logging tab switch:", error);
    res.status(500).json({ success: false });
  }
});

// ============================================
// PUBLIC EXAM LOOKUP BY EMAIL OR PHONE
// ============================================

/**
 * Lookup exam attempts by email or phone
 * GET /api/public/exam/lookup?email=xxx&phone=xxx
 */
router.get("/lookup/search", async (req, res) => {
  try {
    const { email, phone } = req.query;
    const { Op } = require("sequelize");

    if (!email && !phone) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email or phone number",
      });
    }

    // Find the guest participant
    const whereClause = {};
    if (email && phone) {
      whereClause[Op.or] = [{ email }, { phone }];
    } else if (email) {
      whereClause.email = email;
    } else {
      whereClause.phone = phone;
    }

    const participants = await GuestParticipant.findAll({
      where: whereClause,
    });

    if (!participants.length) {
      return res.json({
        success: true,
        data: [],
        message: "No exam records found for this contact information",
      });
    }

    // Get all attempts for these participants
    const participantIds = participants.map((p) => p.guest_id);

    const attempts = await ExamAttempt.findAll({
      where: {
        guest_id: { [Op.in]: participantIds },
        status: { [Op.in]: ["submitted", "graded", "auto_submitted"] },
      },
      include: [
        {
          model: Exam,
          as: "exam",
          attributes: ["exam_id", "uuid", "title", "show_results_immediately"],
          include: [
            { model: Subject, as: "subject", attributes: ["sbj_id", "sbj_name"] },
          ],
        },
        {
          model: GuestParticipant,
          as: "guest",
          attributes: ["guest_id", "full_name", "email", "phone", "session_token"],
        },
      ],
      attributes: [
        "attempt_id", "attempt_number", "status", "started_at", "submitted_at",
        "total_score", "max_score", "percentage", "grade", "pass_status",
      ],
      order: [["submitted_at", "DESC"]],
    });

    res.json({
      success: true,
      data: attempts,
    });
  } catch (error) {
    console.error("Error looking up exam attempts:", error);
    res.status(500).json({ success: false, message: "Failed to look up exam attempts" });
  }
});

module.exports = router;
