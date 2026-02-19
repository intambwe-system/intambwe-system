// models/index.js
const sequelize = require("../config/database");
const Department = require("./Department");
const Employee = require("./Employee");
const Class = require("./Class");
const Student = require("./Student");
const Subject = require("./Subject");
const Marks = require("./Marks");
const Timetable = require("./Timetable");
const TimetableEntry = require("./TimetableEntry");
const SpecialEvent = require("./SpecialEvent");
const Attendance = require("./Attendance");
const Trade = require("./Trade");
const SubjectTrade = require("./SubjectTrade");
const ClassSubject = require("./ClassSubject");
const DisciplineMarks = require("./DisciplineMarks");

// Exam & Assessment Models
const Exam = require("./Exam");
const Question = require("./Question");
const AnswerOption = require("./AnswerOption");
const ExamAttempt = require("./ExamAttempt");
const StudentResponse = require("./StudentResponse");
const GuestParticipant = require("./GuestParticipant");
const ResumeRequest = require("./ResumeRequest");

// Define Associations

// Department Associations
Department.hasMany(Employee, { foreignKey: "dpt_id", onDelete: "SET NULL" });
Department.hasMany(Class, { foreignKey: "dpt_id", onDelete: "SET NULL" });
Department.hasMany(Student, { foreignKey: "dpt_id", onDelete: "SET NULL" });
Department.hasMany(Subject, { foreignKey: "dpt_id", onDelete: "SET NULL" });

// Employee Associations
Employee.belongsTo(Department, { foreignKey: "dpt_id", as: "department" });
Employee.hasMany(Class, {
  foreignKey: "emp_id",
  as: "classes",
  onDelete: "SET NULL",
});
Employee.hasMany(Subject, {
  foreignKey: "teacher_id",
  as: "subjects",
  onDelete: "SET NULL",
});
Employee.hasMany(Marks, { foreignKey: "emp_id", onDelete: "SET NULL" });
Employee.hasMany(TimetableEntry, {
  foreignKey: "teacher_id",
  onDelete: "SET NULL",
});
Employee.hasMany(SpecialEvent, {
  foreignKey: "teacher_id",
  onDelete: "SET NULL",
});
Employee.hasMany(Attendance, { foreignKey: "emp_id", onDelete: "SET NULL" });


// Class Associations
Class.belongsTo(Department, { foreignKey: "dpt_id" });
Class.belongsTo(Employee, { foreignKey: "emp_id", as: "classTeacher" });
Class.hasMany(Student, { foreignKey: "class_id", onDelete: "SET NULL" });
Class.hasMany(Subject, { foreignKey: "class_id", onDelete: "CASCADE" });
Class.hasMany(Marks, { foreignKey: "class_id", onDelete: "SET NULL" });
Class.hasMany(TimetableEntry, { foreignKey: "class_id", onDelete: "CASCADE" });
Class.hasMany(SpecialEvent, { foreignKey: "class_id", onDelete: "CASCADE" });
Class.hasMany(Attendance, { foreignKey: "class_id", onDelete: "CASCADE" });
Class.hasMany(ClassSubject, { foreignKey: "class_id", onDelete: "CASCADE" });
Trade.hasMany(Class, {
  foreignKey: "trade_id",
  as: "classes",
  onDelete: "CASCADE",
});

Class.belongsTo(Trade, {
  foreignKey: "trade_id",
  as: "Trade",
});

// Student Associations
Student.belongsTo(Class, { foreignKey: "class_id" });
Student.belongsTo(Department, { foreignKey: "dpt_id" });

Student.hasMany(Marks, { foreignKey: "std_id", onDelete: "CASCADE" });
Student.hasMany(Attendance, { foreignKey: "student_id", onDelete: "CASCADE" });

