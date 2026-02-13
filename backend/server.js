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

io.on("connection", (socket) => {
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
