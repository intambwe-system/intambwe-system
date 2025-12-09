import React from 'react';

const HowItWorks = () => {
  return (
    <section className="py-16 px-6 bg-gray-50 font-serif">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <p className="text-cyan-500 text-sm font-semibold tracking-widest uppercase mb-4">
            Research & Pedagogy
          </p>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">
            How It Works?
          </h2>
          <p className="max-w-2xl mx-auto text-gray-600 text-lg leading-relaxed">
           Intambwe School Management System is designed to simplify school operations through an intuitive, digital platform. The workflow is organized around different types of users administrators, teachers, and students each with specific roles and access.
          </p>
        </div>

        {/* Cards + Decorations */}
        <div className="relative">
          {/* Decorative Elements */}
          <span className="absolute text-4xl text-cyan-400 -top-10 left-10 md:left-20">✦</span>
          <span className="absolute text-4xl text-orange-400 top-10 left-32 md:left-72">✦</span>
          <span className="absolute text-5xl text-purple-500 top-0 right-40 md:right-80">★</span>
          <span className="absolute text-5xl text-green-500 top-20 right-16 md:right-32">★</span>
          <span className="absolute text-4xl text-blue-500 bottom-10 right-10 md:right-20">▶</span>

          <div className="absolute w-2 h-2 bg-gray-400 rounded-full top-32 left-8 md:left-16"></div>
          <div className="absolute w-2 h-2 bg-orange-500 rounded-full top-48 left-52 md:left-96"></div>
          <div className="absolute w-2 h-2 bg-orange-500 rounded-full bottom-32 right-64 md:right-96"></div>
          <div className="absolute w-2 h-2 bg-purple-600 rounded-full top-20 right-48 md:right-80"></div>

          {/* Dashed Connecting Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 1 }}>
            <line x1="18%" y1="38%" x2="38%" y2="48%" stroke="#b3e5fc" strokeWidth="3" strokeDasharray="10,8" />
            <line x1="42%" y1="50%" x2="62%" y2="44%" stroke="#b3e5fc" strokeWidth="3" strokeDasharray="10,8" />
            <line x1="65%" y1="42%" x2="85%" y2="52%" stroke="#b3e5fc" strokeWidth="3" strokeDasharray="10,8" />
          </svg>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 justify-items-center relative z-10">
            {/* Card 1 */}
            <div className="bg-white border-4 border-dashed border-cyan-200 rounded-xl p-6 max-w-sm shadow-lg transform -rotate-3 hover:rotate-0 hover:-translate-y-3 transition-all duration-300">
              <img
                src="https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=400&h=300&fit=crop"
                alt="Facility"
                className="w-full h-52 object-cover rounded-lg mb-5"
              />
              <h3 className="text-xl font-bold text-gray-800 mb-3">stock management</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
            The system helps schools keep track of books, supplies, and resources, monitor stock levels, and ensure everything needed for classes is available on time.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white border-4 border-dashed border-cyan-200 rounded-xl p-6 max-w-sm shadow-lg transform rotate-3 mt-8 lg:mt-12 hover:rotate-0 hover:-translate-y-3 transition-all duration-300">
              <img
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=300&fit=crop"
                alt="E-Learning"
                className="w-full h-52 object-cover rounded-lg mb-5"
              />
              <h3 className="text-xl font-bold text-gray-800 mb-3">Student Access</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Students can access their personal profiles, view enrolled classes and subjects, track attendance and academic progress, and stay updated on timetables, assignments, and school events.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white border-4 border-dashed border-cyan-200 rounded-xl p-6 max-w-sm shadow-lg transform -rotate-1 mt-4 lg:mt-8 hover:rotate-0 hover:-translate-y-3 transition-all duration-300">
              <img
                src="https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop"
                alt="Kid's Courses"
                className="w-full h-52 object-cover rounded-lg mb-5"
              />
              <h3 className="text-xl font-bold text-gray-800 mb-3">Teacher Access</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
               Teachers manage their assigned classes and subjects, track lessons, record student attendance, submit performance notes, and communicate important updates, events, or assignments to students.
              </p>
            </div>

            {/* Card 4 */}
            <div className="bg-white border-4 border-dashed border-cyan-200 rounded-xl p-6 max-w-sm shadow-lg transform rotate-2 hover:rotate-0 hover:-translate-y-3 transition-all duration-300">
              <img
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop"
                alt="Best Students"
                className="w-full h-52 object-cover rounded-lg mb-5"
              />
              <h3 className="text-xl font-bold text-gray-800 mb-3">Secure & User-Friendly</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
               The system provides secure login for each user type, ensures role-based access to maintain privacy, and offers a responsive interface accessible on both desktop and mobile devices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;