// Subject Associations
Subject.belongsTo(Employee, { foreignKey: "teacher_id", as: "teacher" });
Subject.belongsTo(Class, { foreignKey: "class_id" });
Subject.belongsTo(Department, { foreignKey: "dpt_id" });
Subject.hasMany(Marks, { foreignKey: "sbj_id", onDelete: "CASCADE" });
Subject.hasMany(TimetableEntry, { foreignKey: "sbj_id", onDelete: "SET NULL" });


Subject.hasMany(ClassSubject, { foreignKey: "sbj_id", onDelete: "CASCADE" });

// ClassSubject Associations
ClassSubject.belongsTo(Class, { foreignKey: "class_id" });
ClassSubject.belongsTo(Subject, { foreignKey: "sbj_id" });
ClassSubject.belongsTo(Employee, { foreignKey: "teacher_id", as: "assignedTeacher" });

// Subject–Trade many-to-many association through SubjectTrade
Subject.belongsToMany(Trade, {
  through: SubjectTrade,
  foreignKey: "sbj_id",
  otherKey: "trade_id",
  as: "trades",
});

Trade.belongsToMany(Subject, {
  through: SubjectTrade,
  foreignKey: "trade_id",
  otherKey: "sbj_id",
  as: "subjects",
});

// Marks Associations
Marks.belongsTo(Student, { foreignKey: "std_id" });
Marks.belongsTo(Subject, { foreignKey: "sbj_id" });
Marks.belongsTo(Class, { foreignKey: "class_id" });
Marks.belongsTo(Employee, { foreignKey: "emp_id", as: "gradedBy" });

// Timetable Associations
Timetable.hasMany(TimetableEntry, {
  foreignKey: "timetable_id",
  onDelete: "CASCADE",
});

// TimetableEntry Associations
TimetableEntry.belongsTo(Timetable, { foreignKey: "timetable_id" });
TimetableEntry.belongsTo(Class, { foreignKey: "class_id" });
TimetableEntry.belongsTo(Subject, { foreignKey: "sbj_id" });
TimetableEntry.belongsTo(Employee, { foreignKey: "teacher_id", as: "teacher" });

// SpecialEvent Associations
SpecialEvent.belongsTo(Class, { foreignKey: "class_id" });
SpecialEvent.belongsTo(Employee, { foreignKey: "teacher_id", as: "teacher" });

// Attendance Associations
// Attendance Associations (add these to your existing models/index.js)
Attendance.belongsTo(Student, { foreignKey: "student_id", as: "student" });
Attendance.belongsTo(Class, { foreignKey: "class_id", as: "class" });
Attendance.belongsTo(Employee, { foreignKey: "emp_id", as: "recordedBy" });

Student.hasMany(DisciplineMarks, {
  foreignKey: "std_id",
  onDelete: "CASCADE",
});

DisciplineMarks.belongsTo(Student, {
  foreignKey: "std_id",
});

Class.hasMany(DisciplineMarks, {
  foreignKey: "class_id",
  onDelete: "SET NULL",
});

DisciplineMarks.belongsTo(Class, {
  foreignKey: "class_id",
});


Employee.hasMany(DisciplineMarks, {
  foreignKey: "emp_id",
  onDelete: "SET NULL",
});

DisciplineMarks.belongsTo(Employee, {
  foreignKey: "emp_id",
});

// ============================================
// EXAM & ASSESSMENT ASSOCIATIONS
// ============================================

// Exam Associations
Exam.belongsTo(Subject, { foreignKey: "sbj_id", as: "subject" });
Exam.belongsTo(Class, { foreignKey: "class_id", as: "class" });
Exam.belongsTo(Employee, { foreignKey: "created_by", as: "creator" });
Exam.hasMany(Question, { foreignKey: "exam_id", onDelete: "CASCADE" });
Exam.hasMany(ExamAttempt, { foreignKey: "exam_id", onDelete: "CASCADE" });

Subject.hasMany(Exam, { foreignKey: "sbj_id", onDelete: "SET NULL" });
Class.hasMany(Exam, { foreignKey: "class_id", onDelete: "SET NULL" });
Employee.hasMany(Exam, { foreignKey: "created_by", as: "createdExams", onDelete: "SET NULL" });

