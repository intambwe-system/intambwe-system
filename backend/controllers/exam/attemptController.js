const {
  Exam,
  Question,
  AnswerOption,
  ExamAttempt,
  StudentResponse,
  Student,
  GuestParticipant,
  Subject,
} = require("../../model");
const { Op } = require("sequelize");
const gradingService = require("../../services/exam/gradingService");
const socketService = require("../../services/socketService");

// Start exam attempt
const startAttempt = async (req, res) => {
  try {
    const { id: examId } = req.params;
    const { access_password } = req.body;
    const std_id = req.student.std_id;

    // Get student info
    const student = await Student.findByPk(std_id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Get exam with questions
    const exam = await Exam.findByPk(examId, {
      include: [
        {
          model: Question,
          include: [{ model: AnswerOption, order: [["option_order", "ASC"]] }],
        },
      ],
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

    // Check date availability
    const now = new Date();
    if (exam.start_date && new Date(exam.start_date) > now) {
      return res.status(400).json({
        success: false,
        message: "Exam has not started yet",
      });
    }
    if (exam.end_date && new Date(exam.end_date) < now) {
      return res.status(400).json({
        success: false,
        message: "Exam has ended",
      });
    }

    console.log(access_password);
    console.log(exam.access_password);

    // Check password if required
    if (exam.access_password && exam.access_password !== access_password) {
      return res.status(403).json({
        success: false,
        message: "Invalid access password",
      });
    }

    // Check attempt limit
    const attemptCount = await ExamAttempt.count({
      where: { exam_id: examId, std_id },
    });

    if (attemptCount >= exam.max_attempts) {
      return res.status(400).json({
        success: false,
        message: "Maximum attempts reached",
      });
    }

    // Check for in-progress attempt
    const inProgressAttempt = await ExamAttempt.findOne({
      where: { exam_id: examId, std_id, status: "in_progress" },
    });

    if (inProgressAttempt) {
      console.log('startAttempt - Found in-progress attempt:', inProgressAttempt.attempt_id);

      // Check if time has expired for this attempt
      if (exam.has_time_limit) {
        const remaining = calculateRemainingTime(exam, inProgressAttempt);
        console.log('startAttempt - Time remaining:', remaining);
        if (remaining <= 0) {
          console.log('startAttempt - Time expired, auto-submitting');
          // Auto-submit the expired attempt
          await autoSubmitAttempt(inProgressAttempt);
          return res.status(400).json({
            success: false,
            message: "Your exam time has expired. The exam has been auto-submitted.",
            expired: true,
          });
        }
      }

      // Resume existing attempt
      const questions = await getQuestionsForAttempt(exam, inProgressAttempt);
      const responses = await StudentResponse.findAll({
        where: { attempt_id: inProgressAttempt.attempt_id },
      });

      console.log('startAttempt - Resuming with', questions.length, 'questions and', responses.length, 'responses');

      return res.json({
        success: true,
        message: "Resuming existing attempt",
        data: {
          attempt: inProgressAttempt,
          questions,
          responses,
          time_remaining_seconds: calculateRemainingTime(exam, inProgressAttempt),
        },
      });
    }

    // Prepare question order (randomize if needed)
    let questionOrder = exam.Questions.map((q) => q.question_id);
    if (exam.randomize_questions) {
      questionOrder = shuffleArray(questionOrder);
    }

    // Create new attempt
    const attempt = await ExamAttempt.create({
      exam_id: examId,
      std_id,
      class_id: student.class_id,
      attempt_number: attemptCount + 1,
      status: "in_progress",
      started_at: new Date(),
      max_score: exam.total_points,
      ip_address: req.ip,
      user_agent: req.headers["user-agent"],
      question_order: questionOrder,
    });

    // Update exam attempt count
    await exam.increment("attempt_count");

    // Prepare questions for student (hide correct answers)
    const questions = await getQuestionsForAttempt(exam, attempt);

    res.status(201).json({
      success: true,
      message: "Exam started successfully",
      data: {
        attempt,
        questions,
        time_limit_minutes: exam.has_time_limit ? exam.time_limit_minutes : null,
        time_remaining_seconds: exam.has_time_limit
          ? exam.time_limit_minutes * 60
          : null,
      },
    });
  } catch (error) {
    console.error("Error starting attempt:", error);
    res.status(500).json({
      success: false,
      message: "Failed to start exam",
      error: error.message,
    });
  }
};

// Get attempt details
const getAttempt = async (req, res) => {
  try {
    const { id } = req.params;

    const attempt = await ExamAttempt.findByPk(id, {
      include: [
        {
          model: Exam,
          as: "exam",
          include: [
            {
              model: Question,
              include: [{ model: AnswerOption, order: [["option_order", "ASC"]] }],
            },
          ],
        },
        { model: StudentResponse, },
        { model: GuestParticipant, as:'guest' },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify ownership (student) or admin access (employee)
    const isStudent = req.student && attempt.std_id === req.student.std_id;
    const isAdmin = req.employee && req.employee.emp_role === "admin";

    if (!isStudent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this attempt",
      });
    }

    // Prepare questions (hide correct answers if in progress)
    let questions = attempt.exam.Questions;
    if (attempt.status === "in_progress") {
      questions = questions.map((q) => ({
        ...q.toJSON(),
        correct_answers: undefined,
        explanation: undefined,
        AnswerOptions: q.AnswerOptions.map((opt) => ({
          ...opt.toJSON(),
          is_correct: undefined,
          feedback: undefined,
        })),
      }));
    }

    res.json({
      success: true,
      data: {
        attempt,
        questions,
        responses: attempt.StudentResponses,
        time_remaining_seconds: calculateRemainingTime(attempt.exam, attempt),
      },
    });
  } catch (error) {
    console.error("Error fetching attempt:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attempt",
      error: error.message,
    });
  }
};

// Submit/update response
const submitResponse = async (req, res) => {
  try {
    const { id: attemptId } = req.params;
    const {
      question_id,
      selected_option_id,
      selected_option_ids,
      text_response,
      is_flagged,
      time_spent_seconds,
    } = req.body;

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
    if (!req.student || attempt.std_id !== req.student.std_id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if attempt is still in progress
    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Attempt is no longer in progress",
      });
    }

    // Check time limit
    if (attempt.exam.has_time_limit) {
      const remaining = calculateRemainingTime(attempt.exam, attempt);
      if (remaining <= 0) {
        // Auto-submit the exam
        await autoSubmitAttempt(attempt);
        return res.status(400).json({
          success: false,
          message: "Time has expired. Exam auto-submitted.",
        });
      }
    }

    // Get question
    const question = await Question.findByPk(question_id);
    if (!question || question.exam_id !== attempt.exam_id) {
      return res.status(400).json({
        success: false,
        message: "Invalid question",
      });
    }

    // Find or create response
    let response = await StudentResponse.findOne({
      where: { attempt_id: attemptId, question_id },
    });

    const responseData = {
      attempt_id: attemptId,
      question_id,
      selected_option_id,
      selected_option_ids,
      text_response,
      is_flagged: is_flagged || false,
      time_spent_seconds,
      answered_at: new Date(),
      max_points: question.points,
      requires_manual_grading: question.requires_manual_grading,
    };

    if (response) {
      await response.update(responseData);
    } else {
      response = await StudentResponse.create(responseData);

      // Update questions answered count
      await attempt.increment("questions_answered");
    }

    // Update flagged count
    if (is_flagged !== undefined) {
      const flaggedCount = await StudentResponse.count({
        where: { attempt_id: attemptId, is_flagged: true },
      });
      await attempt.update({ questions_flagged: flaggedCount });
    }

    // Real-time: let teachers watching this exam see live answer progress
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
      message: "Response saved",
      data: response,
    });
  } catch (error) {
    console.error("Error submitting response:", error);
    res.status(500).json({
      success: false,
      message: "Failed to save response",
      error: error.message,
    });
  }
};

