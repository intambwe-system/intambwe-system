import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Filter, CheckCircle, XCircle, Clock, User,
  FileText, ChevronDown, ChevronRight, Save, Send, Loader2, X,
  AlertTriangle, Eye, Edit, Check, MessageSquare, BarChart3, Users, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import * as examService from '../../../services/examService';
import { useSocket } from '../../../contexts/SocketContext.tsx';

const GradingDashboard = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  // State
  const [exam, setExam] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [operationStatus, setOperationStatus] = useState(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Grading state
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [gradingResponses, setGradingResponses] = useState([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [savingGrade, setSavingGrade] = useState(null);
  const [instructorFeedback, setInstructorFeedback] = useState('');

  // Real-time new submissions badge count
  const [liveSubmissions, setLiveSubmissions] = useState(0);

  useEffect(() => {
    loadData();
  }, [examId]);

  // Real-time: join exam room, listen for new submissions
  useEffect(() => {
    if (!socket || !examId) return;
    socket.emit('exam:join', { examId });

    const handleSubmitted = (data) => {
      if (String(data.examId) !== String(examId)) return;
      setLiveSubmissions(prev => prev + 1);
      showToast('success', `${data.studentName} just submitted the exam`);
      // Reload the list to include the new attempt
      loadData();
    };

    socket.on('exam:submitted', handleSubmitted);
    return () => {
      socket.off('exam:submitted', handleSubmitted);
      socket.emit('exam:leave', { examId });
    };
  }, [socket, examId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examRes, statsRes, responsesRes] = await Promise.all([
        examService.getExamById(examId),
        examService.getGradingStats(examId),
        examService.getExamResponses(examId)
      ]);

      setExam(examRes.data || examRes);
      setStats(statsRes.data || statsRes);

      // Group responses by attempt
      const responseData = responsesRes.data || responsesRes;
      const attemptsMap = new Map();

      if (Array.isArray(responseData)) {
        responseData.forEach(r => {
          if (!attemptsMap.has(r.attempt_id)) {
            attemptsMap.set(r.attempt_id, {
              attempt_id: r.attempt_id,
              student: r.student,
              attempt: r.attempt,
              responses: []
            });
          }
          attemptsMap.get(r.attempt_id).responses.push(r);
        });
      }

      setAttempts(Array.from(attemptsMap.values()));
    } catch (err) {
      showToast('error', err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message, duration = 4000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const handleSelectAttempt = async (attemptData) => {
    setSelectedAttempt(attemptData);
    setInstructorFeedback(attemptData.attempt?.instructor_feedback || '');

    // Filter responses that need manual grading
    const manualResponses = attemptData.responses.filter(r =>
      r.question?.requires_manual_grading && !r.is_graded
    );
    setGradingResponses(manualResponses);
  };

  const handleGradeResponse = async (responseId, pointsEarned, feedback) => {
    try {
      setSavingGrade(responseId);
      await examService.gradeResponse(responseId, pointsEarned, feedback);

      // Update local state
      setGradingResponses(prev =>
        prev.map(r =>
          r.response_id === responseId
            ? { ...r, points_earned: pointsEarned, feedback, is_graded: true }
            : r
        )
      );

      showToast('success', 'Grade saved');
    } catch (err) {
      showToast('error', err.message || 'Failed to save grade');
    } finally {
      setSavingGrade(null);
    }
  };

  const handleFinalizeGrading = async () => {
    if (!selectedAttempt) return;

    // Check if all responses are graded
    const ungradedCount = gradingResponses.filter(r => !r.is_graded).length;
    if (ungradedCount > 0) {
      const result = await Swal.fire({
        title: 'Ungraded Responses',
        text: `There are ${ungradedCount} ungraded response(s). Continue anyway?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Finalize',
        cancelButtonText: 'Cancel',
      });
      if (!result.isConfirmed) return;
    }

    try {
      setSavingGrade('finalize');
      await examService.finalizeGrading(selectedAttempt.attempt_id, instructorFeedback);
      showToast('success', 'Grading finalized successfully');
      setSelectedAttempt(null);
      await loadData();
    } catch (err) {
      showToast('error', err.message || 'Failed to finalize grading');
    } finally {
      setSavingGrade(null);
    }
  };

  // Filter attempts
  const filteredAttempts = attempts.filter(a => {
    if (filterStatus !== 'all') {
      const needsGrading = a.responses.some(r => r.question?.requires_manual_grading && !r.is_graded);
      if (filterStatus === 'pending' && !needsGrading) return false;
      if (filterStatus === 'graded' && needsGrading) return false;
    }

    if (searchQuery) {
      const studentName = a.student?.std_name?.toLowerCase() || '';
      const studentId = a.student?.std_reg_no?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      if (!studentName.includes(query) && !studentId.includes(query)) return false;
    }

    return true;
  });

  const getStatusBadge = (attempt) => {
    const needsGrading = attempt.responses.some(r =>
      r.question?.requires_manual_grading && !r.is_graded
    );

    if (needsGrading) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Graded
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl flex items-center space-x-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="text-lg text-gray-700">Loading grading dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/employee/dashboard/exams')}
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-xl font-semibold text-gray-900">Grading Dashboard</h1>
                  {liveSubmissions > 0 && (
                    <span className="flex items-center space-x-1 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                      <Bell className="w-3 h-3" />
                      <span>+{liveSubmissions} new</span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">{exam?.title}</p>
              </div>
            </div>

            {/* Stats Summary */}
            {stats && (
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts || 0}</p>
                  <p className="text-xs text-gray-500">Total Attempts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">{stats.pendingGrading || 0}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.fullyGraded || 0}</p>
                  <p className="text-xs text-gray-500">Completed</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attempts List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Filters */}
              <div className="p-4 border-b border-gray-200 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search students..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="flex space-x-2">
                  {['all', 'pending', 'graded'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        filterStatus === status
                          ? 'bg-primary-100 text-primary-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Attempts */}
              <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                {filteredAttempts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No attempts found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredAttempts.map(attemptData => (
                      <motion.button
                        key={attemptData.attempt_id}
                        whileHover={{ backgroundColor: '#f9fafb' }}
                        onClick={() => handleSelectAttempt(attemptData)}
                        className={`w-full p-4 text-left transition-colors ${
                          selectedAttempt?.attempt_id === attemptData.attempt_id
                            ? 'bg-primary-50 border-l-4 border-primary-500'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-gray-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {attemptData.student?.std_name || 'Unknown Student'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {attemptData.student?.std_reg_no}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="flex items-center justify-between">
                          {getStatusBadge(attemptData)}
                          <span className="text-sm text-gray-500">
                            {attemptData.attempt?.total_score || 0}/{attemptData.attempt?.max_score || 0}
                          </span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grading Panel */}
          <div className="lg:col-span-2">
            {!selectedAttempt ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Edit className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Student</h3>
                <p className="text-gray-500">Choose a student from the list to start grading their responses.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="w-7 h-7 text-primary-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedAttempt.student?.std_name}
                        </h2>
                        <p className="text-gray-500">{selectedAttempt.student?.std_reg_no}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Current Score</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedAttempt.attempt?.total_score || 0}/
                          {selectedAttempt.attempt?.max_score || 0}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Percentage</p>
                        <p className="text-2xl font-bold text-primary-600">
                          {selectedAttempt.attempt?.percentage || 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Responses to Grade */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">
                      Questions Requiring Manual Grading
                    </h3>
                    <p className="text-sm text-gray-500">
                      {gradingResponses.filter(r => !r.is_graded).length} of {gradingResponses.length} pending
                    </p>
                  </div>

                  {gradingResponses.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                      <p>All questions are auto-graded or already graded!</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {gradingResponses.map((response, index) => (
                        <GradeResponseCard
                          key={response.response_id}
                          response={response}
                          index={index}
                          onGrade={handleGradeResponse}
                          saving={savingGrade === response.response_id}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Instructor Feedback & Finalize */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Overall Feedback for Student
                  </h3>

                  <textarea
                    value={instructorFeedback}
                    onChange={(e) => setInstructorFeedback(e.target.value)}
                    placeholder="Add overall feedback for this student's performance..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                  />

                  <div className="flex justify-end mt-4 space-x-3">
                    <button
                      onClick={() => setSelectedAttempt(null)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      onClick={handleFinalizeGrading}
                      disabled={savingGrade === 'finalize'}
                      className="flex items-center space-x-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium disabled:opacity-60"
                    >
                      {savingGrade === 'finalize' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Finalizing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>Finalize Grading</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
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
              <button onClick={() => setOperationStatus(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Grade Response Card Component
const GradeResponseCard = ({ response, index, onGrade, saving }) => {
  const [points, setPoints] = useState(response.points_earned || '');
  const [feedback, setFeedback] = useState(response.feedback || '');
  const [isExpanded, setIsExpanded] = useState(!response.is_graded);

  const handleSave = () => {
    if (points === '' || points < 0) return;
    onGrade(response.response_id, parseFloat(points), feedback);
  };

  return (
    <div className="p-4">
      {/* Question Header */}
      <div
        className="flex items-start justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start space-x-3">
          <span className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
            {index + 1}
          </span>
          <div>
            <p className="font-medium text-gray-900">{response.question?.question_text}</p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs text-gray-500 uppercase">
                {response.question?.question_type?.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-500">
                Max: {response.question?.points} pts
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {response.is_graded ? (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
              <Check className="w-3 h-3 mr-1" />
              {response.points_earned}/{response.question?.points}
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
              <Clock className="w-3 h-3 mr-1" />
              Ungraded
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 ml-11 space-y-4">
              {/* Student Response */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Student's Answer</p>
                <p className="text-gray-800 whitespace-pre-wrap">
                  {response.text_response || <em className="text-gray-400">No response provided</em>}
                </p>
              </div>

              {/* Grading Form */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points Earned
                  </label>
                  <input
                    type="number"
                    value={points}
                    onChange={(e) => setPoints(e.target.value)}
                    min="0"
                    max={response.question?.points || 100}
                    step="0.5"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Max: {response.question?.points}
                  </p>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feedback (Optional)
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Add feedback for this answer..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      onClick={handleSave}
                      disabled={saving || points === ''}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium disabled:opacity-60"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      <span>Save</span>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GradingDashboard;
