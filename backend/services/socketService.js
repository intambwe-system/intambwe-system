/**
 * Socket.io service – singleton that holds the io instance
 * and provides helpers to emit events to exam/attempt rooms.
 */

let io = null;

const setIO = (socketIO) => {
  io = socketIO;
};

const getIO = () => io;

/** Emit to everyone watching a specific exam (teachers + students in that exam) */
const emitToExamRoom = (examId, event, data) => {
  if (io) {
    io.to(`exam:${examId}`).emit(event, data);
  }
};

/** Emit to everyone watching a specific attempt (student on result page) */
const emitToAttemptRoom = (attemptId, event, data) => {
  if (io) {
    io.to(`attempt:${attemptId}`).emit(event, data);
  }
};

/** Emit to teachers watching resume requests for a specific exam */
const emitResumeRequestToExam = (examId, event, data) => {
  if (io) {
    io.to(`resume:exam:${examId}`).emit(event, data);
  }
};

/** Emit to all teachers watching resume requests */
const emitToAllTeachers = (event, data) => {
  if (io) {
    io.to("resume:teachers").emit(event, data);
  }
};

/** Emit to a specific waiting user (by request ID) */
const emitToResumeRequest = (requestId, event, data) => {
  if (io) {
    io.to(`resume:request:${requestId}`).emit(event, data);
  }
};

/** Emit a new resume request to both exam room and all teachers */
const notifyNewResumeRequest = (examId, requestData) => {
  const event = "resume:new_request";
  emitResumeRequestToExam(examId, event, requestData);
  emitToAllTeachers(event, requestData);
};

/** Notify user that their resume request was approved */
const notifyResumeApproved = (requestId, approvalData) => {
  emitToResumeRequest(requestId, "resume:approved", approvalData);
};

/** Notify user that their resume request was declined */
const notifyResumeDeclined = (requestId, declineData) => {
  emitToResumeRequest(requestId, "resume:declined", declineData);
};

/** Notify user that their resume request expired */
const notifyResumeExpired = (requestId) => {
  emitToResumeRequest(requestId, "resume:expired", {
    message: "Your resume request has expired. Please contact your instructor.",
  });
};

module.exports = {
  setIO,
  getIO,
  emitToExamRoom,
  emitToAttemptRoom,
  // Resume request helpers
  emitResumeRequestToExam,
  emitToAllTeachers,
  emitToResumeRequest,
  notifyNewResumeRequest,
  notifyResumeApproved,
  notifyResumeDeclined,
  notifyResumeExpired,
};