// Question Associations
Question.belongsTo(Exam, { foreignKey: "exam_id", as: "exam" });
Question.belongsTo(Employee, { foreignKey: "created_by", as: "creator" });
Question.hasMany(AnswerOption, { foreignKey: "question_id", onDelete: "CASCADE" });
Question.hasMany(StudentResponse, { foreignKey: "question_id", onDelete: "CASCADE" });

// AnswerOption Associations
AnswerOption.belongsTo(Question, { foreignKey: "question_id", as: "question" });

// ExamAttempt Associations
ExamAttempt.belongsTo(Exam, { foreignKey: "exam_id", as: "exam" });
ExamAttempt.belongsTo(Student, { foreignKey: "std_id", as: "student" });
ExamAttempt.belongsTo(GuestParticipant, { foreignKey: "guest_id", as: "guest" });
ExamAttempt.belongsTo(Class, { foreignKey: "class_id", as: "class" });
ExamAttempt.belongsTo(Employee, { foreignKey: "graded_by", as: "grader" });
ExamAttempt.hasMany(StudentResponse, { foreignKey: "attempt_id", onDelete: "CASCADE" });

Student.hasMany(ExamAttempt, { foreignKey: "std_id", onDelete: "CASCADE" });
GuestParticipant.hasMany(ExamAttempt, { foreignKey: "guest_id", onDelete: "CASCADE" });
Employee.hasMany(ExamAttempt, { foreignKey: "graded_by", as: "gradedAttempts", onDelete: "SET NULL" });

// StudentResponse Associations
StudentResponse.belongsTo(ExamAttempt, { foreignKey: "attempt_id", as: "attempt" });
StudentResponse.belongsTo(Question, { foreignKey: "question_id", as: "question" });
StudentResponse.belongsTo(AnswerOption, { foreignKey: "selected_option_id", as: "selectedOption" });
StudentResponse.belongsTo(Employee, { foreignKey: "grader_id", as: "grader" });

// ResumeRequest Associations
ResumeRequest.belongsTo(Exam, { foreignKey: "exam_id", as: "exam" });
ResumeRequest.belongsTo(ExamAttempt, { foreignKey: "attempt_id", as: "attempt" });
ResumeRequest.belongsTo(Student, { foreignKey: "std_id", as: "student" });
ResumeRequest.belongsTo(GuestParticipant, { foreignKey: "guest_id", as: "guest" });
ResumeRequest.belongsTo(Employee, { foreignKey: "responded_by", as: "responder" });

Exam.hasMany(ResumeRequest, { foreignKey: "exam_id", onDelete: "CASCADE" });
ExamAttempt.hasMany(ResumeRequest, { foreignKey: "attempt_id", onDelete: "CASCADE" });
Student.hasMany(ResumeRequest, { foreignKey: "std_id", onDelete: "CASCADE" });
GuestParticipant.hasMany(ResumeRequest, { foreignKey: "guest_id", onDelete: "CASCADE" });
Employee.hasMany(ResumeRequest, { foreignKey: "responded_by", as: "respondedRequests", onDelete: "SET NULL" });

// Sync database
const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    // Use { force: true } to drop and recreate tables (use with caution!)
    // Use { alter: true } to modify tables to match models
    await sequelize.sync({ alter: false });
    console.log("All models synchronized successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

module.exports = {
  sequelize,
  Department,
  Employee,
  Class,
  Student,
  Subject,
  Marks,
  Timetable,
  TimetableEntry,
  SpecialEvent,
  Attendance,
  SubjectTrade,
  syncDatabase,
  Trade,
  ClassSubject,
  DisciplineMarks,
  // Exam & Assessment Models
  Exam,
  Question,
  AnswerOption,
  ExamAttempt,
  StudentResponse,
  GuestParticipant,
  ResumeRequest,
};
