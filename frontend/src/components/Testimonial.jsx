import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import gitegoImg from '../assets/gitego.jpeg'
import aliceImg from '../assets/alice.jpeg'
import kelliaImg from '../assets/kellia.png'


export default function Testimonial() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [cardsPerView, setCardsPerView] = useState(3);
  
  const testimonials = [
    {
      name: "Gitego Faycal",
      role: "Teacher",
      message: "Intambwe School has transformed my daughter's education. The teachers are dedicated and the environment is nurturing.",
      rating: 5,
      image:gitegoImg
    },
    {
      name: "Alice Umubyeyi",
      role: "Parent",
      message: "The comprehensive curriculum and modern facilities have given my son the tools he needs to excel academically.",
      rating: 5,
      image: aliceImg
    },
    {
      name: "Ineza Kellia",
      role: "Student",
      message: "Intambwe School prepared me not just academically, but also helped me develop communication skills and confidence.",
      rating: 5,
      image: kelliaImg
    },
    {
      name: "Ritha Ange",
      role: "Parent",
      message: "What sets Intambwe apart is the personal attention each child receives. My children love going to school here.",
      rating: 5,
      image: aliceImg
      },
    {
      name: "Patrick Izere",
      role: "Parent",
      message: "The integration of technology and traditional teaching methods creates a perfect learning environment for the future.",
      rating: 5,
      image:gitegoImg
    },
    {
      name:"Anne Mary" ,
      role: "Parent",
      message: "Outstanding school with excellent teachers who genuinely care about student success and personal development.",
      rating: 5,
      image:kelliaImg
    }
  ];

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setCardsPerView(3);
      } else if (window.innerWidth >= 640) {
        setCardsPerView(2);
      } else {
        setCardsPerView(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => {
        const maxIndex = testimonials.length - cardsPerView;
        return prevIndex >= maxIndex ? 0 : prevIndex + 1;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials.length, cardsPerView]);

  const maxIndex = testimonials.length - cardsPerView;

  const nextTestimonial = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex >= maxIndex ? 0 : prevIndex + 1
    );
    setIsAutoPlaying(false);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? maxIndex : prevIndex - 1
    );
    setIsAutoPlaying(false);
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  return (
    <div className="w-full bg-gradient-to-br from-blue-50 to-indigo-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">
            What Our Community Says
          </h2>
          <p className="text-sm text-gray-600">
            Hear from parents and students about their Intambwe School experience
          </p>
        </div>

        {/* Testimonials Container */}
        <div className="relative">
          {/* Cards Wrapper */}
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ 
                transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)` 
              }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 px-3"
                  style={{ width: `${100 / cardsPerView}%` }}
                >
                  <div className="bg-white rounded-xl shadow-lg p-6 h-full flex flex-col">
                    {/* Quote Icon */}
                    <div className="text-indigo-200 mb-3">
                      <Quote className="w-8 h-8 fill-current" />
                    </div>

                    {/* Stars */}
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star 
                          key={i} 
                          className="w-4 h-4 fill-yellow-400 text-yellow-400" 
                        />
                      ))}
                    </div>

                    {/* Message */}
                    <div className="flex-grow mb-6">
                      <p className="text-gray-700 text-sm leading-relaxed italic">
                        "{testimonial.message}"
                      </p>
                    </div>

                    {/* Author Info */}
                    <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                      <img 
                        src={testimonial.image} 
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200"
                      />
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">
                          {testimonial.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {testimonial.role}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          {currentIndex > 0 && (
            <button
              onClick={prevTestimonial}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white hover:bg-indigo-50 rounded-full p-3 shadow-lg transition-colors z-10"
              aria-label="Previous testimonials"
            >
              <ChevronLeft className="w-5 h-5 text-indigo-600" />
            </button>
          )}
          {currentIndex < maxIndex && (
            <button
              onClick={nextTestimonial}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white hover:bg-indigo-50 rounded-full p-3 shadow-lg transition-colors z-10"
              aria-label="Next testimonials"
            >
              <ChevronRight className="w-5 h-5 text-indigo-600" />
            </button>
          )}
        </div>

        {/* Dots Navigation */}
        <div className="flex justify-center gap-2 mt-8">
          {[...Array(maxIndex + 1)].map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-indigo-600 w-8' 
                  : 'bg-indigo-300 hover:bg-indigo-400'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}