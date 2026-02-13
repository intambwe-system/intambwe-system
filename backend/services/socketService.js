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

module.exports = { setIO, getIO, emitToExamRoom, emitToAttemptRoom };
