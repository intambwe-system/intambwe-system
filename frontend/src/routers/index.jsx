import React, { Suspense } from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router-dom";
import EmployeeDashboardLayout from "../layout/EmployeeDashboardLayout";
import MainLayout from "../layout/MainLayout";
import PrivateEmployeeRoute from "../layout/protectors/PrivateEmployeeRoute";
import EmployeeLogin from "../pages/auth/employee/EmployeeLogin";
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
    { path: "class/:classId", element: <StudentListPage /> },
    { path: "class/:classId/student/:stdId/subject/:sbjId", element: <AddMarksPage /> },
    { path: "marks-entry", element: <MarksEntryPage /> },
 
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

  {
    path: "/auth",
    element: <Outlet />,
    children: [{ path: "employee/login", element: <EmployeeLogin /> }],
  },
 
  {
    path: "*",
    element: <NotFound />,
  },
]);

export default router;
