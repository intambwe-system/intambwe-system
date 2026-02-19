import { io } from "socket.io-client";
import { API_URL } from "../api/api";

// Derive socket URL from API_URL (remove /api suffix)
const SOCKET_URL = API_URL.replace(/\/api\/?$/, "");

let socket = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Connect to Socket.IO server with authentication
 * @param {Object} authData - { token: JWT } for students/employees, { sessionToken: string } for guests
 * @returns {Socket} The connected socket instance
 */
export const connectSocket = (authData = {}) => {
  if (socket?.connected) {
    console.log("Socket already connected");
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: authData,
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
    connectionAttempts = 0;
  });

  socket.on("connect_error", (error) => {
    console.error("Socket connection error:", error.message);
    connectionAttempts++;
    if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error("Max reconnection attempts reached");
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  return socket;
};

/**
 * Get the current socket instance
 * @returns {Socket|null}
 */
export const getSocket = () => socket;

/**
 * Disconnect and clean up socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Check if socket is connected
 * @returns {boolean}
 */
export const isConnected = () => socket?.connected || false;

// ============================================
// EXAM ROOM HELPERS
// ============================================

/**
 * Join an exam room (for teachers monitoring or students taking exam)
 * @param {number} examId
 */
export const joinExamRoom = (examId) => {
  if (socket && examId) {
    socket.emit("exam:join", { examId });
  }
};

/**
 * Leave an exam room
 * @param {number} examId
 */
export const leaveExamRoom = (examId) => {
  if (socket && examId) {
    socket.emit("exam:leave", { examId });
  }
};

/**
 * Join an attempt room (for result page notifications)
 * @param {number} attemptId
 */
export const joinAttemptRoom = (attemptId) => {
  if (socket && attemptId) {
    socket.emit("attempt:join", { attemptId });
  }
};

/**
 * Leave an attempt room
 * @param {number} attemptId
 */
export const leaveAttemptRoom = (attemptId) => {
  if (socket && attemptId) {
    socket.emit("attempt:leave", { attemptId });
  }
};

// ============================================
// RESUME REQUEST HELPERS
// ============================================

/**
 * Join resume request monitoring (for teachers)
 * @param {number[]} examIds - Array of exam IDs to monitor
 */
export const joinResumeMonitoring = (examIds = []) => {
  if (socket) {
    socket.emit("resume:join_teacher", { examIds });
  }
};

/**
 * Leave resume request monitoring
 */
export const leaveResumeMonitoring = () => {
  if (socket) {
    socket.emit("resume:leave_teacher");
  }
};

/**
 * Start waiting for resume approval
 * @param {number} requestId
 */
export const waitForResumeApproval = (requestId) => {
  if (socket && requestId) {
    socket.emit("resume:wait", { requestId });
  }
};

/**
 * Stop waiting for resume approval
 * @param {number} requestId
 */
export const stopWaitingForApproval = (requestId) => {
  if (socket && requestId) {
    socket.emit("resume:leave_wait", { requestId });
  }
};

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Listen for new resume requests (for teachers)
 * @param {Function} callback
 * @returns {Function} Cleanup function
 */
export const onNewResumeRequest = (callback) => {
  if (socket) {
    socket.on("resume:new_request", callback);
    return () => socket.off("resume:new_request", callback);
  }
  return () => {};
};

/**
 * Listen for resume approval (for waiting users)
 * @param {Function} callback
 * @returns {Function} Cleanup function
 */
export const onResumeApproved = (callback) => {
  if (socket) {
    socket.on("resume:approved", callback);
    return () => socket.off("resume:approved", callback);
  }
  return () => {};
};

/**
 * Listen for resume decline (for waiting users)
 * @param {Function} callback
 * @returns {Function} Cleanup function
 */
export const onResumeDeclined = (callback) => {
  if (socket) {
    socket.on("resume:declined", callback);
    return () => socket.off("resume:declined", callback);
  }
  return () => {};
};

/**
 * Listen for resume request expiry (for waiting users)
 * @param {Function} callback
 * @returns {Function} Cleanup function
 */
export const onResumeExpired = (callback) => {
  if (socket) {
    socket.on("resume:expired", callback);
    return () => socket.off("resume:expired", callback);
  }
  return () => {};
};

/**
 * Listen for exam submission events (for teachers)
 * @param {Function} callback
 * @returns {Function} Cleanup function
 */
export const onExamSubmitted = (callback) => {
  if (socket) {
    socket.on("exam:submitted", callback);
    return () => socket.off("exam:submitted", callback);
  }
  return () => {};
};

/**
 * Listen for grading finalized events (for students on result page)
 * @param {Function} callback
 * @returns {Function} Cleanup function
 */
export const onGradingFinalized = (callback) => {
  if (socket) {
    socket.on("grading:attempt_finalized", callback);
    return () => socket.off("grading:attempt_finalized", callback);
  }
  return () => {};
};

export default {
  connectSocket,
  getSocket,
  disconnectSocket,
  isConnected,
  joinExamRoom,
  leaveExamRoom,
  joinAttemptRoom,
  leaveAttemptRoom,
  joinResumeMonitoring,
  leaveResumeMonitoring,
  waitForResumeApproval,
  stopWaitingForApproval,
  onNewResumeRequest,
  onResumeApproved,
  onResumeDeclined,
  onResumeExpired,
  onExamSubmitted,
  onGradingFinalized,
};
