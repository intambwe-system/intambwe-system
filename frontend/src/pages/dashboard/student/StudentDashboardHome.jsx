import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Award, Calendar, Clock, BookOpen, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useStudentAuth } from '../../../contexts/StudentAuthContext';
import * as examService from '../../../services/examService';

const StudentDashboardHome = () => {
  const { student } = useStudentAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    availableExams: 0,
    completedExams: 0,
    inProgressExams: 0,
  });
  const [recentExams, setRecentExams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const res = await examService.getAvailableExams();
      const exams = res.data || res || [];

      // Calculate stats
      const available = exams.filter(e => e.can_attempt && e.last_attempt?.status !== 'in_progress').length;
      const inProgress = exams.filter(e => e.last_attempt?.status === 'in_progress').length;
      const completed = exams.filter(e => e.last_attempt?.status === 'submitted' || e.last_attempt?.status === 'graded').length;

      setStats({
        availableExams: available,
        completedExams: completed,
        inProgressExams: inProgress,
      });

      // Get recent exams (max 5)
      setRecentExams(exams.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Available Exams',
      value: stats.availableExams,
      icon: FileText,
      color: 'green',
      path: '/student/dashboard/exams',
    },
    {
      title: 'In Progress',
      value: stats.inProgressExams,
      icon: Clock,
      color: 'amber',
      path: '/student/dashboard/exams',
    },
    {
      title: 'Completed',
      value: stats.completedExams,
      icon: Award,
      color: 'blue',
      path: '/student/dashboard/results',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">
          Welcome back, {student?.std_fname}!
        </h1>
        <p className="text-green-100">
          {student?.Class?.class_name ? `Class: ${student.Class.class_name}` : 'Ready to continue learning?'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => navigate(stat.path)}
              className={`bg-white rounded-xl p-6 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Exams */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Available Exams</h2>
            <button
              onClick={() => navigate('/student/dashboard/exams')}
              className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center"
            >
              View All
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {recentExams.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exams Available</h3>
            <p className="text-gray-500">Check back later for new exams from your teachers.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {recentExams.map((exam) => (
              <div
                key={exam.exam_id}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => navigate(`/student/dashboard/exams/${exam.exam_id}/take`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">{exam.title}</h3>
                      <p className="text-xs text-gray-500">{exam.subject?.sbj_name || 'General'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {exam.has_time_limit && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {exam.time_limit_minutes} min
                      </span>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      exam.last_attempt?.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800'
                        : exam.can_attempt
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {exam.last_attempt?.status === 'in_progress'
                        ? 'Resume'
                        : exam.can_attempt
                          ? 'Start'
                          : 'Completed'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboardHome;
