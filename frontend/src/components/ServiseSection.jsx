import React, { useState } from 'react';
import { FileText, Package, Users, GraduationCap, Calendar, DollarSign, BookOpen, Bell, Award, Shield, Zap, Headphones } from 'lucide-react';

export default function ServiceSection() {
  const [selectedService, setSelectedService] = useState(null);

  const services = [
    {
      id: 1,
      title: "Student Management",
      icon: GraduationCap,
      description: "Comprehensive student records, enrollment, attendance tracking, and academic progress monitoring in one centralized system.",
      color: "text-blue-600"
    },
    {
      id: 2,
      title: "Reports & Analytics",
      icon: FileText,
      description: "Generate detailed reports on academic performance, attendance, financials, and institutional metrics with real-time data visualization.",
      color: "text-blue-600"
    },
    {
      id: 3,
      title: "Inventory Management",
      icon: Package,
      description: "Track school assets, supplies, library books, and equipment. Manage procurement and maintain accurate inventory records.",
      color: "text-blue-600"
    },
    {
      id: 4,
      title: "Employee Management",
      icon: Users,
      description: "Handle staff records, payroll, attendance, performance evaluations, and professional development tracking efficiently.",
      color: "text-blue-600"
    },
    {
      id: 5,
      title: "Timetable Scheduling",
      icon: Calendar,
      description: "Create and manage class schedules, exam timetables, and school events with automatic conflict detection and optimization.",
      color: "text-blue-600"
    },
    {
      id: 6,
      title: "Financial Management",
      icon: DollarSign,
      description: "Process fee payments, track expenses, generate invoices, and manage school budgets with comprehensive financial reporting.",
      color: "text-blue-600"
    },
    {
      id: 7,
      title: "Library System",
      icon: BookOpen,
      description: "Catalog books, manage borrowing and returns, track overdue items, and maintain complete library records digitally.",
      color: "text-blue-600"
    },
    {
      id: 8,
      title: "Communication Hub",
      icon: Bell,
      description: "Send announcements, notifications, and messages to students, parents, and staff through SMS, email, and in-app alerts.",
      color: "text-blue-600"
    }
  ];

  const whyChooseUs = [
    {
      icon: Award,
      title: "Proven Excellence",
      description: "Trusted by leading schools across Rwanda for reliable and efficient management solutions."
    },
    {
      icon: Shield,
      title: "Secure & Compliant",
      description: "Bank-level security with data encryption and compliance with educational data protection standards."
    },
    {
      icon: Zap,
      title: "Easy to Use",
      description: "Intuitive interface designed for educators, with minimal training required for quick adoption."
    },
    {
      icon: Headphones,
      title: "24/7 Support",
      description: "Dedicated local support team available round the clock to assist with any questions or issues."
    }
  ];

  return (
    <div className="bg-gradient-to-b from-gray-50 to-white">
      {/* Services Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-blue-600 text-sm font-semibold uppercase tracking-wide mb-2">
            Our Services
          </p>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            INTAMBWE School Management System
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm">
            Streamline every aspect of your school operations with our comprehensive digital platform designed specifically for Rwandan schools.
          </p>
        </div>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 S">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <div
                key={service.id}
                onClick={() => setSelectedService(selectedService === service.id ? null : service.id)}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 hover:border-blue-200 group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className={`${service.color} mb-4 p-3 bg-gray-50 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={32} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 mb-2">
                    {service.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {selectedService === service.id 
                      ? service.description 
                      : `${service.description.substring(0, 60)}...`}
                  </p>
                  <button className="mt-4 text-blue-600 text-xs font-medium hover:text-blue-700 flex items-center gap-1">
                    {selectedService === service.id ? 'Show less' : 'Learn more'}
                    <span className="text-lg">→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Why Choose Us Section */}
      <div className="bg-white text-black mb-0" >
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900">Why Choose INTAMBWE?</h2>
            <p className="text-black text-sm max-w-2xl mx-auto">
              Join hundreds of schools transforming their administrative processes with Rwanda's leading school management system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {whyChooseUs.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="bg-white-600 backdrop-blur-sm rounded-lg p-6 hover:bg-blue-100 transition-all duration-300 border border-blue-500 shadow-sm"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="bg-blue/20 p-3 rounded-lg mb-4">
                      <Icon size={28} className="text-black" />
                    </div>
                    <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                    <p className="text-xs text-black-100 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}