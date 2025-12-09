import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';

// Route to role mapping - maps routes to allowed roles
const routeRoleMapping = {
  // Admin only routes
  '/employee/dashboard/users': ['admin'],
  '/employee/dashboard/employees': ['admin'],
  '/employee/dashboard/department': ['admin'],
  '/employee/dashboard/settings': ['admin'],
  
  // Stock Manager routes
  '/employee/dashboard/stockout': ['stock_manager', 'admin'],
  '/employee/dashboard/sales-report': ['stock_manager', 'admin'],
  '/employee/dashboard/sales-return': ['stock_manager', 'admin'],
  '/employee/dashboard/stockin': ['stock_manager', 'admin'],
  '/employee/dashboard/category': ['stock_manager', 'admin'],
  '/employee/dashboard/product': ['stock_manager', 'admin'],
  '/employee/dashboard/inventory': ['stock_manager', 'admin'],
  
  // Teacher routes
  '/employee/dashboard/students': ['teacher', 'admin'],
  '/employee/dashboard/classes': ['teacher', 'admin'],
  '/employee/dashboard/grades': ['teacher', 'admin'],
  '/employee/dashboard/trades': ['teacher', 'admin'],
  '/employee/dashboard/subjects': ['teacher', 'admin'],
  
  // Shared routes (all authenticated employees)
  '/employee/dashboard': ['teacher', 'admin', 'stock_manager'],
  '/employee/dashboard/profile': ['teacher', 'admin', 'stock_manager'],
};

export const hasAccess = (route, userRole) => {
    const allowedRoles = routeRoleMapping[route];
    return allowedRoles && allowedRoles.includes(userRole);
};


const PrivateEmployeeRoute = ({ children }) => {
  const { employee, isAuthenticated, loading } = useEmployeeAuth();
  const location = useLocation();

  // Check if employee has permission to access the route
  const checkRolePermission = () => {
    const currentPath = location.pathname;

    // Find if current path matches any protected route
    const matchedRoute = Object.keys(routeRoleMapping).find(route =>
      currentPath === route || currentPath.startsWith(route)
    );

    // Route doesn't require specific role permission, allow access
    if (!matchedRoute) {
      return true;
    }

    const allowedRoles = routeRoleMapping[matchedRoute];

    // Check if employee has the required role
    if (!employee || !employee.emp_role) {
      return false;
    }

    // Check if employee's role is in the allowed roles for this route
    return allowedRoles.includes(employee.emp_role);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying employee access...</p>
        </div>
      </div>
    );
  }

  // Check authentication first
  if (!isAuthenticated) {
    return <Navigate to="/auth/employee/login" state={{ from: location }} replace />;
  }

  // Check role permissions
//   if (!checkRolePermission()) {
//     return <Navigate to="/employee/dashboard" replace />;
//   }

  // All checks passed, render children
  return children;
};

export default PrivateEmployeeRoute;