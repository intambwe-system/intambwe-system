// DepartmentManagementDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2, Plus, Search, Edit, Trash2, ChevronDown, ChevronLeft, ChevronRight,
  RefreshCw, Grid3X3, List, Minimize2, X, AlertTriangle, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import departmentService from '../../services/departmentService';

const DepartmentManagementDashboard = () => {
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('dpt_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);

  const [formData, setFormData] = useState({ dpt_name: '' });
  const [formError, setFormError] = useState('');

  // Load departments on mount
  useEffect(() => {
    loadDepartments();
  }, []);

  // Re-filter & sort when needed
  useEffect(() => {
    handleFilterAndSort();
  }, [searchTerm, sortBy, sortOrder, allDepartments]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await departmentService.getAllDepartments();
      const data = res.data || res || [];
      setAllDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load departments');
      setAllDepartments([]);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const handleFilterAndSort = () => {
    let filtered = [...allDepartments];

    if (searchTerm.trim()) {
      filtered = filtered.filter(dept =>
        dept.dpt_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const aVal = (a[sortBy] || '').toString().toLowerCase();
      const bVal = (b[sortBy] || '').toString().toLowerCase();
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

    setDepartments(filtered);
    setCurrentPage(1);
  };

  const totalDepartments = allDepartments.length;

  const handleAdd = () => {
    setFormData({ dpt_name: '' });
    setFormError('');
    setShowAddModal(true);
  };

  const handleEdit = (dept) => {
    setSelectedDept(dept);
    setFormData({ dpt_name: dept.dpt_name });
    setFormError('');
    setShowUpdateModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.dpt_name.trim()) {
      setFormError('Department name is required');
      return;
    }

    try {
      setOperationLoading(true);
      if (showUpdateModal && selectedDept) {
        await departmentService.updateDepartment(selectedDept.dpt_id, {
          dpt_name: formData.dpt_name.trim()
        });
        setAllDepartments(prev =>
          prev.map(d => d.dpt_id === selectedDept.dpt_id ? { ...d, dpt_name: formData.dpt_name.trim() } : d)
        );
        showToast('success', `"${formData.dpt_name}" updated successfully!`);
        setShowUpdateModal(false);
      } else {
        const res = await departmentService.createDepartment({
          dpt_name: formData.dpt_name.trim()
        });
        setAllDepartments(prev => [...prev, res.data || res]);
        showToast('success', `"${formData.dpt_name}" created successfully!`);
        setShowAddModal(false);
      }
      setFormData({ dpt_name: '' });
      setSelectedDept(null);
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async (dept) => {
    try {
      setOperationLoading(true);
      await departmentService.deleteDepartment(dept.dpt_id);
      setAllDepartments(prev => prev.filter(d => d.dpt_id !== dept.dpt_id));
      showToast('success', `"${dept.dpt_name}" deleted successfully`);
      setDeleteConfirm(null);
    } catch (err) {
      showToast('error', err.message || 'Failed to delete department');
    } finally {
      setOperationLoading(false);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(departments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDepts = departments.slice(startIndex, endIndex);

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-100 rounded-b-lg shadow">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, departments.length)} of {departments.length}
        </div>
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          {pages.map(page => (
            <motion.button
              key={page}
              whileHover={{ scale: 1.05 }}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 text-sm rounded ${
                currentPage === page
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
            className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    );
  };

  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">ID</th>
              <th
                className="text-left py-3 px-4 text-gray-600 font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  setSortBy('dpt_name');
                  setSortOrder(sortBy === 'dpt_name' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
                }}
              >
                <div className="flex items-center space-x-1">
                  <span>Department Name</span>
                  <ChevronDown className={`w-4 h-4 ${sortBy === 'dpt_name' ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>
              </th>
              <th className="text-right py-3 px-4 text-gray-600 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentDepts.map(dept => (
              <motion.tr
                key={dept.dpt_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-gray-50"
              >
                <td className="py-3 px-4 text-gray-600">{dept.dpt_id}</td>
                <td className="py-3 px-4 font-medium text-gray-900">{dept.dpt_name}</td>
                <td className="py-3 px-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleEdit(dept)}
                      className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
                    >
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setDeleteConfirm(dept)}
                      className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
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

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {currentDepts.map(dept => (
        <motion.div
          key={dept.dpt_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow border border-gray-100 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => handleEdit(dept)}
                className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
              >
                <Edit className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => setDeleteConfirm(dept)}
                className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
          <div className="text-xs text-gray-500">ID: #{dept.dpt_id}</div>
          <h3 className="font-semibold text-gray-900 mt-1">{dept.dpt_name}</h3>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white shadow-md z-10 border-b">
        <div className=" mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="text-gray-600 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
              >
                <Minimize2 className="w-5 h-5" />
              </motion.button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Department Management</h1>
                <p className="text-sm text-gray-500">Manage all departments in your organization</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={loadDepartments}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-primary-600 border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleAdd}
                className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Department</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto px-4 py-6 space-y-6">
        {/* Stats Card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow border border-gray-100 p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Departments</p>
                <p className="text-2xl font-bold text-gray-900">{totalDepartments}</p>
              </div>
              <div className="p-3 bg-primary-50 rounded-full">
                <Building2 className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search & View Controls */}
        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-80 pl-10 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="flex items-center gap-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={e => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="dpt_name-asc">Name (A-Z)</option>
                <option value="dpt_name-desc">Name (Z-A)</option>
              </select>
              <div className="flex border border-gray-200 rounded overflow-hidden">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 ${viewMode === 'table' ? 'bg-primary-50 text-primary-600' : 'text-gray-600'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-600'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error / Loading / Empty States */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-12 text-center">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading departments...</span>
            </div>
          </div>
        ) : departments.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">
              {searchTerm ? 'No departments found' : 'No departments yet'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm ? 'Try a different search term' : 'Click "Add Department" to create one'}
            </p>
          </div>
        ) : (
          <div>
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'grid' && renderGridView()}
            {totalPages > 1 && renderPagination()}
          </div>
        )}

        {/* Toast Notification */}
        <AnimatePresence>
          {operationStatus && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm border ${
                operationStatus.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {operationStatus.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                <span className="font-medium">{operationStatus.message}</span>
                <button onClick={() => setOperationStatus(null)}>
                  <X className="w-4 h-4" />
                </button>
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
              className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-700 font-medium">Processing...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Department</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-6">
                  Are you sure you want to delete <strong>"{deleteConfirm.dpt_name}"</strong>?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add / Edit Modal */}
        <AnimatePresence>
          {(showAddModal || showUpdateModal) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowAddModal(false); setShowUpdateModal(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {showUpdateModal ? 'Edit Department' : 'Add New Department'}
                </h3>
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                    {formError}
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      value={formData.dpt_name}
                      onChange={e => setFormData({ dpt_name: e.target.value })}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g. Computer Science"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowUpdateModal(false);
                        setFormError('');
                      }}
                      className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={operationLoading}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                    >
                      {operationLoading ? 'Saving...' : showUpdateModal ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DepartmentManagementDashboard;