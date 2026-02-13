import api from "../api/api";
import { API_URL } from "../api/api";

// ============================================
// IMAGE UPLOAD
// ============================================

/**
 * Upload a question image
 * @param {File} file - The image file to upload
 * @returns {Promise<{url: string, filename: string}>}
 */
export const uploadQuestionImage = async (file) => {
  try {
    const formData = new FormData();
    formData.append("image", file);

    const response = await api.post("/upload/question-image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // Return the full URL - strip /api suffix since uploads are served from root
    const imageUrl = response.data.data.url;
    const baseUrl = API_URL.replace(/\/api\/?$/, "");
    return {
      url: imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl}`,
      filename: response.data.data.filename,
    };
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to upload image");
  }
};

/**
 * Delete a question image
 * @param {string} filename - The filename to delete
 */
export const deleteQuestionImage = async (filename) => {
  try {
    await api.delete(`/upload/question-image/${filename}`);
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to delete image");
  }
};

// ============================================
// PUBLIC EXAM PARTICIPANT MANAGEMENT
// ============================================

export const getPublicExamParticipants = async (examId, filters = {}) => {
  try {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/exam/${examId}/participants?${params}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch participants");
  }
};

export const deletePublicExamAttempt = async (examId, attemptId) => {
  try {
    const response = await api.delete(`/exam/${examId}/participants/${attemptId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to delete attempt");
  }
};

export const lookupPublicExams = async (email, phone) => {
  try {
    const params = {};
    if (email) params.email = email;
    if (phone) params.phone = phone;
    const response = await api.get("/public/exam/lookup/search", { params });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to look up exams");
  }
};

// ============================================
// EXAM MANAGEMENT (Teacher/Admin)
// ============================================

/**
 * Create a new exam
 */
export const createExam = async (examData) => {
  try {
    const response = await api.post("/exam", examData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to create exam");
  }
};

/**
 * Get all exams with optional filters
 */
export const getAllExams = async (filters = {}) => {
  try {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/exam?${params}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch exams");
  }
};

/**
 * Get exam by ID
 */
export const getExamById = async (examId) => {
  try {
    const response = await api.get(`/exam/${examId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch exam");
  }
};

/**
 * Update exam
 */
export const updateExam = async (examId, examData) => {
  try {
    const response = await api.put(`/exam/${examId}`, examData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to update exam");
  }
};

/**
 * Delete exam
 * @param {string|number} examId - Exam ID (can include query params like "123?force=true")
 */
export const deleteExam = async (examId) => {
  try {
    const response = await api.delete(`/exam/${examId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to delete exam");
  }
};

/**
 * Publish exam
 */
export const publishExam = async (examId) => {
  try {
    const response = await api.post(`/exam/${examId}/publish`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to publish exam");
  }
};

/**
 * Unpublish exam (revert to draft)
 */
export const unpublishExam = async (examId) => {
  try {
    const response = await api.post(`/exam/${examId}/unpublish`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to unpublish exam");
  }
};

/**
 * Archive exam
 */
export const archiveExam = async (examId) => {
  try {
    const response = await api.post(`/exam/${examId}/archive`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to archive exam");
  }
};

/**
 * Unarchive exam (revert to draft)
 */
export const unarchiveExam = async (examId) => {
  try {
    const response = await api.post(`/exam/${examId}/unarchive`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to unarchive exam");
  }
};

/**
 * Duplicate exam
 */
export const duplicateExam = async (examId) => {
  try {
    const response = await api.post(`/exam/${examId}/duplicate`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to duplicate exam");
  }
};

// ============================================
// QUESTION MANAGEMENT
// ============================================

/**
 * Add question to exam
 */
export const addQuestion = async (examId, questionData) => {
  try {
    const response = await api.post(`/exam/${examId}/question`, questionData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to add question");
  }
};

/**
 * Get all questions for an exam
 */
export const getExamQuestions = async (examId) => {
  try {
    const response = await api.get(`/exam/${examId}/question`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch questions");
  }
};

/**
 * Update question
 */
export const updateQuestion = async (examId, questionId, questionData) => {
  try {
    const response = await api.put(`/exam/${examId}/question/${questionId}`, questionData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to update question");
  }
};

/**
 * Delete question
 */
export const deleteQuestion = async (examId, questionId) => {
  try {
    const response = await api.delete(`/exam/${examId}/question/${questionId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to delete question");
  }
};

/**
 * Reorder questions
 */
export const reorderQuestions = async (examId, questionIds) => {
  try {
    const response = await api.post(`/exam/${examId}/question/reorder`, { questionIds });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to reorder questions");
  }
};

// ============================================
// STUDENT EXAM ROUTES
// ============================================

/**
 * Get available exams for student
 */
export const getAvailableExams = async () => {
  try {
    const response = await api.get("/student/exam/available");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch available exams");
  }
};

/**
 * Get exam info for student (instructions page)
 */
export const getExamInfoForStudent = async (examId) => {
  try {
    const response = await api.get(`/student/exam/${examId}/info`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch exam info");
  }
};

/**
 * Start exam attempt
 */
export const startExamAttempt = async (examId, accessPassword = null) => {
  try {
    const response = await api.post(`/student/exam/${examId}/start`, {
      access_password: accessPassword,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to start exam");
  }
};

// Alias for TakeExam component
export const startExam = startExamAttempt;

/**
 * Get attempt details
 */
export const getAttempt = async (attemptId) => {
  try {
    const response = await api.get(`/student/exam/attempt/${attemptId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch attempt");
  }
};

/**
 * Submit/save response
 */
export const submitResponse = async (attemptId, responseData) => {
  try {
    const response = await api.put(`/student/exam/attempt/${attemptId}/response`, responseData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to save response");
  }
};

// Alias for TakeExam component
export const saveResponse = submitResponse;

/**
 * Submit exam
 */
export const submitExam = async (attemptId) => {
  try {
    const response = await api.post(`/student/exam/attempt/${attemptId}/submit`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to submit exam");
  }
};

/**
 * Get attempt result
 */
export const getAttemptResult = async (attemptId) => {
  try {
    const response = await api.get(`/student/exam/attempt/${attemptId}/result`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch result");
  }
};

/**
 * Log tab switch (anti-cheating)
 */
export const logTabSwitch = async (attemptId, currentQuestionId) => {
  try {
    const response = await api.post(`/student/exam/attempt/${attemptId}/tab-switch`, {
      current_question_id: currentQuestionId,
    });
    return response.data;
  } catch (error) {
    console.error("Failed to log tab switch:", error);
    return null;
  }
};

/**
 * Get all exam results for student (grouped by subject)
 */
export const getAllResults = async () => {
  try {
    const response = await api.get("/student/exam/results");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch results");
  }
};

// ============================================
// GRADING ROUTES
// ============================================

/**
 * Get exams pending manual grading
 */
export const getPendingGrading = async () => {
  try {
    const response = await api.get("/exam/grading/pending");
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch pending grading");
  }
};

/**
 * Get all responses for an exam
 */
export const getExamResponses = async (examId, filters = {}) => {
  try {
    const params = new URLSearchParams(filters).toString();
    const response = await api.get(`/exam/grading/${examId}/responses?${params}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch responses");
  }
};

/**
 * Grade a single response
 */
export const gradeResponse = async (responseId, pointsEarned, feedback) => {
  try {
    const response = await api.put(`/exam/grading/response/${responseId}`, {
      points_earned: pointsEarned,
      feedback,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to grade response");
  }
};

/**
 * Finalize grading for an attempt
 */
export const finalizeGrading = async (attemptId, feedback) => {
  try {
    const response = await api.post(`/exam/grading/attempt/${attemptId}/finalize`, {
      feedback,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to finalize grading");
  }
};

/**
 * Get grading statistics for an exam
 */
export const getGradingStats = async (examId) => {
  try {
    const response = await api.get(`/exam/grading/${examId}/stats`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch statistics");
  }
};

export default {
  // Exam Management
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

  // Questions
  addQuestion,
  getExamQuestions,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,

  // Student
  getAvailableExams,
  getExamInfoForStudent,
  startExamAttempt,
  startExam,
  getAttempt,
  submitResponse,
  saveResponse,
  submitExam,
  getAttemptResult,
  logTabSwitch,
  getAllResults,

  // Grading
  getPendingGrading,
  getExamResponses,
  gradeResponse,
  finalizeGrading,
  getGradingStats,
};
