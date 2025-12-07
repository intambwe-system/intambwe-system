import { Suspense } from "react";
import EmployeeDashboardLayout from "../layout/EmployeeDashboardLayout";
import MainLayout from "../layout/MainLayout";
import PrivateEmployeeRoute from "../layout/protectors/PrivateEmployeeRoute";
import EmployeeLogin from "../pages/auth/employee/EmployeeLogin";
import DashboardHomePage from "../pages/dashboard/DashboardHome";
import Home from "../pages/Home";
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import EmployeeProfilePage from "../pages/dashboard/employee/EmployeeProfilePage";
import DepartmentDashboard from "../pages/dashboard/DepartmentPage";

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading...</p>
  </div>
);

const SuspenseWrapper = ({ children }) => {
  return <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
}

const router = createBrowserRouter([
    {
        path: "/",
        element: <MainLayout></MainLayout>,
        children: [
            { index: true, element: <Home /> }
        ],
    },
    {
        path: '/employee',
        element: <PrivateEmployeeRoute><Outlet  context={{role:'employee'}} /></PrivateEmployeeRoute>,
        children: [
            { index: true, element: <Navigate to={'/employee/dashboard'}></Navigate> },
            {
                path: 'dashboard',
                element: <SuspenseWrapper><EmployeeDashboardLayout role={'employee'} /> </SuspenseWrapper>,
                children: [
                    {index:true , element:<DashboardHomePage />},
                    {path:'profile' , element:<EmployeeProfilePage />},
                    {path:'department' , element:<DepartmentDashboard />},


                ],
            }
        ]
    },
    {
        path: '/auth',
        element: <Outlet />,
        children: [
            { path: 'employee/login', element: <EmployeeLogin /> }
        ]
    }
])


export default router;
