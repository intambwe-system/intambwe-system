import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, Search, RefreshCw, Trash2, Mail, Phone,
  CheckCircle, XCircle, Clock, AlertTriangle, ChevronLeft,
  ChevronRight, Download, Eye, Loader2, Filter, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as examService from '../../../services/examService';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'graded', label: 'Graded' },
  { value: 'timed_out', label: 'Timed Out' },
];

const formatDuration = (seconds) => {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
};

const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const StatusBadge = ({ status }) => {
  const map = {
    graded:      { color: 'bg-green-100 text-green-800',  icon: CheckCircle, label: 'Graded' },
    submitted:   { color: 'bg-blue-100 text-blue-800',    icon: Clock,       label: 'Submitted' },
    in_progress: { color: 'bg-yellow-100 text-yellow-800',icon: Loader2,     label: 'In Progress' },
    timed_out:   { color: 'bg-red-100 text-red-800',      icon: AlertTriangle,label: 'Timed Out' },
  };
  const { color, icon: Icon, label } = map[status] || { color: 'bg-gray-100 text-gray-600', icon: Clock, label: status };
  return (
    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </span>
  );
};

const PassBadge = ({ status }) => {
  if (!status || status === 'pending') return <span className="text-xs text-gray-400">Pending</span>;
  return status === 'passed'
    ? <span className="inline-flex items-center space-x-1 text-xs font-medium text-green-700"><CheckCircle className="w-3 h-3" /><span>Passed</span></span>
    : <span className="inline-flex items-center space-x-1 text-xs font-medium text-red-600"><XCircle className="w-3 h-3" /><span>Failed</span></span>;
};

const PublicExamParticipants = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [examTitle, setExamTitle] = useState('');
  const [participants, setParticipants] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [searchInput, setSearchInput] = useState('');

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const filters = { page, limit: 20 };
      if (search) filters.search = search;
      if (statusFilter) filters.status = statusFilter;

      const res = await examService.getPublicExamParticipants(examId, filters);
      setParticipants(res.data || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 });

      // Load exam title on first fetch
      if (!examTitle) {
        const examRes = await examService.getExamById(examId);
        setExamTitle((examRes.data || examRes)?.title || 'Exam');
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load participants');
    } finally {
      setLoading(false);
    }
  }, [examId, search, statusFilter, examTitle]);

  useEffect(() => {
    load(1);
  }, [search, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      await examService.deletePublicExamAttempt(examId, deleteConfirm.attempt_id);
      showToast('success', 'Attempt deleted successfully');
      setDeleteConfirm(null);
      load(pagination.page);
    } catch (err) {
      showToast('error', err.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (!participants.length) return;
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Score', 'Percentage', 'Grade', 'Pass/Fail', 'Duration', 'Tab Switches', 'Started At', 'Submitted At', 'IP Address'];
    const rows = participants.map(a => [
      a.guest?.full_name || '',
      a.guest?.email || '',
      a.guest?.phone || '',
      a.status,
      a.total_score != null ? `${a.total_score}/${a.max_score}` : '',
      a.percentage != null ? `${parseFloat(a.percentage).toFixed(1)}%` : '',
      a.grade || '',
      a.pass_status || '',
      a.time_taken_seconds ? formatDuration(a.time_taken_seconds) : '',
      a.tab_switches || 0,
      a.started_at ? new Date(a.started_at).toLocaleString() : '',
      a.submitted_at ? new Date(a.submitted_at).toLocaleString() : '',
      a.guest?.ip_address || '',
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${examTitle.replace(/\s+/g, '_')}_participants.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-md z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => navigate('/employee/dashboard/exams')}
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{examTitle} — Participants</h1>
                <p className="text-sm text-gray-500">
                  {pagination.total} total attempt{pagination.total !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={handleExportCSV}
              disabled={!participants.length}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40 text-sm"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-7xl mx-auto">
        {/* Filters */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex flex-1 gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by name, email, or phone..."
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {searchInput && (
                  <button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm">
                Search
              </button>
            </form>

            {/* Status filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {STATUS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Refresh */}
            <button
              onClick={() => load(pagination.page)}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Active search indicator */}
          {search && (
            <div className="mt-2 flex items-center space-x-2 text-sm text-primary-700">
              <span>Searching for: <strong>"{search}"</strong></span>
              <button onClick={clearSearch} className="text-primary-600 hover:underline">Clear</button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            </div>
          ) : participants.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No participants found</p>
              {search && <p className="text-sm text-gray-400 mt-1">Try a different search term</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Participant</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Score</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Result</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Duration</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tab Switches</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Started</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {participants.map((attempt) => (
                    <motion.tr
                      key={attempt.attempt_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {attempt.guest?.full_name || 'Anonymous'}
                        </div>
                        <div className="text-xs text-gray-400">
                          IP: {attempt.guest?.ip_address || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {attempt.guest?.email && (
                          <div className="flex items-center space-x-1 text-gray-600">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span>{attempt.guest.email}</span>
                          </div>
                        )}
                        {attempt.guest?.phone && (
                          <div className="flex items-center space-x-1 text-gray-600 mt-0.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <span>{attempt.guest.phone}</span>
                          </div>
                        )}
                        {!attempt.guest?.email && !attempt.guest?.phone && (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={attempt.status} />
                      </td>
                      <td className="px-4 py-3">
                        {attempt.total_score != null ? (
                          <div>
                            <span className="font-semibold text-gray-900">
                              {parseFloat(attempt.total_score).toFixed(1)}
                            </span>
                            <span className="text-gray-400 text-xs"> / {attempt.max_score}</span>
                            <div className="text-xs text-gray-500">
                              {attempt.percentage != null ? `${parseFloat(attempt.percentage).toFixed(1)}%` : ''}
                              {attempt.grade && <span className="ml-1 font-medium text-primary-600">{attempt.grade}</span>}
                            </div>
                          </div>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <PassBadge status={attempt.pass_status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDuration(attempt.time_taken_seconds)}
                      </td>
                      <td className="px-4 py-3">
                        {attempt.tab_switches > 0 ? (
                          <span className={`font-medium ${attempt.tab_switches >= 3 ? 'text-red-600' : 'text-amber-600'}`}>
                            {attempt.tab_switches}
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {formatDate(attempt.started_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => setDeleteConfirm(attempt)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete attempt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => load(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-40"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-700">Page {pagination.page} of {pagination.totalPages}</span>
                <button
                  onClick={() => load(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded disabled:opacity-40"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Attempt</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-1">
                Delete attempt by <strong>{deleteConfirm.guest?.full_name || 'Anonymous'}</strong>?
              </p>
              {deleteConfirm.guest?.email && (
                <p className="text-sm text-gray-500 mb-4">{deleteConfirm.guest.email}</p>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
                >
                  {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg text-sm ${
              toast.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              <span>{toast.message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PublicExamParticipants;
