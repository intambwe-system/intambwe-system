// BlogSection.jsx
import React from "react";

// Sample school updates as blogs
const blogs = [
  {
    category: "Stock Management",
    date: "12 DEC",
    title: "Efficient School Stock Management with Intambwe Project",
    description:
      "Managing school supplies and inventory has never been easier. The Intambwe Project allows schools to track stock levels, monitor supplies in and out, and generate real-time reports on inventory. From textbooks and stationery to laboratory equipment, schools can now maintain accurate records and avoid shortages. By automating stock management, the system helps administrators save time, reduce errors, and ensure that students and teachers always have the resources they need for a smooth learning experience.",
    views: 320,
    comments: 8,
    image: "/image/Stock.jpg",
  },
  {
    category: "Student Registration",
    date: "5 DEC",
    title: "Simplifying Student Registration Across Schools with Intambwe Project",
    description:
      "The Intambwe Project makes student registration easier and more efficient for schools across the region. With this system, schools can manage new enrollments digitally, track student information, and reduce paperwork. Parents and students can register online or at the school office, ensuring all required documents are submitted and records are accurate. By streamlining registration, Intambwe helps schools focus on delivering quality education while providing families with a smooth and convenient enrollment experience.",
    views: 450,
    comments: 15,
    image: "/image/Student.jpg",
  },
  {
    category: "Timetable Management",
    date: "1 DEC",
    title: "Streamlining School Timetables with Intambwe Project",
    description:
      "Creating and managing school timetables can be challenging, but the Intambwe Project simplifies the process. Schools can easily organize classes, assign teachers, and schedule rooms, all in a single digital platform. The system ensures there are no conflicts, helps optimize resources, and allows students and staff to access their schedules anytime. With Intambwe, schools save time, improve coordination, and provide a seamless learning experience for everyone.",
    views: 275,
    comments: 5,
    image: "/image/time.jpg",
  },
];

const BlogCard = ({ blog }) => (
  <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
    <div className="relative">
      <img src={blog.image} alt={blog.title} className="w-full h-48 object-cover" />
      <span className="absolute top-3 left-3 bg-blue-500 text-white text-xs px-2 py-1 rounded">
        {blog.category}
      </span>
      <span className="absolute top-3 right-3 bg-white text-gray-800 text-xs px-2 py-1 rounded">
        {blog.date}
      </span>
    </div>
    <div className="p-4">
      <h3 className="font-semibold text-lg mb-2">{blog.title}</h3>
      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{blog.description}</p>
      <div className="flex justify-between items-center text-gray-500 text-xs">
        <span>👁️ {blog.views}</span>
        <span>💬 {blog.comments}</span>
        <a href="#" className="text-blue-500 flex items-center gap-1 hover:text-blue-600 transition-colors">
          Read → 
        </a>
      </div>
    </div>
  </div>
);

const BlogSection = () => {
  return (
    <div className="bg-gray-50 py-16 px-4 md:px-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold">
          Latest <span className="text-blue-500">Intambwe News</span>
        </h2>
        <p className="text-gray-600 mt-2">
          Stay updated with the latest Intambwe announcements, events, and achievements
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-8">
        {blogs.map((blog, idx) => (
          <BlogCard key={idx} blog={blog} />
        ))}
      </div>

      <div className="text-center">
        <button className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors">
          View All Updates →
        </button>
      </div>
    </div>
  );
};

export default BlogSection;
