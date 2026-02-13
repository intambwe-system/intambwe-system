import React, { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Edit, Trash2, Eye, ChevronDown, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, X, RefreshCw, Clock, Users, BookOpen,
  Filter, Grid3X3, List, Play, Copy, Send, BarChart3, Calendar, Lock, Link2, Share2, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../../contexts/EmployeeAuthContext';
import * as examService from '../../../services/examService';
import classService from '../../../services/classService';
import subjectService from '../../../services/subjectService';

const ExamManagement = () => {
  const [exams, setExams] = useState([]);
  const [allExams, setAllExams] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [shareModal, setShareModal] = useState(null);

  const { employee } = useEmployeeAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadExams(), loadClasses(), loadSubjects()]);
  };

  const loadExams = async () => {
    try {
      setLoading(true);
      const res = await examService.getAllExams();
      const data = Array.isArray(res.data) ? res.data : [];
      setAllExams(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load exams');
      setAllExams([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const res = await classService.getAllClasses();
      setClasses(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await subjectService.getAllSubjects();
      setSubjects(Array.isArray(res) ? res : res.data || []);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    }
  };

  // Filter & Sort
  useEffect(() => {
    let filtered = [...allExams];

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.title?.toLowerCase().includes(term) ||
        e.subject?.sbj_name?.toLowerCase().includes(term) ||
        e.class?.class_name?.toLowerCase().includes(term)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(e => e.status === statusFilter);
    }

    filtered.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      if (sortBy === 'title') {
        aVal = aVal.toString().toLowerCase();
        bVal = bVal.toString().toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      // For dates
      aVal = new Date(aVal);
      bVal = new Date(bVal);
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setExams(filtered);
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortBy, sortOrder, allExams]);

  const showToast = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  // Stats
  const totalExams = allExams.length;
  const draftExams = allExams.filter(e => e.status === 'draft').length;
  const publishedExams = allExams.filter(e => e.status === 'published').length;
  const archivedExams = allExams.filter(e => e.status === 'archived').length;

  const handleCreateExam = () => {
    navigate('/employee/dashboard/exams/create');
  };

  const handleEditExam = (exam) => {
    navigate(`/employee/dashboard/exams/${exam.exam_id}/edit`);
  };

  const handleManageQuestions = (exam) => {
    navigate(`/employee/dashboard/exams/${exam.exam_id}/questions`);
  };

  const handleViewExam = (exam) => {
    navigate(`/employee/dashboard/exams/${exam.exam_id}`);
  };

  const handleViewResponses = (exam) => {
    navigate(`/employee/dashboard/exams/${exam.exam_id}/responses`);
  };

  const handleViewParticipants = (exam) => {
    navigate(`/employee/dashboard/exams/${exam.exam_id}/participants`);
  };

  const handlePublish = async (exam) => {
    try {
      setOperationLoading(true);
      await examService.publishExam(exam.exam_id);
      await loadExams();
      showToast('success', `"${exam.title}" published successfully!`);
    } catch (err) {
      showToast('error', err.message || 'Failed to publish exam');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDuplicate = async (exam) => {
    try {
      setOperationLoading(true);
      await examService.duplicateExam(exam.exam_id);
      await loadExams();
      showToast('success', `"${exam.title}" duplicated successfully!`);
    } catch (err) {
      showToast('error', err.message || 'Failed to duplicate exam');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleShareLink = (exam) => {
    if (!exam.is_public) {
      showToast('error', 'Enable "Public Access" in exam settings first to share this exam');
      return;
    }
    setShareModal(exam);
  };

  const copyShareLink = (exam) => {
    const link = `${window.location.origin}/public/exam/${exam.uuid}`;
    navigator.clipboard.writeText(link).then(() => {
      showToast('success', 'Link copied to clipboard!');
    }).catch(() => {
      showToast('error', 'Failed to copy link');
    });
  };

  const handleDelete = async (exam, force = false) => {
    try {
      setOperationLoading(true);
      // Use force=true for published exams or exams with attempts
      const forceParam = force || exam.status === 'published' ? '?force=true' : '';
      await examService.deleteExam(exam.exam_id + forceParam);
      await loadExams();
      setDeleteConfirm(null);
      showToast('success', `"${exam.title}" deleted successfully`);
    } catch (err) {
      // If deletion failed due to attempts, show option to force delete
      if (err.message?.includes('attempt')) {
        setDeleteConfirm({ ...exam, hasAttempts: true, attemptMessage: err.message });
      } else {
        showToast('error', err.message || 'Failed to delete exam');
      }
    } finally {
      setOperationLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: 'bg-yellow-100 text-yellow-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-gray-100 text-gray-800'
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    if (status === 'draft') return <Edit className="w-3 h-3" />;
    if (status === 'published') return <Play className="w-3 h-3" />;
    return <Lock className="w-3 h-3" />;
  };

  const formatDate = (date) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Pagination
  const totalPages = Math.ceil(exams.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExams = exams.slice(startIndex, endIndex);

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-100 rounded-b-lg shadow">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, exams.length)} of {exams.length}
        </div>
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          {pages.map(page => (
            <motion.button
              key={page}
              whileHover={{ scale: 1.05 }}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 text-sm rounded ${currentPage === page
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 border border-gray-200 hover:bg-primary-50'
                }`}
            >
              {page}
            </motion.button>
          ))}
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    );
  };

  // Table View
  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Exam</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden md:table-cell">Subject</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden lg:table-cell">Class</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Status</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden xl:table-cell">Schedule</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden lg:table-cell">Duration</th>
              <th className="text-right py-3 px-4 text-gray-600 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentExams.map((exam) => (
              <motion.tr
                key={exam.exam_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="hover:bg-gray-50"
              >
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{exam.title}</div>
                      <div className="text-xs text-gray-500">
                        {exam.total_points || 0} points • {exam.Questions?.length || 0} questions
                      </div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                  {exam.subject?.sbj_name || 'Not assigned'}
                </td>
                <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">
                  {exam.class?.class_name || 'All Classes'}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(exam.status)}`}>
                    {getStatusIcon(exam.status)}
                    {exam.status}
                  </span>
                </td>
                <td className="py-3 px-4 hidden xl:table-cell">
                  <div className="text-xs text-gray-600">
                    {exam.start_date ? (
                      <>
                        <div>{formatDate(exam.start_date)}</div>
                        <div className="text-gray-400">to {formatDate(exam.end_date)}</div>
                      </>
                    ) : (
                      <span className="text-gray-400">No schedule</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  {exam.has_time_limit ? (
                    <span className="flex items-center gap-1 text-gray-600">
                      <Clock className="w-4 h-4" />
                      {exam.time_limit_minutes} min
                    </span>
                  ) : (
                    <span className="text-gray-400">No limit</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end space-x-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleViewExam(exam)}
                      className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleManageQuestions(exam)}
                      className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
                      title="Manage Questions"
                    >
                      <BookOpen className="w-4 h-4" />
                    </motion.button>
                    {(exam.status === 'published' || exam.attempt_count > 0) && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => handleViewResponses(exam)}
                        className="text-gray-500 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50"
                        title="View Responses"
                      >
                        <Users className="w-4 h-4" />
                      </motion.button>
                    )}
                    {exam.is_public && (exam.status === 'published' || exam.attempt_count > 0) && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => handleViewParticipants(exam)}
                        className="text-gray-500 hover:text-green-600 p-2 rounded-full hover:bg-green-50"
                        title="View Public Participants"
                      >
                        <Globe className="w-4 h-4" />
                      </motion.button>
                    )}
                    {exam.status === 'draft' && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleEditExam(exam)}
                          className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handlePublish(exam)}
                          className="text-gray-500 hover:text-green-600 p-2 rounded-full hover:bg-green-50"
                          title="Publish"
                        >
                          <Send className="w-4 h-4" />
                        </motion.button>
                      </>
                    )}
                    {exam.status === 'published' && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        onClick={() => exam.is_public ? setShareModal(exam) : handleShareLink(exam)}
                        className={`p-2 rounded-full ${exam.is_public ? 'text-purple-500 hover:text-purple-600 hover:bg-purple-50' : 'text-gray-400 hover:text-gray-500 hover:bg-gray-50'}`}
                        title={exam.is_public ? "Share Link" : "Enable Public Access to Share"}
                      >
                        <Link2 className="w-4 h-4" />
                      </motion.button>
                    )}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleDuplicate(exam)}
                      className="text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setDeleteConfirm(exam)}
                      className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // Grid View
  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {currentExams.map((exam) => (
        <motion.div
          key={exam.exam_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="w-12 h-12 bg-primary-50 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(exam.status)}`}>
              {getStatusIcon(exam.status)}
              {exam.status}
            </span>
          </div>
          <div className="mb-3">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{exam.title}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {exam.subject?.sbj_name || 'No subject'} • {exam.class?.class_name || 'All classes'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
            <span className="flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {exam.Questions?.length || 0} Q
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3.5 h-3.5" />
              {exam.total_points || 0} pts
            </span>
            {exam.has_time_limit && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {exam.time_limit_minutes}m
              </span>
            )}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">
              {exam.attempt_count || 0} attempts
            </span>
            <div className="flex gap-1">
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => handleViewExam(exam)}
                className="text-gray-500 hover:text-primary-600 p-1.5 rounded-full hover:bg-primary-50"
              >
                <Eye className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => handleManageQuestions(exam)}
                className="text-gray-500 hover:text-primary-600 p-1.5 rounded-full hover:bg-primary-50"
              >
                <BookOpen className="w-4 h-4" />
              </motion.button>
              {(exam.status === 'published' || exam.attempt_count > 0) && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => handleViewResponses(exam)}
                  className="text-gray-500 hover:text-indigo-600 p-1.5 rounded-full hover:bg-indigo-50"
                  title="View Responses"
                >
                  <Users className="w-4 h-4" />
                </motion.button>
              )}
              {exam.is_public && (exam.status === 'published' || exam.attempt_count > 0) && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => handleViewParticipants(exam)}
                  className="text-gray-500 hover:text-green-600 p-1.5 rounded-full hover:bg-green-50"
                  title="View Public Participants"
                >
                  <Globe className="w-4 h-4" />
                </motion.button>
              )}
              {exam.status === 'draft' && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => handleEditExam(exam)}
                  className="text-gray-500 hover:text-primary-600 p-1.5 rounded-full hover:bg-primary-50"
                >
                  <Edit className="w-4 h-4" />
                </motion.button>
              )}
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => setDeleteConfirm(exam)}
                className="text-gray-500 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white shadow-md z-10">
        <div className="mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Exam Management</h1>
              <p className="text-sm text-gray-500">Create and manage exams for your classes</p>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={loadData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-primary-600 border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm hidden sm:inline">Refresh</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleCreateExam}
                className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Create Exam</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Exams', count: totalExams, color: 'primary', icon: FileText },
            { title: 'Draft', count: draftExams, color: 'yellow', icon: Edit },
            { title: 'Published', count: publishedExams, color: 'green', icon: Play },
            { title: 'Archived', count: archivedExams, color: 'gray', icon: Lock },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow border border-gray-100 p-4"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-3 bg-${stat.color}-50 rounded-full`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-xl font-semibold text-gray-900">{stat.count}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search & Controls */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search exams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="createdAt-asc">Oldest First</option>
                <option value="title-asc">Title (A-Z)</option>
                <option value="title-desc">Title (Z-A)</option>
              </select>
              <div className="flex items-center border border-gray-200 rounded">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setViewMode('table')}
                  className={`p-2 text-sm transition-colors ${viewMode === 'table' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
                >
                  <List className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setViewMode('grid')}
                  className={`p-2 text-sm transition-colors ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Error / Loading / Empty */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center text-gray-600">
            <div className="inline-flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Loading exams...</span>
            </div>
          </div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-primary-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {searchTerm || statusFilter ? 'No Exams Found' : 'No Exams Yet'}
            </p>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {searchTerm || statusFilter ? 'Try adjusting your filters.' : 'Create your first exam to get started.'}
            </p>
            {!searchTerm && !statusFilter && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleCreateExam}
                className="inline-flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your First Exam</span>
              </motion.button>
            )}
          </div>
        ) : (
          <div>
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'grid' && renderGridView()}
            {totalPages > 1 && renderPagination()}
          </div>
        )}

        {/* Toast */}
        <AnimatePresence>
          {operationStatus && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50"
            >
              <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg text-sm ${operationStatus.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                {operationStatus.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                <span className="font-medium">{operationStatus.message}</span>
                <motion.button whileHover={{ scale: 1.1 }} onClick={() => setOperationStatus(null)}>
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        <AnimatePresence>
          {operationLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 flex items-center justify-center z-40"
            >
              <div className="bg-white rounded-lg p-4 shadow-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-700 text-sm font-medium">Processing...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirm */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Exam</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <div className="mb-4 space-y-3">
                  <p className="text-sm text-gray-700">
                    Are you sure you want to delete <span className="font-semibold">"{deleteConfirm.title}"</span>?
                    All questions will also be deleted.
                  </p>
                  {deleteConfirm.status === 'published' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                      <strong>Warning:</strong> This exam is published. Deleting it will also remove all student attempts and responses.
                    </div>
                  )}
                  {deleteConfirm.hasAttempts && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                      <strong>Warning:</strong> {deleteConfirm.attemptMessage || 'This exam has student attempts.'} Click "Force Delete" to delete anyway.
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleDelete(deleteConfirm, deleteConfirm.hasAttempts || deleteConfirm.status === 'published')}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    {deleteConfirm.hasAttempts ? 'Force Delete' : 'Delete'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Link Modal */}
        <AnimatePresence>
          {shareModal && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Share2 className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Share Exam Link</h3>
                      <p className="text-sm text-gray-500">{shareModal.title}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShareModal(null)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Public Exam Link
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        readOnly
                        value={`${window.location.origin}/public/exam/${shareModal.uuid}`}
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600"
                      />
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => copyShareLink(shareModal)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
                      >
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </motion.button>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Anyone with this link can take the exam</li>
                      <li>• Non-students will enter their name & email before starting</li>
                      {shareModal.access_password && (
                        <li>• Password required: <strong>Yes</strong></li>
                      )}
                      <li>• Max attempts: {shareModal.max_attempts}</li>
                    </ul>
                  </div>

                  <div className="flex justify-end">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setShareModal(null)}
                      className="px-4 py-2 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      Close
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ExamManagement;
