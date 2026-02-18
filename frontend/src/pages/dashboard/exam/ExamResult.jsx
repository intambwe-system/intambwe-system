import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle, XCircle, Clock, Award, FileText, ArrowLeft,
  Loader2, AlertCircle, ChevronDown, ChevronUp, Hourglass, Download, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as examService from '../../../services/examService';
import { useSocket } from '../../../contexts/SocketContext.tsx';

const ExamResult = () => {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const resultRef = useRef(null);
  const { socket } = useSocket();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [gradingNotice, setGradingNotice] = useState(null); // "grades_updated" toast

  useEffect(() => {
    loadResult();
  }, [attemptId]);

  // Join the attempt room so we receive real-time grading events
  useEffect(() => {
    if (!socket || !attemptId) return;
    socket.emit('attempt:join', { attemptId });

    const handleFinalized = (data) => {
      if (String(data.attemptId) !== String(attemptId)) return;
      // Show a brief notification then reload to show final grades
      setGradingNotice('Your exam has been graded! Loading results…');
      setTimeout(() => {
        setGradingNotice(null);
        loadResult();
      }, 2000);
    };

    socket.on('grading:attempt_finalized', handleFinalized);

    return () => {
      socket.off('grading:attempt_finalized', handleFinalized);
      socket.emit('attempt:leave', { attemptId });
    };
  }, [socket, attemptId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const res = await examService.getAttemptResult(attemptId);
      setResult(res.data || res);
    } catch (err) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
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

  const handleDownloadPdf = async () => {
    if (!resultRef.current) return;
    try {
      setDownloadingPdf(true);
      const html2pdf = (await import('html2pdf.js')).default;
      const examTitle = result?.attempt?.exam?.title || 'exam-result';
      const filename = `${examTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_result.pdf`;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename,
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        })
        .from(resultRef.current)
        .save();
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getGradeColor = (grade) => {
    if (!grade) return 'text-gray-600';
    if (grade === 'A' || grade === 'A+') return 'text-emerald-600';
    if (grade === 'B' || grade === 'B+') return 'text-blue-600';
    if (grade === 'C' || grade === 'C+') return 'text-amber-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl flex items-center space-x-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="text-lg text-gray-700">Loading results...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4">
        <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load Results</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => navigate('/student/dashboard/exams')}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { attempt, responses } = result;
  const showResults = attempt?.exam?.show_results_immediately !== false || attempt?.status === 'graded';

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      {/* Real-time grading notification toast */}
      <AnimatePresence>
        {gradingNotice && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg"
          >
            <Bell className="w-5 h-5" />
            <span className="font-medium">{gradingNotice}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className=" mx-auto">
        {/* Back Button + Download */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/student/dashboard/exams')}
            className="flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Exams
          </button>
          {showResults && (
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {downloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{downloadingPdf ? 'Generating...' : 'Download PDF'}</span>
            </button>
          )}
        </div>

        {/* Waiting State – results not yet released */}
        {!showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center mb-6"
          >
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Hourglass className="w-10 h-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted!</h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Your exam has been submitted successfully. Results will be available once reviewed by your teacher.
              Check back later to see your score and detailed feedback.
            </p>
          </motion.div>
        )}

        {/* Detailed results */}
        <div ref={resultRef}>
        {/* Check if there are pending manual grading questions */}
        {showResults && (() => {
          const pendingCount = responses?.filter(r => r.requires_manual_grading && !r.manually_graded).length || 0;
          const hasPendingGrading = pendingCount > 0;

          return (
            <>
              {/* Pending Grading Notice */}
              {hasPendingGrading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6"
                >
                  <div className="flex items-center space-x-3">
                    <Hourglass className="w-6 h-6 text-amber-600" />
                    <div>
                      <p className="font-medium text-amber-800">
                        {pendingCount} question{pendingCount > 1 ? 's' : ''} pending manual grading
                      </p>
                      <p className="text-sm text-amber-700">
                        Your final score will be updated once your teacher grades these questions.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Result Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6"
              >
                <div className={`px-6 py-8 ${
                  hasPendingGrading
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                    : attempt.pass_status === 'passed'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                      : 'bg-gradient-to-r from-red-500 to-red-600'
                } text-white`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold mb-1">{attempt.exam?.title || 'Exam Results'}</h1>
                      <p className="text-white/80">{attempt.exam?.subject?.sbj_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20">
                        {hasPendingGrading ? (
                          <Hourglass className="w-5 h-5 mr-2" />
                        ) : attempt.pass_status === 'passed' ? (
                          <CheckCircle className="w-5 h-5 mr-2" />
                        ) : (
                          <XCircle className="w-5 h-5 mr-2" />
                        )}
                        <span className="font-bold uppercase">
                          {hasPendingGrading ? 'Pending' : attempt.pass_status === 'passed' ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Score Summary */}
                <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Award className="w-6 h-6 text-primary-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {attempt.total_score}/{attempt.max_score}
                </p>
                <p className="text-sm text-gray-500">Score</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{attempt.percentage}%</p>
                <p className="text-sm text-gray-500">Percentage</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Award className="w-6 h-6 text-amber-600" />
                </div>
                <p className={`text-3xl font-bold ${getGradeColor(attempt.grade)}`}>
                  {attempt.grade || '-'}
                </p>
                <p className="text-sm text-gray-500">Grade</p>
              </div>

              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Clock className="w-6 h-6 text-gray-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {attempt.time_spent_minutes || '-'}
                </p>
                <p className="text-sm text-gray-500">Minutes</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Questions Review */}
        {responses && responses.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Question Review</h2>

            {responses.map((response, index) => {
              const isExpanded = expandedQuestions.has(response.question_id);
              const isCorrect = response.is_correct;
              const isPendingManualGrading = response.requires_manual_grading && !response.manually_graded;

              // Determine status icon and colors
              const getStatusDisplay = () => {
                if (isPendingManualGrading) {
                  return {
                    bgColor: 'bg-amber-100',
                    icon: <Hourglass className="w-5 h-5 text-amber-600" />,
                    pointsText: 'Waiting to be marked',
                    pointsColor: 'text-amber-600'
                  };
                }
                if (isCorrect) {
                  return {
                    bgColor: 'bg-emerald-100',
                    icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
                    pointsText: `${response.points_earned}/${response.question?.points || response.max_points} points`,
                    pointsColor: 'text-gray-500'
                  };
                }
                return {
                  bgColor: 'bg-red-100',
                  icon: <XCircle className="w-5 h-5 text-red-600" />,
                  pointsText: `${response.points_earned}/${response.question?.points || response.max_points} points`,
                  pointsColor: 'text-gray-500'
                };
              };

              const statusDisplay = getStatusDisplay();

              return (
                <motion.div
                  key={response.response_id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  {/* Question Header */}
                  <button
                    onClick={() => toggleQuestion(response.question_id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusDisplay.bgColor}`}>
                        {statusDisplay.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">Question {index + 1}</p>
                        <p className={`text-sm ${statusDisplay.pointsColor}`}>
                          {statusDisplay.pointsText}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
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

                          {/* Question Image */}
                          {response.question?.image_url && (
                            <div>
                              <img
                                src={response.question.image_url}
                                alt={`Question ${index + 1} image`}
                                className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            </div>
                          )}

                          {/* Pending Manual Grading Notice */}
                          {isPendingManualGrading && (
                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <Hourglass className="w-5 h-5 text-amber-600" />
                                <p className="text-amber-800 font-medium">Waiting to be marked by teacher</p>
                              </div>
                              <p className="text-amber-700 text-sm mt-1">
                                This question requires manual grading. Your score will be updated once graded.
                              </p>
                            </div>
                          )}

                          {/* Your Answer */}
                          <div>
                            <p className="text-sm font-medium text-gray-500 mb-1">Your Answer</p>
                            <div className={`p-3 rounded-lg ${
                              isPendingManualGrading
                                ? 'bg-gray-50 border border-gray-200'
                                : isCorrect
                                  ? 'bg-emerald-50 border border-emerald-200'
                                  : 'bg-red-50 border border-red-200'
                            }`}>
                              <p className={
                                isPendingManualGrading
                                  ? 'text-gray-800'
                                  : isCorrect
                                    ? 'text-emerald-800'
                                    : 'text-red-800'
                              }>
                                {response.text_response ||
                                 response.options?.find(o => o.option_id === response.selected_option_id)?.option_text ||
                                 response.options?.filter(o => response.selected_option_ids?.includes(o.option_id)).map(o => o.option_text).join(', ') ||
                                 'No answer provided'}
                              </p>
                            </div>
                          </div>

                          {/* Correct Answer (if wrong and not pending) */}
                          {!isPendingManualGrading && !isCorrect && response.correct_answer && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 mb-1">Correct Answer</p>
                              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                <p className="text-emerald-800">{response.correct_answer}</p>
                              </div>
                            </div>
                          )}

                          {/* Feedback */}
                          {response.feedback && (
                            <div>
                              <p className="text-sm font-medium text-gray-500 mb-1">Feedback</p>
                              <p className="text-gray-700">{response.feedback}</p>
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
        )}

        {/* Teacher Feedback */}
        {attempt.feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6"
          >
            <h3 className="font-semibold text-blue-900 mb-2">Teacher Feedback</h3>
            <p className="text-blue-800">{attempt.feedback}</p>
          </motion.div>
        )}
            </>
          );
        })()}
        </div>
      </div>
    </div>
  );
};

export default ExamResult;