// Submit exam
const submitExam = async (req, res) => {
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
    if (!req.student || attempt.std_id !== req.student.std_id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
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

    // Auto-grade the exam
    const gradingResult = await gradingService.gradeAttempt(attemptId);

    // Determine final status: if no manual grading needed, mark as graded
    const finalStatus = gradingResult.requiresManualGrading ? "submitted" : "graded";

    // Update attempt
    await attempt.update({
      status: finalStatus,
      submitted_at: new Date(),
      time_taken_seconds: timeTaken,
      total_score: gradingResult.totalScore,
      max_score: gradingResult.maxScore,
      percentage: gradingResult.percentage,
      grade: gradingResult.grade,
      pass_status: gradingResult.passed ? "passed" : "failed",
    });

    // If fully graded (no manual grading needed) and exam has assessment_type, auto-record to marks
    if (!gradingResult.requiresManualGrading && attempt.exam.assessment_type) {
      try {
        const { recordExamScoreToMarks } = require("../../services/marks/examToMarksService");
        await recordExamScoreToMarks(attemptId);
      } catch (marksError) {
        console.error("Error recording exam score to marks:", marksError);
        // Don't fail submission if marks recording fails
      }
    }

    // Real-time: notify teachers watching this exam
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
    });

    res.json({
      success: true,
      message: "Exam submitted successfully",
      data: {
        attempt: await ExamAttempt.findByPk(attemptId),
        ...(attempt.exam.show_results_immediately && {
          result: gradingResult,
        }),
      },
    });
  } catch (error) {
    console.error("Error submitting exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit exam",
      error: error.message,
    });
  }
};

