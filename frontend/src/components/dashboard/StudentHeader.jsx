import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useStudentAuth } from '../../contexts/StudentAuthContext';

const StudentHeader = ({ onMenuClick }) => {
  const { student } = useStudentAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center space-x-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-gray-900 hidden sm:block">
          Welcome, {student?.std_fname}!
        </h2>
      </div>

      {/* Right side */}
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center">
            <span className="text-green-600 font-medium text-sm">
              {student?.std_fname?.[0]}{student?.std_lname?.[0]}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {student?.std_fname} {student?.std_lname}
            </p>
            <p className="text-xs text-gray-500">
              {student?.Class?.class_name || 'Student'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default StudentHeader;
