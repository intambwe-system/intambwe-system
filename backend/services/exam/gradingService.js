const {
  ExamAttempt,
  StudentResponse,
  Question,
  AnswerOption,
  Exam,
} = require("../../model");
const socketService = require("../socketService");

/**
 * Auto-grade an exam attempt
 * @param {number} attemptId - The attempt ID to grade
 * @returns {Object} Grading result with scores and status
 */
const gradeAttempt = async (attemptId) => {
  const attempt = await ExamAttempt.findByPk(attemptId, {
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
    throw new Error("Attempt not found");
  }

  let totalScore = 0;
  let maxScore = 0;
  let requiresManualGrading = false;

  // Grade each response
  for (const response of attempt.StudentResponses) {
    const question = response.question;
    const maxPoints = parseFloat(question.points) || 1;
    maxScore += maxPoints;

    if (question.requires_manual_grading) {
      // Mark for manual grading
      await response.update({
        requires_manual_grading: true,
        max_points: maxPoints,
      });
      requiresManualGrading = true;
      continue;
    }

    // Auto-grade based on question type
    const result = gradeQuestion(question, response);

    await response.update({
      is_correct: result.isCorrect,
      points_earned: result.pointsEarned,
      max_points: maxPoints,
    });

    totalScore += result.pointsEarned;
  }

  // Calculate percentage and grade
  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const grade = calculateLetterGrade(percentage);
  const passed = percentage >= parseFloat(attempt.exam.pass_percentage);

  return {
    totalScore,
    maxScore,
    percentage: Math.round(percentage * 100) / 100,
    grade,
    passed,
    requiresManualGrading,
  };
};

/**
 * Grade a single question
 * @param {Object} question - The question with answer options
 * @param {Object} response - The student's response
 * @returns {Object} { isCorrect, pointsEarned }
 */
const gradeQuestion = (question, response) => {
  const maxPoints = parseFloat(question.points) || 1;

  switch (question.question_type) {
    case "multiple_choice_single":
      return gradeSingleChoice(question, response, maxPoints);

    case "multiple_choice_multiple":
      return gradeMultipleChoice(question, response, maxPoints);

    case "true_false":
      return gradeTrueFalse(question, response, maxPoints);

    case "fill_in_blank":
      return gradeFillInBlank(question, response, maxPoints);

    case "short_answer":
    case "essay":
      // These require manual grading
      return { isCorrect: null, pointsEarned: 0 };

    default:
      return { isCorrect: false, pointsEarned: 0 };
  }
};

/**
 * Grade single choice (radio button) question
 */
const gradeSingleChoice = (question, response, maxPoints) => {
  if (!response.selected_option_id) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const correctOption = question.AnswerOptions.find((opt) => opt.is_correct);
  const isCorrect =
    correctOption && response.selected_option_id === correctOption.option_id;

  return {
    isCorrect,
    pointsEarned: isCorrect ? maxPoints : 0,
  };
};

/**
 * Grade multiple choice (checkbox) question with partial credit option
 */
const gradeMultipleChoice = (question, response, maxPoints) => {
  const selectedIds = response.selected_option_ids || [];
  if (selectedIds.length === 0) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const correctOptions = question.AnswerOptions.filter((opt) => opt.is_correct);
  const correctIds = correctOptions.map((opt) => opt.option_id);
  const totalCorrect = correctIds.length;

  if (totalCorrect === 0) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  // Count correct and incorrect selections
  let correctSelections = 0;
  let incorrectSelections = 0;

  for (const selectedId of selectedIds) {
    if (correctIds.includes(selectedId)) {
      correctSelections++;
    } else {
      incorrectSelections++;
    }
  }

  if (question.allow_partial_credit) {
    // Partial credit formula: (correct - incorrect) / total * points
    const score = Math.max(
      0,
      ((correctSelections - incorrectSelections) / totalCorrect) * maxPoints
    );
    const isFullyCorrect =
      correctSelections === totalCorrect && incorrectSelections === 0;

    return {
      isCorrect: isFullyCorrect,
      pointsEarned: Math.round(score * 100) / 100,
    };
  } else {
    // All or nothing
    const isCorrect =
      correctSelections === totalCorrect && incorrectSelections === 0;
    return {
      isCorrect,
      pointsEarned: isCorrect ? maxPoints : 0,
    };
  }
};

/**
 * Grade true/false question
 */
const gradeTrueFalse = (question, response, maxPoints) => {
  if (!response.selected_option_id) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const correctOption = question.AnswerOptions.find((opt) => opt.is_correct);
  const isCorrect =
    correctOption && response.selected_option_id === correctOption.option_id;

  return {
    isCorrect,
    pointsEarned: isCorrect ? maxPoints : 0,
  };
};

/**
 * Grade fill-in-the-blank question
 */
const gradeFillInBlank = (question, response, maxPoints) => {
  const userAnswer = (response.text_response || "").trim();
  if (!userAnswer) {
    return { isCorrect: false, pointsEarned: 0 };
  }

  const correctAnswers = question.correct_answers || [];
  const caseSensitive = question.case_sensitive;

  // Check against all acceptable answers
  const isCorrect = correctAnswers.some((correctAnswer) => {
    if (caseSensitive) {
      return userAnswer === correctAnswer.trim();
    } else {
      return userAnswer.toLowerCase() === correctAnswer.trim().toLowerCase();
    }
  });

  return {
    isCorrect,
    pointsEarned: isCorrect ? maxPoints : 0,
  };
};

/**
 * Calculate letter grade from percentage
 */
const calculateLetterGrade = (percentage) => {
  if (percentage >= 90) return "A";
  if (percentage >= 80) return "B";
  if (percentage >= 70) return "C";
  if (percentage >= 60) return "D";
  return "F";
};

/**
 * Grade a single response manually
 * @param {number} responseId - The response ID
 * @param {number} pointsEarned - Points to award
 * @param {string} feedback - Grader's feedback
 * @param {number} graderId - The grader's employee ID
 */
const gradeResponseManually = async (
  responseId,
  pointsEarned,
  feedback,
  graderId
) => {
  const response = await StudentResponse.findByPk(responseId, {
    include: [
      { model: Question, as: "question" },
      { model: ExamAttempt, as: "attempt" },
    ],
  });

  if (!response) {
    throw new Error("Response not found");
  }

  const maxPoints = parseFloat(response.question.points) || 1;
  const points = Math.min(Math.max(0, pointsEarned), maxPoints);

  await response.update({
    points_earned: points,
    is_correct: points >= maxPoints * 0.5, // Consider correct if >= 50% of points
    manually_graded: true,
    grader_id: graderId,
    grader_feedback: feedback,
    graded_at: new Date(),
  });

  // Recalculate attempt score
  await recalculateAttemptScore(response.attempt_id);

  // Real-time: notify teachers watching this exam room
  const updatedAttempt = await ExamAttempt.findByPk(response.attempt_id);
  if (updatedAttempt) {
    socketService.emitToExamRoom(updatedAttempt.exam_id, "grading:response_graded", {
      examId: updatedAttempt.exam_id,
      attemptId: response.attempt_id,
      responseId,
      pointsEarned: points,
      totalScore: updatedAttempt.total_score,
      percentage: updatedAttempt.percentage,
    });
  }

  return response;
};

/**
 * Recalculate attempt score after manual grading
 */
const recalculateAttemptScore = async (attemptId) => {
  const attempt = await ExamAttempt.findByPk(attemptId, {
    include: [
      { model: Exam, as: "exam" },
      { model: StudentResponse },
    ],
  });

  if (!attempt) return;

  let totalScore = 0;
  let maxScore = 0;
  let pendingManualGrading = false;

  for (const response of attempt.StudentResponses) {
    maxScore += parseFloat(response.max_points) || 0;

    if (response.requires_manual_grading && !response.manually_graded) {
      pendingManualGrading = true;
    } else {
      totalScore += parseFloat(response.points_earned) || 0;
    }
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const grade = calculateLetterGrade(percentage);
  const passed = percentage >= parseFloat(attempt.exam.pass_percentage);

  await attempt.update({
    total_score: totalScore,
    max_score: maxScore,
    percentage: Math.round(percentage * 100) / 100,
    grade,
    pass_status: passed ? "passed" : "failed",
    status: pendingManualGrading ? attempt.status : "graded",
  });
};

/**
 * Finalize grading for an attempt
 */
const finalizeGrading = async (attemptId, feedback, graderId) => {
  const attempt = await ExamAttempt.findByPk(attemptId, {
    include: [{ model: StudentResponse }],
  });

  if (!attempt) {
    throw new Error("Attempt not found");
  }

  // Check if all responses that require manual grading are graded
  const ungradedResponses = attempt.StudentResponses.filter(
    (r) => r.requires_manual_grading && !r.manually_graded
  );

  if (ungradedResponses.length > 0) {
    throw new Error(
      `${ungradedResponses.length} responses still need manual grading`
    );
  }

  await recalculateAttemptScore(attemptId);

  await attempt.update({
    status: "graded",
    graded_by: graderId,
    graded_at: new Date(),
    instructor_feedback: feedback,
  });

  // Reload to get fresh scores after recalculate
  const finalAttempt = await ExamAttempt.findByPk(attemptId);
  if (finalAttempt) {
    const payload = {
      examId: finalAttempt.exam_id,
      attemptId,
      totalScore: finalAttempt.total_score,
      maxScore: finalAttempt.max_score,
      percentage: finalAttempt.percentage,
      grade: finalAttempt.grade,
      passStatus: finalAttempt.pass_status,
    };
    // Notify teachers watching the exam grading page
    socketService.emitToExamRoom(finalAttempt.exam_id, "grading:attempt_finalized", payload);
    // Notify the student watching their result page
    socketService.emitToAttemptRoom(attemptId, "grading:attempt_finalized", payload);
  }

  return attempt;
};

module.exports = {
  gradeAttempt,
  gradeQuestion,
  gradeResponseManually,
  recalculateAttemptScore,
  finalizeGrading,
  calculateLetterGrade,
};
