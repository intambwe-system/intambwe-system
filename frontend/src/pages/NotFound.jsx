import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { GraduationCap, Shield, Users } from "lucide-react";

export default function NotFound() {
  const location = useLocation();
  const [showPortals, setShowPortals] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-8">
      <div className="max-w-5xl w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-10 md:p-12">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg">
            <GraduationCap className="w-10 h-10 text-white" strokeWidth={2} />
          </div>

          {showPortals ? (
            <>
              <p className="text-xs font-bold tracking-widest text-slate-500 mb-2 uppercase">
                Intambwe School System
              </p>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">
                Streamline your school management with us
              </h1>
              <p className="text-sm text-slate-600 max-w-2xl">
                Choose the portal that matches your role to continue. If you are still stuck or cannot access your account, please contact your school administrator for help.
              </p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-widest text-red-500 mb-2 uppercase">Error 404</p>
              <h1 className="text-3xl font-bold text-slate-900 mb-3">Page not found</h1>
              <p className="text-sm text-slate-600 max-w-2xl mb-6">
                The page you are looking for does not exist or is no longer available. You can go back and choose the correct portal to continue.
              </p>

              <button
                type="button"
                onClick={() => setShowPortals(true)}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-lg"
              >
                Go back
              </button>
            </>
          )}
        </div>

        {showPortals && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Employee Dashboard card */}
            <div className="border-2 border-slate-200 rounded-xl p-8 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-blue-600" strokeWidth={2} />
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-3 text-center">Employee Dashboard</h2>
              <p className="text-sm text-slate-600 mb-6 text-center">
                For administrators and staff to manage classes, students, attendance, reports, and other school operations.
              </p>

              <ul className="text-sm text-slate-600 mb-6 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Manage classes, subjects, and timetables</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Register students and update student records</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Record attendance and follow up absences</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Generate academic and administrative reports</span>
                </li>
              </ul>

              <Link
                to="/auth/employee/login"
                className="w-full inline-flex items-center justify-center py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Continue as Employee
              </Link>
            </div>

            {/* Student Dashboard card */}
            <div className="border-2 border-slate-200 rounded-xl p-8 hover:border-blue-300 hover:shadow-lg transition-all duration-200">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-blue-600" strokeWidth={2} />
                </div>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-3 text-center">Student Dashboard</h2>
              <p className="text-sm text-slate-600 mb-6 text-center">
                For students to follow their academic progress and communicate with the school.
              </p>

              <ul className="text-sm text-slate-600 mb-6 space-y-2">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>View marks and performance reports</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Submit claims or raise academic concerns</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Request permissions and justification letters</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Access other student services and notices</span>
                </li>
              </ul>

              <Link
                to="/auth/student/login"
                className="w-full inline-flex items-center justify-center py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                Continue as Student
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
