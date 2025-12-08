import React, { useState, createContext, useContext } from 'react';
import { Menu, X, Home, Users, Package, ShoppingCart, BarChart3, TrendingDown, Archive, FolderTree, BookOpen, GraduationCap, Award, Settings, User, LogOut, ChevronDown, Building2 } from 'lucide-react';
import { hasAccess } from '../../layout/protectors/PrivateEmployeeRoute';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';

// Sidebar Component
const Sidebar = ({ isOpen, onClose }) => {
  const { employee:user } = useEmployeeAuth();
  const [openSections, setOpenSections] = useState({});

const location  = useLocation();
const currentRoute  = location.pathname;
const navigate = useNavigate()

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const menuItems = [
    {
      title: 'Dashboard',
      icon: Home,
      path: '/employee/dashboard',
      roles: ['teacher', 'admin', 'stock_manager']
    },
    {
      title: 'Admin',
      icon: Settings,
      roles: ['admin'],
      children: [
        { title: 'Employees', icon: Users, path: '/employee/dashboard/employees' },
        { title: 'Departments', icon: Building2, path: '/employee/dashboard/department' },
      
      ]
    },
    {
      title: 'Inventory',
      icon: Package,
      roles: ['stock_manager', 'admin'],
      children: [
        { title: 'Products', icon: Package, path: '/employee/dashboard/product' },
        { title: 'Categories', icon: FolderTree, path: '/employee/dashboard/category' },
        { title: 'Inventory', icon: Archive, path: '/employee/dashboard/inventory' },
        { title: 'Stock In', icon: TrendingDown, path: '/employee/dashboard/stockin' },
        { title: 'Stock Out', icon: ShoppingCart, path: '/employee/dashboard/stockout' }
      ]
    },
    {
      title: 'Sales',
      icon: BarChart3,
      roles: ['stock_manager', 'admin'],
      children: [
        { title: 'Sales Report', icon: BarChart3, path: '/employee/dashboard/sales-report' },
        { title: 'Sales Return', icon: TrendingDown, path: '/employee/dashboard/sales-return' }
      ]
    },
    {
      title: 'Academic',
      icon: BookOpen,
      roles: ['teacher', 'admin'],
      children: [
        { title: 'Students', icon: Users, path: '/employee/dashboard/students' },
        { title: 'Classes', icon: GraduationCap, path: '/employee/dashboard/classes' },
        { title: 'Grades', icon: Award, path: '/employee/dashboard/grades' }
      ]
    }
  ];

  const filteredMenuItems = menuItems.filter(item => {
    if (item.roles) {
      return item.roles.includes(user.emp_role);
    }
    return true;
  });

  const handleNavigation = (path) => {
    if (hasAccess(path, user.emp_role)) {
      navigate(path);
      onClose();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-800">Menu</h2>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 overflow-y-auto h-[calc(100vh-73px)]">
          {filteredMenuItems.map((item, idx) => (
            <div key={idx} className="mb-2">
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleSection(item.title)}
                    className="w-full flex items-center justify-between px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5" />
                      <span className="font-medium">{item.title}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        openSections[item.title] ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {openSections[item.title] && (
                    <div className="ml-4 mt-1 space-y-1">
                      {item.children.map((child, childIdx) => (
                        <button
                          key={childIdx}
                          onClick={() => handleNavigation(child.path)}
                          className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${
                            currentRoute === child.path
                              ? 'bg-blue-50 text-blue-600'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          <child.icon className="w-4 h-4" />
                          <span>{child.title}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${
                    currentRoute === item.path
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.title}</span>
                </button>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar