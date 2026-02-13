import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  BookOpen,
  FileText,
  Award,
  Calendar,
  User,
  LogOut,
  X,
  GraduationCap
} from 'lucide-react';
import { useStudentAuth } from '../../contexts/StudentAuthContext';

const StudentSidebar = ({ isOpen, onClose }) => {
  const { student, logout } = useStudentAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/student/login');
  };

  const menuItems = [
    {
      label: 'Dashboard',
      icon: Home,
      path: '/student/dashboard',
    },
    {
      label: 'My Exams',
      icon: FileText,
      path: '/student/dashboard/exams',
    },
    {
      label: 'My Results',
      icon: Award,
      path: '/student/dashboard/results',
    },
    {
      label: 'Timetable',
      icon: Calendar,
      path: '/student/dashboard/timetable',
    },
    {
      label: 'Profile',
      icon: User,
      path: '/student/dashboard/profile',
    },
  ];

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Student Portal</h1>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Student Info */}
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-semibold text-lg">
                {student?.std_fname?.[0]}{student?.std_lname?.[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {student?.std_fname} {student?.std_lname}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {student?.Class?.class_name || 'Student'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default StudentSidebar;