// Get attempt result
const getAttemptResult = async (req, res) => {
  try {
    const { id: attemptId } = req.params;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [
        {
          model: Exam,
          as: "exam",
          include: [
            {
              model: Question,
              include: [{ model: AnswerOption, order: [["option_order", "ASC"]] }],
            },
          ],
        },
        {
          model: StudentResponse,
          include: [
            {
              model: Question,
              as: "question",
              include: [{ model: AnswerOption, order: [["option_order", "ASC"]] }],
            },
            { model: AnswerOption, as: "selectedOption" },
          ],
        },
        { model: Student, as: "student" },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify ownership (student) or teacher/admin access (employee)
    const isOwner = req.student && attempt.std_id === req.student.std_id;
    const isTeacher = req.employee?.emp_role === "teacher" || req.employee?.emp_role === "admin";

    if (!isOwner && !isTeacher) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Check if results can be shown
    if (attempt.status === "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Exam not yet submitted",
      });
    }

    // Prepare result data
    const result = {
      attempt: {
        attempt_id: attempt.attempt_id,
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
      exam: {
        title: attempt.exam.title,
        pass_percentage: attempt.exam.pass_percentage,
      },
      student: attempt.student,
    };

    // Include detailed responses if allowed
    if (attempt.exam.show_correct_answers || isTeacher) {
      result.responses = attempt.StudentResponses.map((r) => {
        const response = {
          ...r.toJSON(),
          question: r.question,
        };
        // Include options array for looking up selected answers (especially for multiple choice)
        response.options = r.question.AnswerOptions?.map((o) => ({
          option_id: o.option_id,
          option_text: o.option_text,
          is_correct: o.is_correct,
        }));
        return response;
      });
      result.questions = attempt.exam.Questions;
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching result:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch result",
      error: error.message,
    });
  }
};

// Log tab switch
const logTabSwitch = async (req, res) => {
  try {
    const { id: attemptId } = req.params;

    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [{ model: Exam, as: "exam" }],
    });

    if (!attempt || !req.student || attempt.std_id !== req.student.std_id) {
      return res.status(403).json({ success: false });
    }

    if (attempt.status !== "in_progress") {
      return res.json({ success: true });
    }

    // Increment tab switches
    await attempt.increment("tab_switches");

    // Add to violation log
    const violationLog = attempt.violation_log || { tab_switches: [] };
    violationLog.tab_switches.push({
      timestamp: new Date(),
      question_id: req.body.current_question_id,
    });
    await attempt.update({ violation_log: violationLog });

    // Check if max violations exceeded
    if (
      attempt.exam.detect_tab_switch &&
      attempt.tab_switches + 1 >= attempt.exam.max_tab_switches
    ) {
      await autoSubmitAttempt(attempt);
      return res.json({
        success: true,
        message: "Maximum tab switches exceeded. Exam auto-submitted.",
        auto_submitted: true,
      });
    }

    res.json({
      success: true,
      tab_switches: attempt.tab_switches + 1,
      max_tab_switches: attempt.exam.max_tab_switches,
    });
  } catch (error) {
    console.error("Error logging tab switch:", error);
    res.status(500).json({ success: false });
  }
};

// Helper functions
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function calculateRemainingTime(exam, attempt) {
  if (!exam.has_time_limit) return null;

  const elapsed = Math.floor((new Date() - new Date(attempt.started_at)) / 1000);
  const totalSeconds = exam.time_limit_minutes * 60;
  return Math.max(0, totalSeconds - elapsed);
}

