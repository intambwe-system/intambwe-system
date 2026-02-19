const http = require("http");
const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const { Server } = require("socket.io");

// Database
const db = require("./model");

// Socket service singleton
const socketService = require("./services/socketService");
const { authenticateSocket, isTeacherOrAdmin } = require("./middleware/socketAuth");

// Routes
const employeeRoute = require("./routes/employee");
const studentRoutes = require("./routes/student");
const attendanceRoutes = require("./routes/attendance/attendanceRoutes");
const classRoutes = require("./routes/class/classRoutes");
const marksRoutes = require("./routes/marks/");
const departmentRoute = require("./routes/department/departmentRoutes");
const specialEventRoutes = require("./routes/specialEvent/specialEventRoutes");
const subjectRoutes = require("./routes/subject/subjectRoutes");
const timetableRoutes = require("./routes/timetable/timetableRoutes");
const timetableEntryRoutes = require("./routes/timetableEntry/timetableEntryRoutes");
const tradeRoutes = require("./routes/trade/tradeRoutes");
const reportRoutes = require("./routes/report/reportRoute");
const disciplineMarksRoutes = require("./routes/discipline/disciplineMarksRoutes");

// Exam & Assessment Routes
const examRoutes = require("./routes/exam/examRoutes");
const studentExamRoutes = require("./routes/exam/studentExamRoutes");
const publicExamRoutes = require("./routes/exam/publicExamRoutes");
const resumeRequestRoutes = require("./routes/exam/resumeRequestRoutes");

// Upload Routes
const uploadRoutes = require("./routes/uploadRoutes");

// ✅ Correct path for assessment route
const assessmentRoutes = require("./routes/marks/marksRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

/* CORS Configuration */
app.use(
  cors({
    origin: ["http://localhost:5173", process.env.FRONTEND_URL],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* API Routes */
app.use("/api/employee", employeeRoute);
app.use("/api/student", studentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/class", classRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/department", departmentRoute);
app.use("/api/special-event", specialEventRoutes);
app.use("/api/subject", subjectRoutes);

app.use("/api/timetable", timetableRoutes);
app.use("/api/timetable-entry", timetableEntryRoutes);
app.use("/api/trade", tradeRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/assessment", assessmentRoutes);
app.use("/api/discipline-marks", disciplineMarksRoutes);

// Exam & Assessment Platform Routes
app.use("/api/exam", examRoutes);
app.use("/api/student/exam", studentExamRoutes);
app.use("/api/public/exam", publicExamRoutes);
app.use("/api/exam/resume-requests", resumeRequestRoutes);

// Upload Routes
app.use("/api/upload", uploadRoutes);

/* Health Check Route */
app.get("/", (req, res) => {
  res.json({ message: "Attendance Management API is running" });
});

/* Global Error Handler */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: "Something went wrong!",
    error: err.message,
  });
});

// ============================================================
// HTTP Server + Socket.io
// ============================================================
const httpServer = http.createServer(app);

const allowedOrigins = ["http://localhost:5173", process.env.FRONTEND_URL].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

socketService.setIO(io);

// Apply socket authentication middleware
io.use(authenticateSocket);

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id} (${socket.user?.type || "anonymous"})`);

  // Teacher or student joins an exam room
  socket.on("exam:join", ({ examId }) => {
    if (examId) socket.join(`exam:${examId}`);
  });

  socket.on("exam:leave", ({ examId }) => {
    if (examId) socket.leave(`exam:${examId}`);
  });

  // Student joins their own attempt room (result page)
  socket.on("attempt:join", ({ attemptId }) => {
    if (attemptId) socket.join(`attempt:${attemptId}`);
  });

  socket.on("attempt:leave", ({ attemptId }) => {
    if (attemptId) socket.leave(`attempt:${attemptId}`);
  });

  // ============================================
  // RESUME REQUEST SOCKET EVENTS
  // ============================================

  // Teacher joins resume request monitoring for specific exams
  socket.on("resume:join_teacher", ({ examIds }) => {
    if (!isTeacherOrAdmin(socket)) {
      console.log("Non-teacher tried to join resume:teachers room");
      return;
    }
    // Join individual exam rooms
    if (Array.isArray(examIds)) {
      examIds.forEach((id) => {
        if (id) socket.join(`resume:exam:${id}`);
      });
    }
    // Also join the general teachers room
    socket.join("resume:teachers");
    console.log(`Teacher ${socket.user?.name} joined resume monitoring`);
  });

  socket.on("resume:leave_teacher", () => {
    socket.leave("resume:teachers");
    // Note: We don't track which exam rooms they joined, so they stay in those
    console.log(`Teacher ${socket.user?.name} left resume monitoring`);
  });

  // User (student or guest) waiting for resume approval
  socket.on("resume:wait", async ({ requestId }) => {
    if (!requestId) return;

    // Join the request-specific room to receive approval/decline events
    socket.join(`resume:request:${requestId}`);
    console.log(`User waiting for resume approval: request ${requestId}`);

    // Update the ResumeRequest with this socket ID for tracking
    try {
      const { ResumeRequest } = require("./model");
      await ResumeRequest.update(
        { socket_id: socket.id },
        { where: { request_id: requestId, status: "pending" } }
      );
    } catch (err) {
      console.error("Failed to update socket_id for resume request:", err);
    }
  });

  socket.on("resume:leave_wait", ({ requestId }) => {
    if (requestId) {
      socket.leave(`resume:request:${requestId}`);
    }
  });

  // Handle disconnection
  socket.on("disconnect", async () => {
    console.log(`Socket disconnected: ${socket.id}`);

    // Clear socket_id from any pending resume requests
    try {
      const { ResumeRequest } = require("./model");
      await ResumeRequest.update(
        { socket_id: null },
        { where: { socket_id: socket.id, status: "pending" } }
      );
    } catch (err) {
      // Silently ignore - not critical
    }
  });
});

/* Start Server */
db.sequelize
  .sync({ alter: false })
  .then(() => {
    console.log("Database synchronized");
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Unable to connect to database:", err);
  });

module.exports = app;
