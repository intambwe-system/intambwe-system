// SubjectPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import subjectService from '../../services/subjectService';
import tradeService from '../../services/tradeService';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';

const Modal = ({ show, title, onClose, children }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gray-600/75 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-white rounded-xl shadow-2xl w-full max-w-lg"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-5 border-b border-gray-100">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              {title}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

const initialFormData = {
  sbj_name: '',
  sbj_code: '',
  category_type: 'GENERAL', // Default category
};

export default function SubjectPage() {
  const { employee } = useEmployeeAuth();
  const isAdmin = employee?.emp_role === 'admin';

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  // Trade-related state
  const [trades, setTrades] = useState([]);
  const [tradeSearch, setTradeSearch] = useState('');
  const [selectedTradeIds, setSelectedTradeIds] = useState([]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState('');
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsSubject, setDetailsSubject] = useState(null);

  const showToast = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (searchTerm.trim()) {
        params.query = searchTerm.trim();
      }
      const res = await subjectService.getAllSubjects(params);
      const data = res.data || res;
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
      setError(err.message || 'Failed to load subjects. Check API connection.');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await tradeService.getAllTrades();
      const data = res.data || res;
      setTrades(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch trades:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.sbj_name.trim() || !formData.sbj_code.trim()) {
      setFormError('Subject name and subject code are required');
      return;
    }

    const payload = {
      sbj_name: formData.sbj_name.trim(),
      sbj_code: formData.sbj_code.trim(),
      category_type: formData.category_type,
      trade_ids: selectedTradeIds,
    };

    try {
      setOperationLoading(true);

      if (showUpdateModal && selectedSubject) {
        await subjectService.updateSubject(selectedSubject.sbj_id, payload);
        showToast('success', 'Subject updated successfully');
        setShowUpdateModal(false);
      } else {
        await subjectService.createSubject(payload);
        showToast('success', 'Subject created successfully');
        setShowAddModal(false);
      }

      setFormData(initialFormData);
      setSelectedSubject(null);
      setSelectedTradeIds([]);
      await fetchSubjects();
    } catch (err) {
      const backendMessage = err.message || 'Operation failed';
      setFormError(backendMessage);
      showToast('error', backendMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async (subject) => {
    try {
      setOperationLoading(true);
      await subjectService.deleteSubject(subject.sbj_id);
      showToast('success', 'Subject deleted successfully');
      setDeleteConfirm(null);
      await fetchSubjects();
    } catch (err) {
      const msg = err.message || 'Failed to delete subject';
      showToast('error', msg);
    } finally {
      setOperationLoading(false);
    }
  };

  const filteredSubjects = useMemo(() => {
    let result = [...subjects];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(s =>
        (s.sbj_name || '').toLowerCase().includes(q) ||
        (s.sbj_code || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [subjects, searchTerm]);

  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSubjects = filteredSubjects.slice(startIndex, endIndex);

  useEffect(() => {
    fetchSubjects();
    fetchTrades();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAdd = () => {
    setFormData(initialFormData);
    setFormError('');
    setSelectedSubject(null);
    setSelectedTradeIds([]);
    setShowAddModal(true);
  };

  const handleEdit = (subject) => {
    setSelectedSubject(subject);
    setFormData({
      sbj_name: subject.sbj_name || '',
      sbj_code: subject.sbj_code || '',
      category_type: subject.category_type || 'GENERAL',
    });
    setSelectedTradeIds([]);
    setFormError('');
    setShowUpdateModal(true);
  };

  const handleViewDetails = (subject) => {
    setDetailsSubject(subject);
    setShowDetailsModal(true);
  };

  const getCategoryBadge = (type) => {
    const styles = {
      CORE: 'bg-purple-100 text-purple-800 border-purple-300',
      COMPLEMENTARY: 'bg-amber-100 text-amber-800 border-amber-300',
      GENERAL: 'bg-blue-100 text-blue-800 border-blue-300',
    };

    const displayText = type.charAt(0) + type.slice(1).toLowerCase();

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[type] || styles.GENERAL}`}>
        {displayText}
      </span>
    );
  };

  const RenderToast = () => {
    if (!operationStatus) return null;
    const { type, message } = operationStatus;
    const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertTriangle;
    const colors = {
      success: 'bg-emerald-50 border-emerald-500 text-emerald-700',
      error: 'bg-red-50 border-red-500 text-red-700',
      warning: 'bg-yellow-50 border-yellow-500 text-yellow-700',
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`fixed bottom-5 right-5 z-50 p-4 rounded-lg border-l-4 shadow-lg ${colors[type]}`}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 flex-shrink-0" />
          <p className="font-medium text-sm">{message}</p>
        </div>
      </motion.div>
    );
  };

  const renderEmptyState = () => (
    <div className="text-center py-12 bg-white rounded-lg border border-gray-100 mt-4">
      <AlertCircle className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-slate-900">No Subjects Found</h3>
      <p className="text-slate-500 mt-1">
        {searchTerm
          ? `No subjects match your search: "${searchTerm}".`
          : 'Start by adding a new subject to the system.'}
      </p>
      {!searchTerm && isAdmin && (
        <button
          onClick={handleAdd}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Subject
        </button>
      )}
    </div>
  );

  const renderForm = (isUpdate) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded">
          <p className="text-sm font-medium">{formError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Subject Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="sbj_name"
            value={formData.sbj_name}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Subject Code <span className="text-red-500">*</span></label>
          <input
            type="text"
            name="sbj_code"
            value={formData.sbj_code}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
      </div>

      {/* Category Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Category Type <span className="text-red-500">*</span>
        </label>
        <select
          name="category_type"
          value={formData.category_type}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-indigo-500 focus:border-indigo-500"
          required
        >
          <option value="GENERAL">General</option>
          <option value="COMPLEMENTARY">Complementary</option>
          <option value="CORE">Core</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Core = main vocational subject • Complementary = supporting vocational • General = common academic
        </p>
      </div>

      {/* Trades multi-select */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Trades (optional, multi-select)</label>
        <p className="text-xs text-gray-500 mb-2">Search and select one or more trades that can learn this subject.</p>

        <div className="border border-gray-300 rounded-md p-3 space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={tradeSearch}
              onChange={(e) => setTradeSearch(e.target.value)}
              placeholder="Search trades by name..."
              className="flex-1 border border-gray-200 rounded-md px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setSelectedTradeIds(trades.map(t => t.trade_id))}
              className="text-xs px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setSelectedTradeIds([])}
              className="text-xs px-2 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100"
            >
              Clear
            </button>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1">
            {trades
              .filter(t =>
                tradeSearch.trim()
                  ? (t.trade_name || '').toLowerCase().includes(tradeSearch.toLowerCase())
                  : true
              )
              .map(trade => {
                const checked = selectedTradeIds.includes(trade.trade_id);
                return (
                  <label
                    key={trade.trade_id}
                    className={`flex items-center justify-between px-2 py-1 rounded-md text-sm cursor-pointer ${
                      checked ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        checked={checked}
                        onChange={() => {
                          setSelectedTradeIds(prev =>
                            checked
                              ? prev.filter(id => id !== trade.trade_id)
                              : [...prev, trade.trade_id]
                          );
                        }}
                      />
                      <span>{trade.trade_name}</span>
                    </div>
                  </label>
                );
              })}

            {trades.length === 0 && (
              <p className="text-xs text-gray-400">No trades loaded. Ensure trade data exists.</p>
            )}
          </div>

          {selectedTradeIds.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {trades
                .filter(t => selectedTradeIds.includes(t.trade_id))
                .map(t => (
                  <span
                    key={t.trade_id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700"
                  >
                    {t.trade_name}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedTradeIds(prev => prev.filter(id => id !== t.trade_id))
                      }
                      className="ml-1 text-indigo-500 hover:text-indigo-700"
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setShowAddModal(false);
            setShowUpdateModal(false);
            setFormData(initialFormData);
            setFormError('');
          }}
          className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
          disabled={operationLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={operationLoading}
        >
          {operationLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              {isUpdate ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            isUpdate ? 'Save Changes' : 'Add Subject'
          )}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Subject Management
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={fetchSubjects}
              className="p-2 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition"
              disabled={loading || operationLoading}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {isAdmin && (
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Subject
              </button>
            )}
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex justify-between items-center border border-gray-100">
          <div className="relative flex-grow mr-4">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search subjects by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-indigo-600">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading subjects...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">
              <XCircle className="w-6 h-6 mx-auto mb-2" />
              <p>Error: {error}</p>
            </div>
          ) : currentSubjects.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['ID', 'Name', 'Code', 'Category', 'Trades', 'Actions'].map((header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentSubjects.map((subject, index) => (
                      <motion.tr
                        key={subject.sbj_id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="hover:bg-indigo-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {startIndex + index + 1} {subject.sbj_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{subject.sbj_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{subject.sbj_code}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {getCategoryBadge(subject.category_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {Array.isArray(subject.trades) ? subject.trades.length : 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {isAdmin ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewDetails(subject)}
                                className="text-gray-600 hover:text-gray-900 p-1 rounded-full hover:bg-gray-100 transition"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(subject)}
                                className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-100 transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(subject)}
                                className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">View only</span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredSubjects.length)} of {filteredSubjects.length} results
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-100 rounded-md">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        show={showAddModal}
        title="Add New Subject"
        onClose={() => {
          setShowAddModal(false);
          setFormData(initialFormData);
          setFormError('');
        }}
      >
        {renderForm(false)}
      </Modal>

      <Modal
        show={showUpdateModal}
        title={selectedSubject ? `Edit Subject: ${selectedSubject.sbj_name}` : 'Edit Subject'}
        onClose={() => {
          setShowUpdateModal(false);
          setFormData(initialFormData);
          setFormError('');
          setSelectedSubject(null);
        }}
      >
        {renderForm(true)}
      </Modal>

      {/* Details Modal */}
      <Modal
        show={isAdmin && showDetailsModal && !!detailsSubject}
        title={detailsSubject ? `Subject Details: ${detailsSubject.sbj_name}` : 'Subject Details'}
        onClose={() => {
          setShowDetailsModal(false);
          setDetailsSubject(null);
        }}
      >
        {detailsSubject && (
          <div className="space-y-4 text-sm text-slate-700">
            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Basic Information</h4>
              <p><span className="font-medium">ID:</span> {String(detailsSubject.sbj_id).padStart(4, '0')}</p>
              <p><span className="font-medium">Name:</span> {detailsSubject.sbj_name}</p>
              <p><span className="font-medium">Code:</span> {detailsSubject.sbj_code}</p>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Category</h4>
              <div className="mt-1">
                {getCategoryBadge(detailsSubject.category_type)}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-slate-900 mb-1">Trades Learning This Subject</h4>
              {Array.isArray(detailsSubject.trades) && detailsSubject.trades.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {detailsSubject.trades.map(trade => (
                    <span
                      key={trade.trade_id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700"
                    >
                      {trade.trade_name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500">No trades have been linked to this subject yet.</p>
              )}
            </div>

            <div className="text-xs text-gray-400 border-t pt-2">
              Full detailed info on this subject can be found in the subject management section.
            </div>
          </div>
        )}
      </Modal>

      <Modal
        show={!!deleteConfirm}
        title="Confirm Deletion"
        onClose={() => setDeleteConfirm(null)}
      >
        <div className="text-center">
          <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">
            Are you sure you want to delete this subject?
          </h4>
          <p className="text-sm text-slate-500 mb-6">
            This action cannot be undone.
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setDeleteConfirm(null)}
              className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
              disabled={operationLoading}
            >
              Cancel
            </button>
            <button
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-50"
              disabled={operationLoading}
            >
              {operationLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      <RenderToast />
    </div>
  );
}