async function getQuestionsForAttempt(exam, attempt) {
  const questionOrder = attempt.question_order || [];
  let questions = exam.Questions;

  // Reorder if randomized
  if (questionOrder.length > 0) {
    const questionMap = new Map(questions.map((q) => [q.question_id, q]));
    questions = questionOrder
      .map((id) => questionMap.get(id))
      .filter(Boolean);
  }

  // Hide correct answers and explanations
  return questions.map((q) => {
    let options = q.AnswerOptions;

    // Randomize options if needed
    if (exam.randomize_options) {
      options = shuffleArray(options);
    }

    return {
      ...q.toJSON(),
      correct_answers: undefined,
      explanation: undefined,
      AnswerOptions: options.map((opt) => ({
        option_id: opt.option_id,
        option_text: opt.option_text,
        option_order: opt.option_order,
        image_url: opt.image_url,
      })),
    };
  });
}

async function autoSubmitAttempt(attempt) {
  const timeTaken = Math.floor(
    (new Date() - new Date(attempt.started_at)) / 1000
  );

  const gradingResult = await gradingService.gradeAttempt(attempt.attempt_id);

  await attempt.update({
    status: "auto_submitted",
    submitted_at: new Date(),
    time_taken_seconds: timeTaken,
    total_score: gradingResult.totalScore,
    percentage: gradingResult.percentage,
    grade: gradingResult.grade,
    pass_status: gradingResult.passed ? "passed" : "failed",
  });
}

// Submit sealed exam (for offline submission with integrity verification)
const submitSealedExam = async (req, res) => {
  try {
    const { id: attemptId } = req.params;
    const {
      sealed_responses,
      sealed_at,
      sealed_timestamp,
      integrity_hash,
      seal_reason,
      time_remaining_at_seal,
    } = req.body;

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
    if (!req.student || attempt.std_id !== req.student.std_id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // If already submitted, return success (idempotent)
    if (attempt.status !== "in_progress") {
      return res.json({
        success: true,
        message: "Attempt already submitted",
        data: {
          attempt: await ExamAttempt.findByPk(attemptId),
        },
      });
    }

    // Verify sealed timestamp is within exam window
    const sealTime = new Date(sealed_timestamp);
    const startTime = new Date(attempt.started_at);
    const timeLimitMs = attempt.exam.has_time_limit
      ? attempt.exam.time_limit_minutes * 60 * 1000
      : 24 * 60 * 60 * 1000; // 24 hours for untimed exams
    const endTime = new Date(startTime.getTime() + timeLimitMs);

    // Allow 60 seconds grace period for network delays
    const gracePeriodMs = 60 * 1000;
    if (sealTime > new Date(endTime.getTime() + gracePeriodMs)) {
      return res.status(400).json({
        success: false,
        message: "Sealed timestamp is outside the allowed exam window",
      });
    }

    // Verify integrity hash (re-compute and compare)
    // Note: For a production system, you'd want server-side hash verification
    // For now, we trust the client hash but log it for audit purposes
    console.log("Sealed submission received:", {
      attemptId,
      sealed_at,
      seal_reason,
      integrity_hash: integrity_hash?.substring(0, 16) + "...",
      time_remaining_at_seal,
    });

    // Process sealed responses - save any that aren't already saved
    if (sealed_responses && typeof sealed_responses === "object") {
      for (const [questionId, responseData] of Object.entries(sealed_responses)) {
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
          answered_at: new Date(sealed_at),
          max_points: question.points,
          requires_manual_grading: question.requires_manual_grading,
        };

        if (response) {
          await response.update(responsePayload);
        } else {
          response = await StudentResponse.create(responsePayload);
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

    // Calculate time taken (use seal time, not current time)
    const timeTaken = Math.floor(
      (new Date(sealed_at) - new Date(attempt.started_at)) / 1000
    );

    // Auto-grade the exam
    const gradingResult = await gradingService.gradeAttempt(attemptId);

    // Determine final status
    const finalStatus = gradingResult.requiresManualGrading ? "submitted" : "graded";

    // Update attempt with sealed submission info
    await attempt.update({
      status: finalStatus,
      submitted_at: new Date(sealed_at), // Use sealed timestamp, not current time
      time_taken_seconds: timeTaken,
      total_score: gradingResult.totalScore,
      max_score: gradingResult.maxScore,
      percentage: gradingResult.percentage,
      grade: gradingResult.grade,
      pass_status: gradingResult.passed ? "passed" : "failed",
      violation_log: {
        ...(attempt.violation_log || {}),
        sealed_submission: {
          sealed_at,
          seal_reason,
          integrity_hash,
          time_remaining_at_seal,
          submitted_at: new Date().toISOString(),
        },
      },
    });

    // If fully graded and exam has assessment_type, auto-record to marks
    if (!gradingResult.requiresManualGrading && attempt.exam.assessment_type) {
      try {
        const { recordExamScoreToMarks } = require("../../services/marks/examToMarksService");
        await recordExamScoreToMarks(attemptId);
      } catch (marksError) {
        console.error("Error recording exam score to marks:", marksError);
      }
    }

    // Real-time notification
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
    });

    res.json({
      success: true,
      message: "Sealed exam submitted successfully",
      data: {
        attempt: await ExamAttempt.findByPk(attemptId),
        ...(attempt.exam.show_results_immediately && {
          result: gradingResult,
        }),
      },
    });
  } catch (error) {
    console.error("Error submitting sealed exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit sealed exam",
      error: error.message,
    });
  }
};

