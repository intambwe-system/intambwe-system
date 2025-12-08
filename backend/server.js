// ===================================
// FILE: server.js
// ===================================
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./model");
const employeeRoute = require("./routes/employee");
const studentRoutes = require("./routes/student");

// New modular routes
const attendanceRoutes = require("./routes/attendance/attendanceRoutes");
const classRoutes = require("./routes/class/classRoutes");
const marksRoutes = require("./routes/marks/marksRoutes");
const departmentRoute = require("./routes/department/departmentRoutes");
const specialEventRoutes = require("./routes/specialEvent/specialEventRoutes");
const subjectRoutes = require("./routes/subject/subjectRoutes");
const timetableRoutes = require("./routes/timetable/timetableRoutes");
const timetableEntryRoutes = require("./routes/timetableEntry/timetableEntryRoutes");
const tradeRoutes = require("./routes/trade/tradeRoutes");
const cookieParser = require('cookie-parser')

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(cookieParser())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/employee", employeeRoute);
app.use("/api/student", studentRoutes);


// Newly added resource routes
app.use("/api/attendance", attendanceRoutes);
app.use("/api/class", classRoutes);
app.use("/api/marks", marksRoutes);
app.use("/api/department", departmentRoute);
app.use("/api/special-event", specialEventRoutes);
app.use("/api/subject", subjectRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/timetable-entry", timetableEntryRoutes);
app.use("/api/trade", tradeRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ message: "Attendance Management API is running" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "Something went wrong!", error: err.message });
});

// Database sync and server start
db.sequelize
  .sync({ alter: true })
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
