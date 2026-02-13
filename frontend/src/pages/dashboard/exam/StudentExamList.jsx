import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Clock, FileText, Calendar, ChevronRight, Loader2,
  CheckCircle, XCircle, AlertCircle, Play, Eye, RefreshCw,
  Timer, Award, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as examService from '../../../services/examService';

const StudentExamList = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [operationStatus, setOperationStatus] = useState(null);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const res = await examService.getAvailableExams();
      const data = res.data || res || [];
      setExams(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('error', err.message || 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message, duration = 4000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const getExamStatus = (exam) => {
    if (!exam.can_attempt) {
      return {
        status: 'exhausted',
        label: 'No Attempts Left',
        color: 'gray',
        icon: XCircle
      };
    }

    if (exam.last_attempt?.status === 'in_progress') {
      return {
        status: 'in_progress',
        label: 'Resume Exam',
        color: 'amber',
        icon: RefreshCw
      };
    }

    if (exam.last_attempt?.status === 'submitted' || exam.last_attempt?.status === 'graded') {
      return {
        status: 'completed',
        label: `Attempt ${exam.attempts_used}/${exam.max_attempts}`,
        color: 'green',
        icon: CheckCircle
      };
    }

    return {
      status: 'available',
      label: 'Start Exam',
      color: 'primary',
      icon: Play
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Anytime';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysLeft = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end - now;
    if (diffMs < 0) return null; // already ended
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return { label: 'Ends today', color: 'red' };
    if (diffDays === 1) return { label: '1 day left', color: 'orange' };
    if (diffDays <= 3) return { label: `${diffDays} days left`, color: 'orange' };
    return { label: `${diffDays} days left`, color: 'green' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl flex items-center space-x-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="text-lg text-gray-700">Loading exams...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Exams</h1>
          <p className="text-gray-500 mt-1">View and take available exams</p>
        </div>

        {/* Exam Grid */}
        {exams.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Exams Available</h3>
            <p className="text-gray-500">Check back later for new exams from your teachers.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {exams.map(exam => {
              const status = getExamStatus(exam);
              const StatusIcon = status.icon;
              const daysLeft = getDaysLeft(exam.end_date);

              return (
                <motion.div
                  key={exam.exam_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Title & Subject */}
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${status.color}-100`}>
                            <FileText className={`w-5 h-5 text-${status.color}-600`} />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-lg font-semibold text-gray-900">{exam.title}</h3>
                              {daysLeft && (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                  daysLeft.color === 'red' ? 'bg-red-100 text-red-700' :
                                  daysLeft.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                  'bg-green-100 text-green-700'
                                }`}>
                                  {daysLeft.label}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{exam.subject?.sbj_name}</p>
                          </div>
                        </div>

                        {/* Description */}
                        {exam.description && (
                          <p className="text-gray-600 text-sm mt-3 line-clamp-2">{exam.description}</p>
                        )}

                        {/* Stats */}
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                          <div className="flex items-center text-sm text-gray-500">
                            <FileText className="w-4 h-4 mr-1.5" />
                            <span>{exam.Questions?.length || '?'} Questions</span>
                          </div>

                          {exam.has_time_limit && (
                            <div className="flex items-center text-sm text-gray-500">
                              <Timer className="w-4 h-4 mr-1.5" />
                              <span>{exam.time_limit_minutes} minutes</span>
                            </div>
                          )}

                          <div className="flex items-center text-sm text-gray-500">
                            <Award className="w-4 h-4 mr-1.5" />
                            <span>{exam.total_points || 0} points</span>
                          </div>

                          <div className="flex items-center text-sm text-gray-500">
                            <RefreshCw className="w-4 h-4 mr-1.5" />
                            <span>{exam.attempts_used}/{exam.max_attempts} attempts</span>
                          </div>

                          {exam.access_password && (
                            <div className="flex items-center text-sm text-amber-600">
                              <Lock className="w-4 h-4 mr-1.5" />
                              <span>Password required</span>
                            </div>
                          )}
                        </div>

                        {/* Date Range */}
                        {(exam.start_date || exam.end_date) && (
                          <div className="flex items-center text-sm text-gray-500 mt-3">
                            <Calendar className="w-4 h-4 mr-1.5" />
                            <span>
                              {formatDate(exam.start_date)} - {formatDate(exam.end_date)}
                            </span>
                          </div>
                        )}

                        {/* Last Attempt Result */}
                        {exam.last_attempt && exam.last_attempt.status !== 'in_progress' && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Last Attempt</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-4">
                                <span className="text-sm font-medium text-gray-900">
                                  Score: {exam.last_attempt.total_score}/{exam.last_attempt.max_score}
                                </span>
                                <span className="text-sm text-gray-500">
                                  ({exam.last_attempt.percentage}%)
                                </span>
                                {exam.last_attempt.grade && (
                                  <span className="text-sm font-bold text-primary-600">
                                    Grade: {exam.last_attempt.grade}
                                  </span>
                                )}
                              </div>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                exam.last_attempt.pass_status === 'passed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {exam.last_attempt.pass_status === 'passed' ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="ml-6">
                        <motion.button
                          whileHover={{ scale: exam.can_attempt ? 1.05 : 1 }}
                          whileTap={{ scale: exam.can_attempt ? 0.95 : 1 }}
                          onClick={() => {
                            if (exam.can_attempt) {
                              navigate(`/student/dashboard/exams/${exam.exam_id}/take`);
                            }
                          }}
                          disabled={!exam.can_attempt}
                          className={`flex items-center space-x-2 px-5 py-3 rounded-lg font-medium transition-colors ${
                            status.status === 'in_progress'
                              ? 'bg-amber-600 hover:bg-amber-700 text-white'
                              : status.status === 'available'
                                ? 'bg-primary-600 hover:bg-primary-700 text-white'
                                : status.status === 'completed' && exam.can_attempt
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          <StatusIcon className="w-5 h-5" />
                          <span>{status.label}</span>
                          {exam.can_attempt && <ChevronRight className="w-4 h-4" />}
                        </motion.button>

                        {exam.last_attempt && exam.last_attempt.status !== 'in_progress' && (
                          <button
                            onClick={() => navigate(`/student/dashboard/exams/attempt/${exam.last_attempt.attempt_id}/result`)}
                            className="flex items-center space-x-1 text-primary-600 hover:text-primary-700 text-sm mt-3 mx-auto"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Results</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      <AnimatePresence>
        {operationStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg text-sm ${
              operationStatus.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {operationStatus.type === 'success'
                ? <CheckCircle className="w-5 h-5 text-green-600" />
                : <XCircle className="w-5 h-5 text-red-600" />
              }
              <span className="font-medium">{operationStatus.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentExamList;
