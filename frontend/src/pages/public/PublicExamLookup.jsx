import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Mail, Phone, FileText, Clock, CheckCircle, XCircle,
  Hourglass, ChevronRight, AlertCircle, Loader2, BookOpen, Award
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { lookupPublicExams } from '../../services/examService';

const PublicExamLookup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [attempts, setAttempts] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setError('Please enter your email or phone number.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      setSearched(false);
      const res = await lookupPublicExams(email.trim() || null, phone.trim() || null);
      setAttempts(res.data || []);
      setSearched(true);
    } catch (err) {
      setError(err.message || 'Failed to look up exams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (attempt) => {
    if (attempt.status === 'graded') {
      return attempt.pass_status === 'passed' ? (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          <CheckCircle className="w-3 h-3 mr-1" /> Passed
        </span>
      ) : (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" /> Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        <Hourglass className="w-3 h-3 mr-1" /> Pending
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Exam Results</h1>
          <p className="text-gray-500 mt-2">
            Enter your email or phone number to find your exam attempts and results.
          </p>
        </div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
        >
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <span>Email Address</span>
                </div>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400 font-medium">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>Phone Number</span>
                </div>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+250 7XX XXX XXX"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>

            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-semibold transition-colors disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Find My Results</span>
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {searched && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {attempts.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-10 text-center">
                  <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-7 h-7 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">No exams found</h3>
                  <p className="text-gray-500 text-sm">
                    We couldn't find any exam records for that contact information. Make sure you use the same email or phone you used when taking the exam.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Found {attempts.length} exam{attempts.length !== 1 ? 's' : ''}
                  </h2>
                  {attempts.map((attempt) => (
                    <motion.button
                      key={attempt.attempt_id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => navigate(
                        `/public/exam/${attempt.exam?.uuid}/result/${attempt.attempt_id}?token=${attempt.guest?.session_token}`
                      )}
                      className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-left hover:border-primary-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileText className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-base">
                              {attempt.exam?.title || 'Exam'}
                            </h3>
                            {attempt.exam?.subject?.sbj_name && (
                              <p className="text-sm text-gray-500 mt-0.5">{attempt.exam.subject.sbj_name}</p>
                            )}
                            <div className="flex items-center space-x-4 mt-2">
                              {getStatusBadge(attempt)}
                              {attempt.status === 'graded' && attempt.percentage != null && (
                                <span className="flex items-center text-sm text-gray-600">
                                  <Award className="w-3.5 h-3.5 mr-1 text-primary-500" />
                                  {attempt.percentage}% {attempt.grade ? `• Grade: ${attempt.grade}` : ''}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-xs text-gray-400 mt-2">
                              <Clock className="w-3 h-3 mr-1" />
                              {new Date(attempt.submitted_at || attempt.started_at).toLocaleDateString('en-US', {
                                year: 'numeric', month: 'short', day: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PublicExamLookup;
