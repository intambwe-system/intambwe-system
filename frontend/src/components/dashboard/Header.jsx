import React, { useState } from 'react';
import { Menu, User, LogOut, ChevronDown, Search, Bell, Maximize, Globe, Settings, Moon, Sun } from 'lucide-react';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';
import { useNavigate, useOutletContext } from 'react-router-dom';

const Header = ({ onMenuClick }) => {
  const { employee: user, logout } = useEmployeeAuth();
  const { role } = useOutletContext();
  const navigate = useNavigate();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [searchQuery, setSearchQuery] = useState('');

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'rw', name: 'Kinyarwanda', flag: '🇷🇼' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'sw', name: 'Swahili', flag: '🇰🇪' },
  ];

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleLanguageChange = (code) => {
    setSelectedLanguage(code);
    setShowLanguage(false);
  };

  const handleProfileNavigation = () => {
    navigate(`/${role}/dashboard/profile`);
    setShowDropdown(false);
  };

  const handleLogout = () => {
    setShowDropdown(false);
    logout();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Employee Dashboard</h1>
            <p className="text-xs text-gray-500 hidden md:block">Manage your workspace efficiently</p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <div className="relative">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 relative group"
              title="Search"
            >
              <Search className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
            </button>
            
            {showSearch && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowSearch(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search anything..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoFocus
                    />
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    <p className="px-2">Quick search across all modules</p>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => setShowLanguage(!showLanguage)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 relative group"
              title="Change Language"
            >
              <Globe className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
            </button>
            
            {showLanguage && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowLanguage(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Select Language</p>
                  </div>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors ${
                        selectedLanguage === lang.code ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-2xl">{lang.flag}</span>
                      <span className="text-sm font-medium">{lang.name}</span>
                      {selectedLanguage === lang.code && (
                        <div className="ml-auto w-2 h-2 rounded-full bg-blue-500"></div>
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 relative group"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            {showNotifications && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowNotifications(false)}
                />
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Notifications</h3>
                    <span className="text-xs text-gray-500">Mark all as read</span>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="p-4 text-center text-sm text-gray-500">
                      No new notifications
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
            title={darkMode ? "Light Mode" : "Dark Mode"}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullScreen}
            className="hidden md:block p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate(`/${role}/dashboard/settings`)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-all duration-200 group"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-gray-600 group-hover:text-gray-800" />
          </button>

          {/* Divider */}
          <div className="hidden md:block w-px h-8 bg-gray-200 mx-2"></div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold shadow-lg">
                {user?.emp_name?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-700">{user?.emp_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.emp_role?.replace('_', ' ')}</p>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-800">{user?.emp_name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleProfileNavigation}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    <span className="font-medium">My Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      navigate(`/${role}/dashboard/settings`);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="font-medium">Settings</span>
                  </button>
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;