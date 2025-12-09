import React, { useState } from 'react';
import { Menu, X, GraduationCap, Mail, Phone, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export default function SchoolLandingNavbar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 ">
      {/* Top Header Bar */}
      <div className="bg-blue-600 text-white w-full fixed top-0 z-50">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-10 text-sm">
            {/* Left: Contact Info */}
            <div className="hidden md:flex items-center space-x-6">
              <a href="mailto:info@intambwe.com" className="flex items-center space-x-2 hover:text-blue-200 transition-colors">
                <Mail className="h-4 w-4" />
                <span>info@intambwe.com</span>
              </a>
              <a href="tel:+250788000000" className="flex items-center space-x-2 hover:text-blue-200 transition-colors">
                <Phone className="h-4 w-4" />
                <span>+250 788 000 000</span>
              </a>
            </div>

            {/* Center: Ads Message */}
            <div className="flex-1 text-center mx-4">
              <span className="font-medium">🎓 New Semester Enrollment Now Open - Register Today!</span>
            </div>

            {/* Right: Social Icons */}
            <div className="hidden md:flex items-center space-x-3">
              <a href="#" className="hover:text-blue-200 transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="hover:text-blue-200 transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="hover:text-blue-200 transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="hover:text-blue-200 transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <nav className="bg-white shadow-md w-full fixed top-10 z-40">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Menu Button (Mobile) + Logo */}
            <div className="flex items-center space-x-3">
              <button
                className="md:hidden text-gray-700"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center space-x-2">
                <GraduationCap className="h-8 w-8 text-blue-600" />
                <span className="font-bold text-xl text-gray-800">Intambwe</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="text-gray-700 hover:text-blue-600 transition-colors font-medium"
                >
                  {link.name}
                </a>
              ))}
            </div>

            {/* Right Side Buttons */}
            <div className="flex items-center space-x-3">
              <button className="hidden sm:block px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors">
                Sign In
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar (Mobile) */}
      <aside
        className={`fixed top-10 left-0 h-full w-64 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2 text-blue-600">
            <GraduationCap className="h-7 w-7" />
            <span className="font-bold text-lg">Intambwe</span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="text-gray-600 hover:text-gray-900"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="p-4">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="flex items-center w-full py-3 px-4 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors font-medium"
              onClick={() => setIsSidebarOpen(false)}
            >
              {link.name}
            </a>
          ))}
          
          <div className="mt-6 pt-6 border-t space-y-2">
            <button className="w-full py-2 px-4 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
              Sign In
            </button>
            <button className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Get Started
            </button>
          </div>
        </nav>
      </aside>

    
    </div>
  );
}