// Get all exam results for a student (grouped by subject)
const getAllResults = async (req, res) => {
  try {
    const std_id = req.student.std_id;

    // Get all submitted/graded attempts for this student
    const attempts = await ExamAttempt.findAll({
      where: {
        std_id,
        status: { [Op.in]: ["submitted", "auto_submitted", "graded"] },
      },
      include: [
        {
          model: Exam,
          as: "exam",
          attributes: [
            "exam_id",
            "title",
            "total_points",
            "pass_percentage",
            "sbj_id",
          ],
          include: [
            {
              model: Subject,
              as: "subject",
              attributes: ["sbj_id", "sbj_name", "sbj_code"],
            },
          ],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    // Group by subject
    const resultsBySubject = {};
    let overallStats = {
      totalExams: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalPending: 0,
      averagePercentage: 0,
    };

    let totalPercentage = 0;
    let gradedCount = 0;

    attempts.forEach((attempt) => {
      const exam = attempt.exam;
      if (!exam) return;

      const subject = exam.subject;
      const subjectKey = subject ? subject.sbj_id : "uncategorized";
      const subjectName = subject ? subject.sbj_name : "Uncategorized";
      const subjectCode = subject ? subject.sbj_code : "";

      if (!resultsBySubject[subjectKey]) {
        resultsBySubject[subjectKey] = {
          subject_id: subjectKey,
          subject_name: subjectName,
          subject_code: subjectCode,
          exams: [],
          stats: {
            total: 0,
            passed: 0,
            failed: 0,
            pending: 0,
            averagePercentage: 0,
          },
        };
      }

      const examResult = {
        attempt_id: attempt.attempt_id,
        exam_id: exam.exam_id,
        exam_title: exam.title,
        status: attempt.status,
        total_score: attempt.total_score,
        max_score: attempt.max_score || exam.total_points,
        percentage: attempt.percentage,
        grade: attempt.grade,
        pass_status: attempt.pass_status,
        submitted_at: attempt.submitted_at,
        graded_at: attempt.graded_at,
        time_taken_seconds: attempt.time_taken_seconds,
        instructor_feedback: attempt.instructor_feedback,
      };

      resultsBySubject[subjectKey].exams.push(examResult);
      resultsBySubject[subjectKey].stats.total++;
      overallStats.totalExams++;

      if (attempt.pass_status === "passed") {
        resultsBySubject[subjectKey].stats.passed++;
        overallStats.totalPassed++;
      } else if (attempt.pass_status === "failed") {
        resultsBySubject[subjectKey].stats.failed++;
        overallStats.totalFailed++;
      } else {
        resultsBySubject[subjectKey].stats.pending++;
        overallStats.totalPending++;
      }

      if (attempt.percentage !== null) {
        totalPercentage += parseFloat(attempt.percentage);
        gradedCount++;
      }
    });

    // Calculate averages
    if (gradedCount > 0) {
      overallStats.averagePercentage = (totalPercentage / gradedCount).toFixed(
        1
      );
    }

    Object.keys(resultsBySubject).forEach((key) => {
      const subjectExams = resultsBySubject[key].exams;
      const gradedExams = subjectExams.filter((e) => e.percentage !== null);
      if (gradedExams.length > 0) {
        const sum = gradedExams.reduce(
          (acc, e) => acc + parseFloat(e.percentage),
          0
        );
        resultsBySubject[key].stats.averagePercentage = (
          sum / gradedExams.length
        ).toFixed(1);
      }
    });

    res.json({
      success: true,
      data: {
        subjects: Object.values(resultsBySubject),
        overallStats,
      },
    });
  } catch (error) {
    console.error("Error fetching all results:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch results",
      error: error.message,
    });
  }
};

module.exports = {
  startAttempt,
  getAttempt,
  submitResponse,
  submitExam,
  submitSealedExam,
  getAttemptResult,
  logTabSwitch,
  getAllResults,
};
