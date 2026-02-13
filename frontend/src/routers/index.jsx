import React, { Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import EmployeeDashboardLayout from "../layout/EmployeeDashboardLayout";
import StudentDashboardLayout from "../layout/StudentDashboardLayout";
import MainLayout from "../layout/MainLayout";
import PrivateEmployeeRoute from "../layout/protectors/PrivateEmployeeRoute";
import PrivateStudentRoute from "../layout/protectors/PrivateStudentRoute";
import EmployeeLogin from "../pages/auth/employee/EmployeeLogin";
import StudentLogin from "../pages/auth/student/StudentLogin";
import DashboardHomePage from "../pages/dashboard/DashboardHome";
import Home from "../pages/Home";
import EmployeeProfilePage from "../pages/dashboard/employee/EmployeeProfilePage";
import DepartmentDashboard from "../pages/dashboard/DepartmentPage";
import EmployeeManagementDashboard from "../pages/dashboard/EmployeeManagement";
import TradeManagementSystem from "../pages/dashboard/employee/trade/TradeManagementSystem";

import StudentManagementDashboard from "../pages/dashboard/StudentManagementDashboard";
import ClassManagementDashboard from "../pages/dashboard/class/ClassManagement";

import SubjectPage from "../pages/dashboard/SubjectPage";
import StudentRegistrationForm from "../components/dashboard/student/StudentRegistrationForm";
import StudentViewPage from "../components/dashboard/student/StudentViewPage";
import AssignClassSubjectsPage from "../pages/dashboard/AssignClassSubjectsPage";
import NotFound from "../pages/NotFound";
import AttendanceMarkingPage from "../pages/dashboard/AttendanceMarkingPage";
import MySubjectsPage from "../pages/dashboard/teacher/MySubjectsPage";
import ClassSelectionPage from "../pages/dashboard/ClassSelectionPage";
import StudentListPage from "../pages/dashboard/StudentListPage";
import AddMarksPage from "../pages/dashboard/AddMarksPage";
import MarksEntryPage from "../pages/dashboard/MarksEntryPage";
import AttendanceDashboard from "../pages/dashboard/AttendanceDashboard";
import TraineeAssessmentReport from "../pages/dashboard/ReportDisplay";
import ClassBulkReportsViewer from "../pages/dashboard/ClassBulkReportsViewer";
import DisciplineEntryPage from "../pages/dashboard/DisciplineEntryPage";
import ExamManagement from "../pages/dashboard/exam/ExamManagement";
import ExamCreator from "../pages/dashboard/exam/ExamCreator";
import QuestionEditor from "../pages/dashboard/exam/QuestionEditor";
import GradingDashboard from "../pages/dashboard/exam/GradingDashboard";
import ExamResponses from "../pages/dashboard/exam/ExamResponses";
import PublicExamParticipants from "../pages/dashboard/exam/PublicExamParticipants";
import TakeExam from "../pages/dashboard/exam/TakeExam";
import StudentExamList from "../pages/dashboard/exam/StudentExamList";
import ExamResult from "../pages/dashboard/exam/ExamResult";

// Student Dashboard Pages
import StudentDashboardHome from "../pages/dashboard/student/StudentDashboardHome";
import StudentResults from "../pages/dashboard/student/StudentResults";

// Public Exam Pages
import PublicExam from "../pages/public/PublicExam";
import PublicExamResult from "../pages/public/PublicExamResult";
import PublicExamLookup from "../pages/public/PublicExamLookup";

const LoadingSpinner = () => (

  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);

const SuspenseWrapper = ({ children }) => {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>;
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [{ index: true, element: <Home /> }],
  },
  {
    path: "/employee",
    element: (
      <PrivateEmployeeRoute>
        <Outlet context={{ role: "employee" }} />
      </PrivateEmployeeRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/employee/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: (
          <SuspenseWrapper>
            <EmployeeDashboardLayout role="employee" />
          </SuspenseWrapper>
        ),
        children: [
          { index: true, element: <DashboardHomePage /> },
          { path: "profile", element: <EmployeeProfilePage /> },
          { path: "department", element: <DepartmentDashboard /> },
          { path: "employees", element: <EmployeeManagementDashboard /> },
          { path: "trades", element: <TradeManagementSystem /> },
          { path: "students", element: <StudentManagementDashboard /> },
          { path: "students/create", element: <StudentRegistrationForm /> },
          { path: "students/view/:id", element: <StudentViewPage /> },
          { path: "classes", element: <ClassManagementDashboard /> },
          { path: "subjects", element: <SubjectPage /> },
          { path: "assign-class-subjects", element: <AssignClassSubjectsPage /> },
          { path: "attendance", element: <AttendanceDashboard /> },
          { path: "attendance/mark", element: <AttendanceMarkingPage /> },
          { path: "my-subjects", element: <MySubjectsPage /> },
             { path:"class", element: <ClassSelectionPage /> },
             { path:"discipline-entry", element: <DisciplineEntryPage /> },
    { path: "class/:classId", element: <StudentListPage /> },
    { path: "class/:classId/student/:stdId/subject/:sbjId", element: <AddMarksPage /> },
    { path: "marks-entry", element: <MarksEntryPage /> },
    { path: "report", element: <TraineeAssessmentReport /> },
    { path: "class-report/:classId", element: <ClassBulkReportsViewer /> },
    { path: "exams", element: <ExamManagement /> },
    { path: "exams/create", element: <ExamCreator /> },
    { path: "exams/:examId", element: <Navigate to="edit" replace /> },
    { path: "exams/:examId/edit", element: <ExamCreator /> },
    { path: "exams/:examId/questions", element: <QuestionEditor /> },
    { path: "exams/:examId/responses", element: <ExamResponses /> },
    { path: "exams/:examId/grading", element: <GradingDashboard /> },
    { path: "exams/:examId/participants", element: <PublicExamParticipants /> },
    // Student exam routes (accessible by students)
    { path: "student-exams", element: <StudentExamList /> },
    { path: "student-exams/:examId/take", element: <TakeExam /> },
        ],
      },
      // Any unknown /employee/... path (including unknown dashboard URLs) should render
      // a full-screen NotFound page WITHOUT the dashboard layout (no sidebar/header).
      { path: "*", element: <NotFound /> },
    ],
  },
  // Add these in your employee dashboard routes
{
  path: "marks",
  element: <Outlet />,
  children: [
    { index: true, element: <ClassSelectionPage /> },
    { path: "class/:classId", element: <StudentListPage /> },
    { path: "class/:classId/student/:stdId/subject/:sbjId", element: <AddMarksPage /> },
  ],
},

  // Student Dashboard Routes
  {
    path: "/student",
    element: (
      <PrivateStudentRoute>
        <Outlet />
      </PrivateStudentRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/student/dashboard" replace />,
      },
      {
        path: "dashboard",
        element: (
          <SuspenseWrapper>
            <StudentDashboardLayout />
          </SuspenseWrapper>
        ),
        children: [
          { index: true, element: <StudentDashboardHome /> },
          { path: "exams", element: <StudentExamList /> },
          { path: "exams/:examId/take", element: <TakeExam /> },
          { path: "exams/attempt/:attemptId/result", element: <ExamResult /> },
          { path: "results", element: <StudentResults /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },

  {
    path: "/auth",
    element: <Outlet />,
    children: [
      { path: "employee/login", element: <EmployeeLogin /> },
      { path: "student/login", element: <StudentLogin /> },
    ],
  },

  // Public Exam Routes (no authentication required)
  {
    path: "/public/exam/:uuid",
    element: <PublicExam />,
  },
  {
    path: "/public/exam/:uuid/result/:attemptId",
    element: <PublicExamResult />,
  },
  {
    path: "/public/exam-lookup",
    element: <PublicExamLookup />,
  },

  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
