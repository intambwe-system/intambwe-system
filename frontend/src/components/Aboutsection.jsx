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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        body {
          font-family: 'Inter', 'Arial', system-ui, -apple-system, sans-serif;
        }
        `
      }} />

      <div className="min-h-screen bg-white py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-8xl mx-auto">
          {/* Header Section */}
          <div className={`text-center mb-20 transform transition-all duration-1000 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-50 border-2 border-blue-200 mb-6">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span className="text-blue-600 font-bold">About Us</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-black mb-6 text-gray-900">
              About{' '}
              <span className="text-blue-600">INTAMBWE</span>
            </h1>
          </div>

          {/* Main About Content with Image */}
          <div className={`mb-20 transform transition-all duration-1000 delay-200 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <div>
                <h2 className="text-4xl font-black mb-6 text-gray-900">
                  Empowering Education Through Technology
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed mb-6">
                  Intambwe School Management System is a comprehensive platform designed to streamline educational administration and enhance learning experiences across Rwanda.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed mb-6">
                  We understand the challenges schools face in managing student records, tracking academic performance, and maintaining effective communication between teachers, students, and parents.
                </p>
                <p className="text-lg text-gray-600 leading-relaxed">
                  Our mission is to provide schools with powerful, user-friendly tools that simplify administrative tasks and improve educational outcomes for every student.
                </p>
              </div>

              {/* Image */}
              <div className="relative">
                <div className="absolute -inset-4 bg-blue-600 rounded-3xl blur-3xl opacity-20"></div>
                <img 
                  src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=600&fit=crop"
                  alt="Students collaborating"
                  className="relative rounded-3xl shadow-2xl w-full h-auto border-8 border-blue-100"
                />
              </div>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className={`grid md:grid-cols-2 gap-8 mb-20 transform transition-all duration-1000 delay-400 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-10 shadow-lg border-2 border-blue-100 hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black mb-4 text-gray-900">Our Mission</h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                To provide schools with powerful, user-friendly tools that simplify administrative tasks, enhance communication, and improve educational outcomes for every student.
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl p-10 shadow-lg border-2 border-blue-100 hover:shadow-xl transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-6">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black mb-4 text-gray-900">Our Vision</h2>
              <p className="text-gray-700 text-lg leading-relaxed">
                To be the leading school management system in Rwanda and beyond, empowering educational institutions to reach their full potential through innovative technology.
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className={`bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl p-12 shadow-2xl mb-20 transform transition-all duration-1000 delay-600 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <div className="grid sm:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-6xl font-black text-white mb-2">500+</div>
                <p className="text-blue-100 text-xl font-semibold">Students Managed</p>
              </div>
              <div>
                <div className="text-6xl font-black text-white mb-2">50+</div>
                <p className="text-blue-100 text-xl font-semibold">Schools Served</p>
              </div>
              <div>
                <div className="text-6xl font-black text-white mb-2">99%</div>
                <p className="text-blue-100 text-xl font-semibold">Uptime Reliability</p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className={`text-center transform transition-all duration-1000 delay-800 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <h2 className="text-4xl font-black mb-6 text-gray-900">Ready to Transform Your School?</h2>
            <p className="text-gray-600 text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
              Join hundreds of schools already using Intambwe to streamline their operations and improve student outcomes.
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-5 rounded-xl font-bold text-xl hover:scale-105 transition-all duration-300 shadow-xl shadow-blue-500/30">
              Get Started Today
            </button>
          </div>
        </div>
      </div>
    </>
  );
}