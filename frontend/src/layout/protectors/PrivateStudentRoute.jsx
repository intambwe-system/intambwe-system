import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useStudentAuth } from "../../contexts/StudentAuthContext";

const PrivateStudentRoute = ({ children }) => {
  const { student, isAuthenticated, loading } = useStudentAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2
            size={40}
            className="animate-spin text-green-600 mx-auto mb-4"
          />
          <p className="text-gray-600">Verifying student access...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (!isAuthenticated) {
    return (
      <Navigate to="/auth/student/login" state={{ from: location }} replace />
    );
  }

  // All checks passed, render children
  return children;
};

export default PrivateStudentRoute;
