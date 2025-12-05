import React, { useState } from 'react';
import { Menu, User, LogOut, ChevronDown,  } from 'lucide-react';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';
import { useNavigate, useOutletContext } from 'react-router-dom';



// Header Component
const Header = ({ onMenuClick }) => {
  const { employee:user, logout } = useEmployeeAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const {role}= useOutletContext()
  const navigate = useNavigate()

  const handleProfileNavigation = ()=>{
    navigate(`/${role}/dashboard/profile`)
    setShowDropdown(false)

  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold text-gray-800">Employee Dashboard</h1>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
              {user.emp_name.charAt(0)}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-700">{user?.emp_name}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.emp_role?.replace('_', ' ')}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              <button
                onClick={handleProfileNavigation}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <User className="w-4 h-4" />
                Profile
              </button>
              <button
                onClick={() => {
                  setShowDropdown(false);
                  logout();
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header