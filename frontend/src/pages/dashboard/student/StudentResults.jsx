import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy, BookOpen, TrendingUp, TrendingDown, Clock, CheckCircle,
  XCircle, AlertCircle, ChevronDown, ChevronRight, Eye, Download,
  Loader2, BarChart3, Award, Target, Calendar, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as examService from '../../../services/examService';

const StudentResults = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resultsData, setResultsData] = useState(null);
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      const response = await examService.getAllResults();
      const data = response.data || response;
      setResultsData(data);
      // Auto-expand first subject
      if (data?.subjects?.length > 0) {
        setExpandedSubjects({ [data.subjects[0].subject_id]: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [subjectId]: !prev[subjectId]
    }));
  };

  const getGradeColor = (grade) => {
    if (!grade) return 'text-gray-500 bg-gray-100';
    if (grade === 'A' || grade === 'A+') return 'text-emerald-700 bg-emerald-100';
    if (grade === 'B' || grade === 'B+') return 'text-blue-700 bg-blue-100';
    if (grade === 'C' || grade === 'C+') return 'text-amber-700 bg-amber-100';
    if (grade === 'D' || grade === 'D+') return 'text-orange-700 bg-orange-100';
    return 'text-red-700 bg-red-100';
  };

  const getPassStatusBadge = (status) => {
    if (status === 'passed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          <CheckCircle className="w-3 h-3" />
          Passed
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (seconds) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;
    setDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      await html2pdf().set({
        margin: 10,
        filename: 'my-exam-results.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(printRef.current).save();
    } catch (err) {
      console.error('PDF download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Results</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadResults}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { subjects, overallStats } = resultsData || { subjects: [], overallStats: {} };

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="w-7 h-7 text-amber-500" />
              My Exam Results
            </h1>
            <p className="text-gray-500 mt-1">View all your exam results grouped by subject</p>
          </div>
          <button
            onClick={handleDownloadPDF}
            disabled={downloading || subjects.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download PDF
              </>
            )}
          </button>
        </div>

        {/* PDF-able content */}
        <div ref={printRef}>
          {/* Overall Stats */}
          {overallStats && overallStats.totalExams > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{overallStats.totalExams}</p>
                    <p className="text-xs text-gray-500">Total Exams</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-emerald-600">{overallStats.totalPassed}</p>
                    <p className="text-xs text-gray-500">Passed</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{overallStats.totalFailed}</p>
                    <p className="text-xs text-gray-500">Failed</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{overallStats.totalPending}</p>
                    <p className="text-xs text-gray-500">Pending</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl shadow-sm p-4 border border-gray-100"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{overallStats.averagePercentage}%</p>
                    <p className="text-xs text-gray-500">Average</p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* No Results */}
          {subjects.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No Results Yet</h2>
              <p className="text-gray-500 mb-6">You haven't completed any exams yet.</p>
              <button
                onClick={() => navigate('/student/dashboard/exams')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Browse Available Exams
              </button>
            </div>
          )}

          {/* Subjects with Results */}
          <div className="space-y-4">
            {subjects.map((subject, index) => (
              <motion.div
                key={subject.subject_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Subject Header */}
                <button
                  onClick={() => toggleSubject(subject.subject_id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <BookOpen className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{subject.subject_name}</h3>
                      {subject.subject_code && (
                        <p className="text-xs text-gray-500">{subject.subject_code}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Subject Stats */}
                    <div className="hidden sm:flex items-center gap-3 text-sm">
                      <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {subject.stats.total} exams
                      </span>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                        {subject.stats.passed} passed
                      </span>
                      {subject.stats.averagePercentage > 0 && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          Avg: {subject.stats.averagePercentage}%
                        </span>
                      )}
                    </div>
                    {expandedSubjects[subject.subject_id] ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Exam Results */}
                <AnimatePresence>
                  {expandedSubjects[subject.subject_id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-100"
                    >
                      <div className="divide-y divide-gray-50">
                        {subject.exams.map((exam) => (
                          <div
                            key={exam.attempt_id}
                            className="px-5 py-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <h4 className="font-medium text-gray-900">{exam.exam_title}</h4>
                                  {getPassStatusBadge(exam.pass_status)}
                                </div>
                                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {formatDate(exam.submitted_at)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatTime(exam.time_taken_seconds)}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                {/* Score */}
                                <div className="text-right">
                                  <div className="flex items-baseline gap-1">
                                    <span className="text-xl font-bold text-gray-900">
                                      {exam.total_score !== null ? exam.total_score : '-'}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      / {exam.max_score}
                                    </span>
                                  </div>
                                  {exam.percentage !== null && (
                                    <p className="text-sm text-gray-500">{exam.percentage}%</p>
                                  )}
                                </div>

                                {/* Grade Badge */}
                                {exam.grade && (
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold ${getGradeColor(exam.grade)}`}>
                                    {exam.grade}
                                  </div>
                                )}

                                {/* View Details */}
                                <button
                                  onClick={() => navigate(`/student/dashboard/exams/attempt/${exam.attempt_id}/result`)}
                                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                  title="View Details"
                                >
                                  <Eye className="w-5 h-5" />
                                </button>
                              </div>
                            </div>

                            {/* Instructor Feedback */}
                            {exam.instructor_feedback && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <p className="text-sm text-blue-800">
                                  <strong>Feedback:</strong> {exam.instructor_feedback}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentResults;
