const express = require("express");
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

// Database
const db = require("./model");

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

/* Start Server */
db.sequelize
<<<<<<< HEAD
  .sync({  alter: true })
=======
  .sync({  alter: false })
>>>>>>> 42a7581a746082a2e8b99f94776ffa08ed0c2fc6
  .then(() => {
    console.log("Database synchronized");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Unable to connect to database:", err);
  });

module.exports = app;
