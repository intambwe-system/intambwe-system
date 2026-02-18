import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Users, CheckCircle, XCircle, Clock, Award,
  Eye, Loader2, AlertCircle, ChevronDown, ChevronUp, Search,
  FileText, Hourglass, Check, X, MessageSquare, Save, RefreshCw,
  CheckCheck, Star, Pencil, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as examService from '../../../services/examService';
import { useSocket } from '../../../contexts/SocketContext.tsx';

const ExamResponses = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  // State
  const [exam, setExam] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [selectedResponses, setSelectedResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, graded
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  // Grading state
  const [gradingData, setGradingData] = useState({});
  const [savingGrade, setSavingGrade] = useState({});
  const [toast, setToast] = useState(null);
  const [finalizingGrading, setFinalizingGrading] = useState(false);

  // Real-time: new submission toasts
  const [newSubmissions, setNewSubmissions] = useState([]);
  // Real-time: live answer progress per attemptId { [attemptId]: questionsAnswered }
  const [liveProgress, setLiveProgress] = useState({});

  // Load exam and attempts
  useEffect(() => {
    loadExamData();
  }, [examId]);

  // Real-time: join exam room and listen for events
  useEffect(() => {
    if (!socket || !examId) return;
    socket.emit('exam:join', { examId });

    // New student submitted → show alert + reload sidebar list
    const handleSubmitted = (data) => {
      if (String(data.examId) !== String(examId)) return;
      setNewSubmissions(prev => [...prev, {
        id: data.attemptId,
        name: data.studentName,
        time: new Date(),
      }]);
      // Auto-reload attempts list so the new row appears in sidebar
      loadExamData();
      // Auto-dismiss after 6 s
      setTimeout(() => {
        setNewSubmissions(prev => prev.filter(s => s.id !== data.attemptId));
      }, 6000);
    };

    // Another teacher graded a response on the same attempt we're viewing
    const handleResponseGraded = (data) => {
      if (String(data.examId) !== String(examId)) return;
      if (!selectedAttempt || String(data.attemptId) !== String(selectedAttempt.attempt_id)) return;
      // Update the attempt score shown in the header
      setSelectedAttempt(prev => prev ? {
        ...prev,
        total_score: data.totalScore,
        percentage: data.percentage,
      } : prev);
    };

    // Student/guest answered a question live → update per-attempt progress dot
    const handleResponseSaved = (data) => {
      if (String(data.examId) !== String(examId)) return;
      setLiveProgress(prev => ({
        ...prev,
        [data.attemptId]: data.questionsAnswered,
      }));
    };

    socket.on('exam:submitted', handleSubmitted);
    socket.on('grading:response_graded', handleResponseGraded);
    socket.on('exam:response_saved', handleResponseSaved);

    return () => {
      socket.off('exam:submitted', handleSubmitted);
      socket.off('grading:response_graded', handleResponseGraded);
      socket.off('exam:response_saved', handleResponseSaved);
      socket.emit('exam:leave', { examId });
    };
  }, [socket, examId, selectedAttempt]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const loadExamData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get exam details
      const examRes = await examService.getExamById(examId);
      setExam(examRes.data || examRes);

      // Get all responses for this exam
      const responsesRes = await examService.getExamResponses(examId);
      const data = responsesRes.data || responsesRes;

      // Group responses by attempt
      const attemptsMap = new Map();
      if (data.attempts) {
        data.attempts.forEach(attempt => {
          attemptsMap.set(attempt.attempt_id, {
            ...attempt,
            // Backend returns StudentResponses, normalize to responses
            responses: attempt.StudentResponses || attempt.responses || []
          });
        });
      }

      const attemptsList = Array.from(attemptsMap.values());
      setAttempts(attemptsList);

      // Auto-select first attempt if available
      if (attemptsList.length > 0) {
        handleSelectAttempt(attemptsList[0]);
      }
    } catch (err) {
      setError(err.message || 'Failed to load exam data');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAttempt = async (attempt) => {
    setSelectedAttempt(attempt);
    setLoadingResponses(true);
    setGradingData({});

    try {
      // If attempt already has responses, use them
      const existingResponses = attempt.responses || attempt.StudentResponses || [];
      if (existingResponses.length > 0) {
        setSelectedResponses(existingResponses);
        // Auto-expand questions requiring manual grading
        const pendingIds = new Set();
        existingResponses.forEach(r => {
          if (r.requires_manual_grading && !r.manually_graded) {
            pendingIds.add(r.question_id);
          }
        });
        setExpandedQuestions(pendingIds);
      } else {
        // Fetch detailed responses for this attempt
        const res = await examService.getAttemptResult(attempt.attempt_id);
        const data = res.data || res;
        const responses = data.responses || data.StudentResponses || [];
        setSelectedResponses(responses);
        // Auto-expand questions requiring manual grading
        const pendingIds = new Set();
        responses.forEach(r => {
          if (r.requires_manual_grading && !r.manually_graded) {
            pendingIds.add(r.question_id);
          }
        });
        setExpandedQuestions(pendingIds);
      }
    } catch (err) {
      console.error('Failed to load responses:', err);
      setSelectedResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  const toggleQuestion = (questionId) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  // Filter attempts based on search and status
  const filteredAttempts = attempts.filter(attempt => {
    const studentName = attempt.student
      ? `${attempt.student.std_fname || ''} ${attempt.student.std_lname || ''}`.toLowerCase()
      : `${attempt.guest?.full_name || ''} ${attempt.guest?.email || ''} ${attempt.guest?.phone || ''}`.toLowerCase();
    const matchesSearch = studentName.includes(searchQuery.toLowerCase());
    const responses = attempt.responses || attempt.StudentResponses || [];

    if (filterStatus === 'all') return matchesSearch;
    if (filterStatus === 'pending') {
      const hasPending = responses.some(r => r.requires_manual_grading && !r.manually_graded);
      return matchesSearch && hasPending;
    }
    if (filterStatus === 'graded') {
      const allGraded = !responses.some(r => r.requires_manual_grading && !r.manually_graded);
      return matchesSearch && allGraded && attempt.status === 'graded';
    }
    return matchesSearch;
  });

  // Count pending in sidebar
  const pendingCount = attempts.filter(a => {
    const responses = a.responses || a.StudentResponses || [];
    return responses.some(r => r.requires_manual_grading && !r.manually_graded);
  }).length;

  // Grade a response
  const handleGradeChange = (responseId, field, value) => {
    setGradingData(prev => ({
      ...prev,
      [responseId]: {
        ...prev[responseId],
        [field]: value
      }
    }));
  };

  const saveGrade = async (responseId, pointsOverride = null) => {
    const grade = gradingData[responseId] || {};
    // Fall back to existing points_earned if teacher hasn't changed the input
    const existingResponse = selectedResponses.find(r => r.response_id === responseId);
    const points = pointsOverride !== null
      ? pointsOverride
      : (grade.points_earned !== undefined ? grade.points_earned : existingResponse?.points_earned);

    if (points === undefined || points === null) {
      showToast('error', 'Please enter points');
      return;
    }

    try {
      setSavingGrade(prev => ({ ...prev, [responseId]: true }));
      const feedback = grade.feedback !== undefined ? grade.feedback : (existingResponse?.grader_feedback || '');
      await examService.gradeResponse(responseId, points, feedback);

      // Update local state
      setSelectedResponses(prev => prev.map(r => {
        if (r.response_id === responseId) {
          return {
            ...r,
            points_earned: points,
            grader_feedback: feedback,
            manually_graded: true,
            is_correct: points > 0
          };
        }
        return r;
      }));

      // Update attempt in sidebar
      setAttempts(prev => prev.map(a => {
        if (a.attempt_id === selectedAttempt?.attempt_id) {
          const updatedResponses = (a.responses || a.StudentResponses || []).map(r => {
            if (r.response_id === responseId) {
              return { ...r, points_earned: points, manually_graded: true, is_correct: points > 0 };
            }
            return r;
          });
          return { ...a, responses: updatedResponses, StudentResponses: updatedResponses };
        }
        return a;
      }));

      // Clear grading data for this response
      setGradingData(prev => {
        const next = { ...prev };
        delete next[responseId];
        return next;
      });

      showToast('success', 'Grade saved successfully!');
    } catch (err) {
      console.error('Failed to save grade:', err);
      showToast('error', 'Failed to save grade');
    } finally {
      setSavingGrade(prev => ({ ...prev, [responseId]: false }));
    }
  };

  // Quick grade: Full points
  const giveFullPoints = async (response) => {
    const maxPoints = response.max_points || response.question?.points || 0;
    await saveGrade(response.response_id, maxPoints);
  };

  // Quick grade: Zero points
  const giveZeroPoints = async (response) => {
    await saveGrade(response.response_id, 0);
  };

  // Finalize grading for the attempt
  const finalizeGrading = async () => {
    if (!selectedAttempt) return;

    // Check if all manual grading is done
    const pendingResponses = selectedResponses.filter(
      r => r.requires_manual_grading && !r.manually_graded
    );

    if (pendingResponses.length > 0) {
      showToast('error', `${pendingResponses.length} question(s) still need grading`);
      return;
    }

    try {
      setFinalizingGrading(true);
      await examService.finalizeGrading(selectedAttempt.attempt_id, '');

      // Reload data
      await loadExamData();
      showToast('success', 'Grading finalized! Score updated.');
    } catch (err) {
      console.error('Failed to finalize grading:', err);
      showToast('error', err.message || 'Failed to finalize grading');
    } finally {
      setFinalizingGrading(false);
    }
  };

  const getStatusBadge = (attempt) => {
    const responses = attempt.responses || attempt.StudentResponses || [];
    const hasPending = responses.some(r => r.requires_manual_grading && !r.manually_graded);

    if (hasPending) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <Hourglass className="w-3 h-3 mr-1" />
          Pending
        </span>
      );
    }

    if (attempt.pass_status === 'passed') {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <CheckCircle className="w-3 h-3 mr-1" />
          Passed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="w-3 h-3 mr-1" />
        Failed
      </span>
    );
  };

  // Count pending questions for current student
  const currentPendingCount = selectedResponses.filter(
    r => r.requires_manual_grading && !r.manually_graded
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl flex items-center space-x-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="text-lg text-gray-700">Loading responses...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/employee/dashboard/exams')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center space-x-2 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600" />
            )}
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time: New submission notifications (stack at top-left) */}
      <div className="fixed top-4 left-4 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {newSubmissions.map(sub => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm pointer-events-auto"
            >
              <Bell className="w-4 h-4 flex-shrink-0" />
              <span><strong>{sub.name}</strong> just submitted the exam</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/employee/dashboard/exams')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{exam?.title || 'Exam Responses'}</h1>
                <p className="text-sm text-gray-500">
                  {attempts.length} student{attempts.length !== 1 ? 's' : ''} responded
                  {pendingCount > 0 && (
                    <span className="text-amber-600 ml-2">• {pendingCount} pending grading</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadExamData}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center space-x-2 bg-gray-100 px-3 py-1.5 rounded-lg">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{attempts.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Left Sidebar - Respondents List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
              />
            </div>
            <div className="flex space-x-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'pending', label: `Pending (${pendingCount})` },
                { key: 'graded', label: 'Graded' }
              ].map(status => (
                <button
                  key={status.key}
                  onClick={() => setFilterStatus(status.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filterStatus === status.key
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Respondents List */}
          <div className="flex-1 overflow-y-auto">
            {filteredAttempts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No responses found</p>
              </div>
            ) : (() => {
              // Group by student std_id (for registered students) or by guest email/phone (for public attempts)
              const studentGroups = new Map();
              filteredAttempts.forEach(attempt => {
                let groupKey;
                if (attempt.student?.std_id || attempt.std_id) {
                  groupKey = `student_${attempt.student?.std_id || attempt.std_id}`;
                } else if (attempt.guest?.email) {
                  groupKey = `guest_email_${attempt.guest.email}`;
                } else if (attempt.guest?.phone) {
                  groupKey = `guest_phone_${attempt.guest.phone}`;
                } else {
                  groupKey = `attempt_${attempt.attempt_id}`;
                }
                if (!studentGroups.has(groupKey)) {
                  studentGroups.set(groupKey, {
                    student: attempt.student,
                    guest: attempt.guest,
                    isGuest: !attempt.student,
                    attempts: []
                  });
                }
                studentGroups.get(groupKey).attempts.push(attempt);
              });

              return (
                <div className="divide-y divide-gray-100">
                  {Array.from(studentGroups.entries()).map(([groupKey, group]) => {
                    const isMultiple = group.attempts.length > 1;
                    const isExpanded = expandedGroups.has(groupKey);
                    const displayName = group.isGuest
                      ? (group.guest?.full_name || group.guest?.email || group.guest?.phone || 'Guest')
                      : `${group.student?.std_fname || ''} ${group.student?.std_lname || ''}`.trim();
                    const totalPending = group.attempts.reduce((sum, a) => {
                      const r = a.responses || a.StudentResponses || [];
                      return sum + r.filter(r => r.requires_manual_grading && !r.manually_graded).length;
                    }, 0);

                    const renderAttemptRow = (attempt, isNested = false) => {
                      const responses = attempt.responses || attempt.StudentResponses || [];
                      const pendingQs = responses.filter(r => r.requires_manual_grading && !r.manually_graded).length;
                      return (
                        <button
                          key={attempt.attempt_id}
                          onClick={() => handleSelectAttempt(attempt)}
                          className={`w-full text-left hover:bg-gray-50 transition-colors ${
                            isNested ? 'pl-12 pr-4 py-3' : 'p-4'
                          } ${
                            selectedAttempt?.attempt_id === attempt.attempt_id
                              ? 'bg-primary-50 border-l-4 border-primary-500'
                              : ''
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              {!isNested && (
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  pendingQs > 0 ? 'bg-amber-100' : 'bg-gray-200'
                                }`}>
                                  {pendingQs > 0 ? (
                                    <Pencil className="w-5 h-5 text-amber-600" />
                                  ) : (
                                    <User className="w-5 h-5 text-gray-500" />
                                  )}
                                </div>
                              )}
                              <div>
                                {isNested ? (
                                  <p className="font-medium text-gray-700 text-sm">
                                    Attempt {attempt.attempt_number || attempt.attempt_id}
                                  </p>
                                ) : (
                                  <p className="font-medium text-gray-900 text-sm">
                                    {group.isGuest
                                      ? (attempt.guest?.full_name || attempt.guest?.email || attempt.guest?.phone || 'Guest')
                                      : `${attempt.student?.std_fname || ''} ${attempt.student?.std_lname || ''}`.trim()
                                    }
                                  </p>
                                )}
                                <p className="text-xs text-gray-500">
                                  {attempt.percentage != null ? `${attempt.percentage}%` : '–'} • {attempt.total_score ?? '–'}/{attempt.max_score ?? '–'}
                                </p>
                                {/* Live progress while exam is in-progress */}
                                {attempt.status === 'in_progress' && liveProgress[attempt.attempt_id] != null && (
                                  <p className="text-xs text-blue-600 font-medium flex items-center mt-0.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1" />
                                    {liveProgress[attempt.attempt_id]} answered live
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end space-y-1">
                              {getStatusBadge(attempt)}
                              {pendingQs > 0 && (
                                <span className="text-xs text-amber-600 font-medium">
                                  {pendingQs} to grade
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex items-center text-xs text-gray-400">
                            <Clock className="w-3 h-3 mr-1" />
                            {attempt.time_taken_seconds ? `${Math.round(attempt.time_taken_seconds / 60)} min` : '-'}
                            <span className="mx-2">•</span>
                            {new Date(attempt.submitted_at || attempt.started_at).toLocaleDateString()}
                          </div>
                        </button>
                      );
                    };

                    if (!isMultiple) {
                      return renderAttemptRow(group.attempts[0]);
                    }

                    // Multiple attempts – show collapsible group header
                    return (
                      <div key={groupKey}>
                        <button
                          onClick={() => setExpandedGroups(prev => {
                            const next = new Set(prev);
                            next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
                            return next;
                          })}
                          className="w-full p-4 text-left hover:bg-gray-50 transition-colors border-l-4 border-transparent"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                totalPending > 0 ? 'bg-amber-100' : 'bg-indigo-100'
                              }`}>
                                <Users className={`w-5 h-5 ${totalPending > 0 ? 'text-amber-600' : 'text-indigo-600'}`} />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {displayName}
                                </p>
                                {group.isGuest && group.guest?.email && (
                                  <p className="text-xs text-gray-400">{group.guest.email}</p>
                                )}
                                <div className="flex items-center space-x-2">
                                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                                    {group.attempts.length} attempts
                                  </span>
                                  {totalPending > 0 && (
                                    <span className="text-xs text-amber-600 font-medium">{totalPending} to grade</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden bg-gray-50 border-l-4 border-indigo-200"
                            >
                              {group.attempts.map(attempt => renderAttemptRow(attempt, true))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Content - Selected Student Responses */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedAttempt ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Eye className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Select a student to view responses</p>
                <p className="text-sm">Click on a student from the sidebar</p>
              </div>
            </div>
          ) : loadingResponses ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex items-center space-x-3">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                <span className="text-gray-600">Loading responses...</span>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Student Info Header */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-7 h-7 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {selectedAttempt.student
                          ? `${selectedAttempt.student.std_fname || ''} ${selectedAttempt.student.std_lname || ''}`.trim()
                          : selectedAttempt.guest?.full_name || selectedAttempt.guest?.email || 'Guest'}
                      </h2>
                      <p className="text-gray-500">
                        {selectedAttempt.student
                          ? selectedAttempt.student.std_email
                          : selectedAttempt.guest?.email || selectedAttempt.guest?.phone || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(selectedAttempt)}
                    {currentPendingCount === 0 && (
                      <button
                        onClick={finalizeGrading}
                        disabled={finalizingGrading}
                        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {finalizingGrading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCheck className="w-4 h-4" />
                        )}
                        <span>{selectedAttempt.status === 'graded' ? 'Update Grades' : 'Finalize Grading'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Score Summary */}
                <div className="mt-6 grid grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Award className="w-6 h-6 mx-auto text-primary-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedAttempt.total_score}/{selectedAttempt.max_score}
                    </p>
                    <p className="text-xs text-gray-500">Score</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <FileText className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedAttempt.percentage}%</p>
                    <p className="text-xs text-gray-500">Percentage</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Award className="w-6 h-6 mx-auto text-amber-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{selectedAttempt.grade || '-'}</p>
                    <p className="text-xs text-gray-500">Grade</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Clock className="w-6 h-6 mx-auto text-gray-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {selectedAttempt.time_taken_seconds
                        ? Math.round(selectedAttempt.time_taken_seconds / 60)
                        : '-'}
                    </p>
                    <p className="text-xs text-gray-500">Minutes</p>
                  </div>
                </div>

                {/* Pending grading notice */}
                {currentPendingCount > 0 && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center space-x-3">
                    <Hourglass className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">
                        {currentPendingCount} question{currentPendingCount > 1 ? 's' : ''} need manual grading
                      </p>
                      <p className="text-sm text-amber-700">
                        Grade all questions below, then click "Finalize Grading" to update the score.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Questions and Responses */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Responses</h3>

                {selectedResponses.map((response, index) => {
                  const isExpanded = expandedQuestions.has(response.question_id);
                  const isPendingGrading = response.requires_manual_grading && !response.manually_graded;
                  const isCorrect = response.is_correct;
                  const gradeData = gradingData[response.response_id] || {};
                  const maxPoints = response.max_points || response.question?.points || 0;
                  const isSaving = savingGrade[response.response_id];

                  return (
                    <motion.div
                      key={response.response_id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden ${
                        isPendingGrading ? 'border-amber-300' : 'border-gray-200'
                      }`}
                    >
                      {/* Question Header */}
                      <button
                        onClick={() => toggleQuestion(response.question_id)}
                        className={`w-full px-6 py-4 flex items-center justify-between transition-colors ${
                          isPendingGrading ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isPendingGrading
                              ? 'bg-amber-200'
                              : isCorrect
                                ? 'bg-emerald-100'
                                : 'bg-red-100'
                          }`}>
                            {isPendingGrading ? (
                              <Pencil className="w-5 h-5 text-amber-700" />
                            ) : isCorrect ? (
                              <Check className="w-5 h-5 text-emerald-600" />
                            ) : (
                              <X className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900">Question {index + 1}</p>
                            <p className={`text-sm ${isPendingGrading ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>
                              {isPendingGrading
                                ? '⚠️ Needs grading'
                                : `${response.points_earned}/${maxPoints} points`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded capitalize">
                            {response.question?.question_type?.replace(/_/g, ' ')}
                          </span>
                          {isPendingGrading && (
                            <span className="text-xs px-2 py-1 bg-amber-200 text-amber-800 rounded font-medium">
                              Manual
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Question Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-gray-100"
                          >
                            <div className="px-6 py-4 space-y-4">
                              {/* Question Text */}
                              <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Question</p>
                                <p className="text-gray-900">{response.question?.question_text}</p>
                              </div>

                              {/* Student's Answer */}
                              <div>
                                <p className="text-sm font-medium text-gray-500 mb-1">Student's Answer</p>
                                <div className={`p-4 rounded-lg ${
                                  isPendingGrading
                                    ? 'bg-gray-50 border-2 border-gray-300'
                                    : isCorrect
                                      ? 'bg-emerald-50 border border-emerald-200'
                                      : 'bg-red-50 border border-red-200'
                                }`}>
                                  <p className={`whitespace-pre-wrap ${
                                    isPendingGrading
                                      ? 'text-gray-800'
                                      : isCorrect
                                        ? 'text-emerald-800'
                                        : 'text-red-800'
                                  }`}>
                                    {response.text_response ||
                                     response.question?.AnswerOptions?.find(o => o.option_id === response.selected_option_id)?.option_text ||
                                     response.question?.AnswerOptions?.filter(o => response.selected_option_ids?.includes(o.option_id)).map(o => o.option_text).join(', ') ||
                                     'No answer provided'}
                                  </p>
                                </div>
                              </div>

                              {/* Correct Answer (if applicable) */}
                              {!isPendingGrading && !isCorrect && response.correct_answer && (
                                <div>
                                  <p className="text-sm font-medium text-gray-500 mb-1">Correct Answer</p>
                                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                    <p className="text-emerald-800">{response.correct_answer}</p>
                                  </div>
                                </div>
                              )}

                              {/* Grading Section - Always show for manual grading questions */}
                              {response.requires_manual_grading && (
                                <div className={`rounded-lg p-4 space-y-4 ${
                                  isPendingGrading
                                    ? 'bg-amber-50 border-2 border-amber-300'
                                    : 'bg-blue-50 border border-blue-200'
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <p className={`font-medium flex items-center ${
                                      isPendingGrading ? 'text-amber-900' : 'text-blue-900'
                                    }`}>
                                      <Star className="w-4 h-4 mr-2" />
                                      {isPendingGrading ? 'Grade This Response' : 'Update Grade'}
                                    </p>
                                    {!isPendingGrading && (
                                      <span className="text-sm text-blue-700">
                                        Current: {response.points_earned}/{maxPoints} pts
                                      </span>
                                    )}
                                  </div>

                                  {/* Quick Actions */}
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => giveFullPoints(response)}
                                      disabled={isSaving}
                                      className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                                    >
                                      <Check className="w-4 h-4" />
                                      <span>Full Points ({maxPoints})</span>
                                    </button>
                                    <button
                                      onClick={() => giveZeroPoints(response)}
                                      disabled={isSaving}
                                      className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50"
                                    >
                                      <X className="w-4 h-4" />
                                      <span>Zero Points</span>
                                    </button>
                                    <span className="text-gray-400 text-sm">or enter custom:</span>
                                  </div>

                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Points (0 - {maxPoints})
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        max={maxPoints}
                                        step="0.5"
                                        value={gradeData.points_earned ?? (isPendingGrading ? '' : response.points_earned) ?? ''}
                                        onChange={(e) => handleGradeChange(
                                          response.response_id,
                                          'points_earned',
                                          parseFloat(e.target.value) || 0
                                        )}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                                        placeholder="Enter points"
                                      />
                                    </div>
                                    <div className="col-span-2">
                                      <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Feedback (optional)
                                      </label>
                                      <input
                                        type="text"
                                        value={gradeData.feedback ?? response.grader_feedback ?? ''}
                                        onChange={(e) => handleGradeChange(
                                          response.response_id,
                                          'feedback',
                                          e.target.value
                                        )}
                                        placeholder="Add feedback for the student..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-500"
                                      />
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => saveGrade(response.response_id)}
                                    disabled={isSaving || (gradeData.points_earned === undefined && isPendingGrading)}
                                    className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isSaving ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Save className="w-4 h-4" />
                                    )}
                                    <span>{isPendingGrading ? 'Save Grade' : 'Update Grade'}</span>
                                  </button>
                                </div>
                              )}

                              {/* Show existing feedback for non-manual questions */}
                              {response.grader_feedback && !response.requires_manual_grading && (
                                <div>
                                  <p className="text-sm font-medium text-gray-500 mb-1">Teacher Feedback</p>
                                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                                    {response.grader_feedback}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Overall Feedback */}
              {selectedAttempt.instructor_feedback && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h3 className="font-semibold text-blue-900 mb-2">Overall Feedback</h3>
                  <p className="text-blue-800">{selectedAttempt.instructor_feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExamResponses;
