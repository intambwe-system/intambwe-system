import React, { useState } from 'react';
import {
  Menu, X, Home, Users, Package, ShoppingCart, BarChart3, TrendingDown,
  Archive, FolderTree, BookOpen, GraduationCap, Award, Settings,
  Building2, LogOut, ChevronDown, FileText, ClipboardCheck, Bell
} from 'lucide-react';
import {useNavigate}  from 'react-router-dom'

import  {useEmployeeAuth}  from '../../contexts/EmployeeAuthContext'

// Mock context for demo



const Sidebar = ({ isOpen = true, onClose = () => {} }) => {
  const { employee: user, logout } = useEmployeeAuth();
  const navigate = useNavigate();

  const [openSections, setOpenSections] = useState({});
  const [currentRoute, setCurrentRoute] = useState('/employee/dashboard');

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleNavigation = (path) => {
    setCurrentRoute(path);
    navigate(path);
    onClose?.();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/auth/employee/login');
  };

  // Define menu based on roles — fully dynamic with role-based children
  const menuItems = [
    {
      title: 'Dashboard',
      icon: Home,
      path: '/employee/dashboard',
      roles: ['teacher', 'admin', 'stock_manager'],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Staff',
      icon: Settings,
      roles: ['admin'],
      color: 'from-purple-500 to-pink-500',
      children: [
        { 
          title: 'Employees', 
          icon: Users, 
          path: '/employee/dashboard/employees',
          roles: ['admin'] // Only admin can see this
        },
        { 
          title: 'Departments', 
          icon: Building2, 
          path: '/employee/dashboard/department',
          roles: ['admin'] // Only admin can see this
        },
      ]
    },
    {
      title: 'Inventory',
      icon: Package,
      roles: ['stock_manager', 'admin'],
      color: 'from-orange-500 to-red-500',
      children: [
        { 
          title: 'Products', 
          icon: Package, 
          path: '/employee/dashboard/product',
          roles: ['stock_manager', 'admin']
        },
        { 
          title: 'Categories', 
          icon: FolderTree, 
          path: '/employee/dashboard/category',
          roles: ['stock_manager', 'admin']
        },
        { 
          title: 'Inventory', 
          icon: Archive, 
          path: '/employee/dashboard/inventory',
          roles: ['stock_manager', 'admin']
        },
        { 
          title: 'Stock In', 
          icon: TrendingDown, 
          path: '/employee/dashboard/stockin',
          roles: ['stock_manager', 'admin']
        },
        { 
          title: 'Stock Out', 
          icon: ShoppingCart, 
          path: '/employee/dashboard/stockout',
          roles: ['stock_manager', 'admin']
        }
      ]
    },
    {
      title: 'Sales',
      icon: BarChart3,
      roles: ['stock_manager', 'admin'],
      color: 'from-green-500 to-emerald-500',
      children: [
        { 
          title: 'Sales Report', 
          icon: BarChart3, 
          path: '/employee/dashboard/sales-report',
          roles: ['stock_manager', 'admin']
        },
        { 
          title: 'Sales Return', 
          icon: TrendingDown, 
          path: '/employee/dashboard/sales-return',
          roles: ['admin'] // Only admin can see returns
        }
      ]
    },
    {
      title: 'Academic',
      icon: BookOpen,
      roles: ['teacher', 'admin'],
      color: 'from-indigo-500 to-blue-500',
      children: [
        { 
          title: 'Classes', 
          icon: GraduationCap, 
          path: '/employee/dashboard/classes',
          roles: ['teacher', 'admin']
        },
        { 
          title: 'Trades', 
          icon: Building2, 
          path: '/employee/dashboard/trades',
          roles: [ 'admin']
        },
        { 
          title: 'Students', 
          icon: Users, 
          path: '/employee/dashboard/students',
          roles: ['teacher', 'admin']
        },
        { 
          title: 'Reports', 
          icon: Award, 
          path: '/employee/dashboard/report',
          roles: ['teacher', 'admin']
        },
        { 
          title: 'Subjects', 
          icon: BookOpen, 
          path: '/employee/dashboard/subjects',
          roles: [ 'admin']
        },
        { 
          title: 'My Subjects', 
          icon: BookOpen, 
          path: '/employee/dashboard/my-subjects',
          roles: ['teacher']
        },
        {
          title: 'Assign Subjects',
          icon: BookOpen,
          path: '/employee/dashboard/assign-class-subjects',
          roles: ['admin'] // Only admin can assign subjects
        },
        {
          title: 'Exams',
          icon: FileText,
          path: '/employee/dashboard/exams',
          roles: ['teacher', 'admin']
        },
        {
          title: 'My Exams',
          icon: ClipboardCheck,
          path: '/employee/dashboard/student-exams',
          roles: ['teacher', 'admin', 'student']
        },
        {
          title: 'Resume Requests',
          icon: Bell,
          path: '/employee/dashboard/exams/resume-requests',
          roles: ['teacher', 'admin']
        },
      ]
    }
  ];

  // Filter menu items and their children based on user role
  const filteredMenuItems = menuItems
    .filter(item => item.roles?.includes(user?.emp_role))
    .map(item => {
      if (item.children) {
        // Filter children based on roles
        const filteredChildren = item.children.filter(child => 
          !child.roles || child.roles.includes(user?.emp_role)
        );
        
        // Only include parent if it has visible children
        if (filteredChildren.length > 0) {
          return { ...item, children: filteredChildren };
        }
        return null;
      }
      return item;
    })
    .filter(Boolean); // Remove null items

  if (!user) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[305px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-700/50 transform transition-all duration-300 shadow-2xl ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Menu className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-md font-bold text-white">Dashboard</h2>
              <p className="text-xs text-slate-400">Management System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-all"
          >
            <X className="w-5 h-5 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 mx-4 mt-4 rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/30 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-md shadow-lg">
              {user.emp_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.emp_name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 border border-purple-500/30 capitalize">
                {user.emp_role?.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-2">
            {filteredMenuItems.map((item, idx) => (
              <div key={idx}>
                {item.children ? (
                  <div>
                    <button
                      onClick={() => toggleSection(item.title)}
                      className="w-full flex items-center justify-between px-3 py-3 text-slate-300 rounded-xl hover:bg-slate-800/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <item.icon className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-semibold text-white">{item.title}</span>
                      </div>
                      <ChevronDown className={`w-5 h-5 transition-transform ${openSections[item.title] ? 'rotate-180 text-white' : 'text-slate-400'}`} />
                    </button>

                    <div className={`transition-all duration-300 overflow-hidden ${openSections[item.title] ? 'max-h-96 mt-2 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="ml-6 space-y-1 border-l-2 border-slate-700/50 pl-3">
                        {item.children.map((child, i) => (
                          <button
                            key={i}
                            onClick={() => handleNavigation(child.path)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all ${
                              currentRoute === child.path
                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 hover:translate-x-1'
                            }`}
                          >
                            <child.icon className="w-4 h-4" />
                            <span className="font-medium">{child.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleNavigation(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                      currentRoute === item.path
                        ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border border-blue-500/30 shadow-lg'
                        : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <item.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold">{item.title}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Logout Button - Fixed at Bottom */}
        <div className="p-4 border-t border-slate-700/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
              <LogOut className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">Logout</span>
          </button>
        </div>
      </aside>

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #6366f1, #8b5cf6);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #818cf8, #a78bfa);
        }
      `}</style>
    </>
  );
};

export default Sidebar;