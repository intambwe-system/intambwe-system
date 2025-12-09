import React, { useState, useEffect } from 'react';
import { Target, Eye, BookOpen } from 'lucide-react';

export default function About() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        body {
          font-family: 'Inter', 'Arial', system-ui, -apple-system, sans-serif;
        }
        `
      }} />

      <div className="bg-gradient-to-b from-gray-50 to-white py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header Section */}
          <div className={`text-center mb-12 transform transition-all duration-1000 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border-2 border-blue-200 mb-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-blue-600 font-semibold text-sm">About Us</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4 text-gray-900">
              About{' '}
              <span className="text-blue-600">INTAMBWE</span>
            </h1>
          </div>

          {/* Main About Content with Image */}
          <div className={`mb-12 transform transition-all duration-1000 delay-200 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Text Content */}
              <div>
                <h2 className="text-2xl font-bold mb-4 text-gray-900">
                  Empowering Education Through Technology
                </h2>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  Intambwe School Management System is a comprehensive platform designed to streamline educational administration and enhance learning experiences across Rwanda.
                </p>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  We understand the challenges schools face in managing student records, tracking academic performance, and maintaining effective communication between teachers, students, and parents.
                </p>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Our mission is to provide schools with powerful, user-friendly tools that simplify administrative tasks and improve educational outcomes for every student.
                </p>
              </div>

              {/* Image */}
              <div className="relative">
                <div className="absolute -inset-4 bg-blue-600 rounded-2xl blur-3xl opacity-20"></div>
                <img 
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=600&fit=crop"
                  alt="Students collaborating"
                  className="relative rounded-lg shadow-lg w-full h-auto border-4 border-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className={`grid md:grid-cols-2 gap-6 mb-12 transform transition-all duration-1000 delay-400 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-base font-semibold mb-2 text-gray-900">Our Mission</h2>
              <p className="text-gray-600 text-xs leading-relaxed">
                To provide schools with powerful, user-friendly tools that simplify administrative tasks, enhance communication, and improve educational outcomes for every student.
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-base font-semibold mb-2 text-gray-900">Our Vision</h2>
              <p className="text-gray-600 text-xs leading-relaxed">
                To be the leading school management system in Rwanda and beyond, empowering educational institutions to reach their full potential through innovative technology.
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className={`bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-8 shadow-lg mb-12 transform transition-all duration-1000 delay-600 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <div className="grid sm:grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-4xl font-bold text-white mb-2">500+</div>
                <p className="text-blue-100 text-sm font-semibold">Students Managed</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">50+</div>
                <p className="text-blue-100 text-sm font-semibold">Schools Served</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-white mb-2">99%</div>
                <p className="text-blue-100 text-sm font-semibold">Uptime Reliability</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className={`text-center transform transition-all duration-1000 delay-800 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Ready to Transform Your School?</h2>
            <p className="text-gray-600 text-sm mb-6 max-w-2xl mx-auto leading-relaxed">
              Join hundreds of schools already using Intambwe to streamline their operations and improve student outcomes.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold text-base hover:scale-105 transition-all duration-300 shadow-lg">
              Get Started Today
            </button>
          </div>
        </div>
      </div>
    </>
  );
}