import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  CheckCircle, XCircle, Clock, Award, FileText, ArrowLeft,
  Loader2, AlertCircle, ChevronDown, ChevronUp, Hourglass, User, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api/api';

const PublicExamResult = () => {
  const { attemptId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resultRef = useRef(null);

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    loadResult();
  }, [attemptId, token]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/public/exam/attempt/${attemptId}/result?session_token=${token}`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load results');
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
      const examTitle = result?.attempt?.exam_title || 'exam-result';
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

  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
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
        </div>
      </div>
    );
  }

  if (!result || result.message) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8 px-4">
        <div className="bg-white rounded-xl p-8 shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hourglass className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Results Pending</h2>
          <p className="text-gray-500 mb-6">
            {result?.message || 'Your results will be available after the exam is graded.'}
          </p>
        </div>
      </div>
    );
  }

  const { attempt, responses } = result;

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className=" mx-auto">
        {/* Download Button */}
        <div className="flex justify-end mb-4">
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
        </div>
        <div ref={resultRef}>
        {/* Participant Info */}
        {attempt.participant_name && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{attempt.participant_name}</p>
              <p className="text-sm text-gray-500">{attempt.participant_email}</p>
            </div>
          </div>
        )}

        {/* Check if there are pending manual grading questions */}
        {(() => {
          const pendingCount = responses?.filter(r => !r.auto_graded && r.points_earned === null).length || 0;
          const hasPendingGrading = pendingCount > 0 || attempt.status === 'submitted';

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
                        {pendingCount > 0
                          ? `${pendingCount} question${pendingCount > 1 ? 's' : ''} pending manual grading`
                          : 'Exam pending review'}
                      </p>
                      <p className="text-sm text-amber-700">
                        Your final score will be updated once the exam is fully graded.
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
                      <h1 className="text-2xl font-bold mb-1">{attempt.exam_title || 'Exam Results'}</h1>
                      <p className="text-white/80">
                        Completed on {new Date(attempt.submitted_at).toLocaleDateString()}
                      </p>
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
                        {formatTime(attempt.time_taken_seconds)}
                      </p>
                      <p className="text-sm text-gray-500">Time Taken</p>
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
                    const isPending = !response.auto_graded && response.points_earned === null;

                    const getStatusDisplay = () => {
                      if (isPending) {
                        return {
                          bgColor: 'bg-amber-100',
                          icon: <Hourglass className="w-5 h-5 text-amber-600" />,
                          pointsText: 'Pending review',
                          pointsColor: 'text-amber-600'
                        };
                      }
                      if (isCorrect) {
                        return {
                          bgColor: 'bg-emerald-100',
                          icon: <CheckCircle className="w-5 h-5 text-emerald-600" />,
                          pointsText: `${response.points_earned}/${response.points} points`,
                          pointsColor: 'text-gray-500'
                        };
                      }
                      return {
                        bgColor: 'bg-red-100',
                        icon: <XCircle className="w-5 h-5 text-red-600" />,
                        pointsText: `${response.points_earned || 0}/${response.points} points`,
                        pointsColor: 'text-gray-500'
                      };
                    };

                    const statusDisplay = getStatusDisplay();

                    return (
                      <motion.div
                        key={response.question_id}
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
                                  <p className="text-gray-900">{response.question_text}</p>
                                </div>

                                {/* Question Image */}
                                {response.image_url && (
                                  <div>
                                    <img
                                      src={response.image_url}
                                      alt={`Question ${index + 1} image`}
                                      className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200"
                                      onError={(e) => {
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                )}

                                {/* Pending Notice */}
                                {isPending && (
                                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                    <div className="flex items-center space-x-2">
                                      <Hourglass className="w-5 h-5 text-amber-600" />
                                      <p className="text-amber-800 font-medium">Waiting to be graded</p>
                                    </div>
                                  </div>
                                )}

                                {/* Your Answer */}
                                <div>
                                  <p className="text-sm font-medium text-gray-500 mb-1">Your Answer</p>
                                  <div className={`p-3 rounded-lg ${
                                    isPending
                                      ? 'bg-gray-50 border border-gray-200'
                                      : isCorrect
                                        ? 'bg-emerald-50 border border-emerald-200'
                                        : 'bg-red-50 border border-red-200'
                                  }`}>
                                    <p className={
                                      isPending
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

                                {/* Correct Answer (if shown) */}
                                {!isPending && !isCorrect && response.correct_options && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">Correct Answer</p>
                                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                      <p className="text-emerald-800">
                                        {response.options?.filter(o => response.correct_options.includes(o.option_id)).map(o => o.option_text).join(', ') ||
                                         response.correct_answers?.join(', ')}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Explanation */}
                                {response.explanation && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">Explanation</p>
                                    <p className="text-gray-700">{response.explanation}</p>
                                  </div>
                                )}

                                {/* Feedback */}
                                {response.grading_feedback && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">Feedback</p>
                                    <p className="text-gray-700">{response.grading_feedback}</p>
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

              {/* Instructor Feedback */}
              {attempt.instructor_feedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6"
                >
                  <h3 className="font-semibold text-blue-900 mb-2">Instructor Feedback</h3>
                  <p className="text-blue-800">{attempt.instructor_feedback}</p>
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

export default PublicExamResult;
