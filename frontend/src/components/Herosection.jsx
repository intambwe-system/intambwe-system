import React, { useState, useEffect } from 'react';
import { BookOpen, Users, TrendingUp, ArrowRight, Award, Clock, Shield, Sparkles } from 'lucide-react';

export default function Herosection() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const heroImages = [
    "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1920&h=1080&fit=crop",
    "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=1920&h=1080&fit=crop"
  ];

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', 'Arial', system-ui, -apple-system, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #000000;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-pulse-custom {
          animation: pulse 2s ease-in-out infinite;
        }
        `
      }} />

      <div className="w-full h-screen relative bg-black overflow-hidden">
        {/* Background Image Slideshow */}
        <div className="absolute inset-0">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <img 
                src={image}
                alt={`School background ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/70 to-black/60"></div>
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-float opacity-20"
              style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${15 + Math.random() * 70}%`,
                animationDelay: `${i * 1.5}s`,
                animationDuration: `${6 + i}s`
              }}
            >
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="w-full max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              {/* Left Column - Text Content */}
              <div className="w-full max-w-2xl">
                <div className={`transform transition-all duration-1000 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}>
                  <div className="inline-flex items-center gap-3 mb-6 px-5 py-2 rounded-full border border-blue-400/40 bg-blue-500/10 backdrop-blur-sm">
                    <Sparkles className="w-5 h-5 text-blue-400 animate-pulse-custom" />
                    <span className="text-white font-semibold text-sm sm:text-base">Intambwe School System</span>
                  </div>
                </div>

                <div className={`transform transition-all duration-1000 delay-200 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}>
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
                    Empowering{' '}
                    <span className="text-blue-400 animate-pulse-custom">
                      Education
                    </span>
                    {' '}Through Technology
                  </h1>
                </div>

                <div className={`transform transition-all duration-1000 delay-400 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}>
                  <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
                    Streamline your school operations with our comprehensive management system. From student records to academic performance tracking, we make education management effortless.
                  </p>
                </div>

                <div className={`transform transition-all duration-1000 delay-600 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}>
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="flex items-center gap-2 text-white">
                      <Shield className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <span className="text-sm font-semibold">Secure</span>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <TrendingUp className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <span className="text-sm font-semibold">Efficient</span>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <span className="text-sm font-semibold">24/7 Access</span>
                    </div>
                  </div>
                </div>

                <div className={`flex flex-col sm:flex-row gap-4 transform transition-all duration-1000 delay-800 ${
                  isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                }`}>
                  <button className="group bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-base hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/30">
                    <BookOpen className="w-5 h-5" />
                    Get Started
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </button>

                  <button className="group border-2 border-blue-400 text-white px-8 py-4 rounded-xl font-semibold text-base transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 hover:bg-blue-500/10">
                    <Users className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                    Learn More
                  </button>
                </div>
              </div>

              {/* Right Column - Feature Cards */}
              <div className={`w-full transform transition-all duration-1000 delay-1000 ${
                isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
              }`}>
                <div className="space-y-4">
                  <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                        <Users className="w-7 h-7 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-2">Student Management</h3>
                        <p className="text-gray-300 text-sm leading-relaxed">
                          Complete student records, attendance tracking, and performance analytics all in one place.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center mb-3">
                        <Award className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-white font-bold text-sm mb-1">Grade Tracking</h4>
                      <p className="text-gray-400 text-xs">Monitor academic progress</p>
                    </div>

                    <div className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/10 transition-all duration-300">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center mb-3">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-white font-bold text-sm mb-1">Analytics</h4>
                      <p className="text-gray-400 text-xs">Data-driven insights</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Slide Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'w-8 bg-blue-400' : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  );
}