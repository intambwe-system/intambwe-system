/**
 * Exam to Marks Integration Service
 * Auto-records exam scores to the Marks table when exams are fully graded.
 */

const { Marks, ExamAttempt, Exam } = require("../../model");

/**
 * Helper to parse FA/IA field which might be a JSON string or array
 * MySQL JSON fields may return as strings depending on driver
 * @param {any} value - The FA or IA field value
 * @returns {Array} - Parsed array
 */
const parseJsonField = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("Failed to parse JSON field:", value, e);
      return [];
    }
  }
  return [];
};

/**
 * Records an exam attempt score to the Marks table.
 * Only records for:
 * - Registered students (not guests)
 * - Exams with an assessment_type set (FA, IA, or CA)
 * - Fully graded attempts (status = "graded")
 *
 * @param {number} attemptId - The exam attempt ID
 * @returns {Object|null} - The updated Marks record or null if not applicable
 */
const recordExamScoreToMarks = async (attemptId) => {
  try {
    // 1. Fetch attempt with exam details
    const attempt = await ExamAttempt.findByPk(attemptId, {
      include: [{ model: Exam, as: "exam" }],
    });

    // Validate: attempt exists, has exam, has assessment_type
    if (!attempt || !attempt.exam || !attempt.exam.assessment_type) {
      console.log("recordExamScoreToMarks: skipping - no assessment_type");
      return null;
    }

    // Skip for guest attempts (no std_id)
    if (!attempt.std_id) {
      console.log("recordExamScoreToMarks: skipping - guest attempt");
      return null;
    }

    // Only record when fully graded
    if (attempt.status !== "graded") {
      console.log("recordExamScoreToMarks: skipping - status:", attempt.status);
      return null;
    }

    const exam = attempt.exam;
    const assessmentType = exam.assessment_type; // FA, IA, or CA

    // Validate exam has subject
    if (!exam.sbj_id) {
      console.warn(`Exam ${exam.exam_id} has no subject, cannot record to Marks`);
      return null;
    }

    console.log(`Recording: student=${attempt.std_id}, exam=${exam.exam_id}, type=${assessmentType}, semester=${exam.semester}, ac_year=${exam.ac_year}`);

    // 2. Find or create Marks record
    let marks = await Marks.findOne({
      where: {
        std_id: attempt.std_id,
        sbj_id: exam.sbj_id,
        semester: exam.semester || null,
        ac_year: exam.ac_year || null,
      },
    });

    if (!marks) {
      marks = await Marks.create({
        std_id: attempt.std_id,
        sbj_id: exam.sbj_id,
        class_id: attempt.class_id,
        semester: exam.semester || null,
        ac_year: exam.ac_year || null,
        emp_id: exam.created_by,
        FA: [],
        IA: [],
      });
      console.log("Created new marks record:", marks.mark_id);
    } else {
      console.log("Found existing marks record:", marks.mark_id, "FA type:", typeof marks.FA, "IA type:", typeof marks.IA);
    }

    // 3. Build score entry
    const scoreEntry = {
      score: parseFloat(attempt.total_score) || 0,
      maxScore: parseFloat(attempt.max_score || exam.total_points) || 100,
      label: exam.title,
      exam_id: exam.exam_id,
      attempt_id: attempt.attempt_id,
      recorded_at: new Date().toISOString(),
    };

    // 4. Record score based on assessment type
    // Use static Marks.update() to ensure Sequelize properly saves JSON fields
    if (assessmentType === "FA") {
      // Parse existing FA (handle both string and array from MySQL)
      const currentFA = parseJsonField(marks.FA);
      console.log("Current FA before update:", JSON.stringify(currentFA));

      // Check if this exam already recorded (prevent duplicates, allow updates)
      const existingIdx = currentFA.findIndex((f) => f && f.exam_id == exam.exam_id);
      if (existingIdx >= 0) {
        currentFA[existingIdx] = scoreEntry; // Update existing
        console.log("Updated existing FA entry at index:", existingIdx);
      } else {
        currentFA.push(scoreEntry); // Add new
        console.log("Added new FA entry, total:", currentFA.length);
      }

      // Use static update to ensure JSON is properly saved
      const [affectedRows] = await Marks.update(
        { FA: currentFA },
        { where: { mark_id: marks.mark_id } }
      );
      console.log("Saved FA, affected rows:", affectedRows, "data:", JSON.stringify(currentFA));

    } else if (assessmentType === "IA") {
      // Parse existing IA (handle both string and array from MySQL)
      const currentIA = parseJsonField(marks.IA);
      console.log("Current IA before update:", JSON.stringify(currentIA));

      const existingIdx = currentIA.findIndex((f) => f && f.exam_id == exam.exam_id);
      if (existingIdx >= 0) {
        currentIA[existingIdx] = scoreEntry;
        console.log("Updated existing IA entry at index:", existingIdx);
      } else {
        currentIA.push(scoreEntry);
        console.log("Added new IA entry, total:", currentIA.length);
      }

      // Use static update to ensure JSON is properly saved
      const [affectedRows] = await Marks.update(
        { IA: currentIA },
        { where: { mark_id: marks.mark_id } }
      );
      console.log("Saved IA, affected rows:", affectedRows, "data:", JSON.stringify(currentIA));

    } else if (assessmentType === "CA") {
      const [affectedRows] = await Marks.update(
        {
          CA_score: scoreEntry.score,
          CA_maxScore: scoreEntry.maxScore,
        },
        { where: { mark_id: marks.mark_id } }
      );
      console.log("Saved CA, affected rows:", affectedRows, "score:", scoreEntry.score, "/", scoreEntry.maxScore);
    }

    console.log(
      `SUCCESS: Recorded exam score to Marks: student=${attempt.std_id}, exam=${exam.exam_id}, type=${assessmentType}, score=${scoreEntry.score}/${scoreEntry.maxScore}`
    );

    // Reload to return fresh data
    await marks.reload();
    return marks;
  } catch (error) {
    console.error("Error recording exam score to Marks:", error);
    throw error;
  }
};

module.exports = { recordExamScoreToMarks };
