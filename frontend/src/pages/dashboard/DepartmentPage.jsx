// DepartmentDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ChevronDown,
  RefreshCw,
  Grid3X3,
  List,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  AlertCircle,
  Minimize2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import departmentService from '../../services/departmentService';
import Swal from 'sweetalert2';

const DepartmentDashboard = () => {
  const [departments, setDepartments] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('dpt_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState('table'); // 'table', 'grid', 'list'
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [formData, setFormData] = useState({ dpt_name: '' });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    handleFilterAndSort();
  }, [searchTerm, sortBy, sortOrder, allDepartments]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await departmentService.getAllDepartments();
      const data = res.data || res || [];
      setAllDepartments(Array.isArray(data) ? data : []);
    } catch (err) {
      showOperationStatus('error', err.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const showOperationStatus = (type, message, duration = 3000) => {
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
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      const compare = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? compare : -compare;
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
        const updated = await departmentService.updateDepartment(selectedDept.dpt_id, {
          dpt_name: formData.dpt_name.trim(),
        });
        setAllDepartments(prev =>
          prev.map(d => (d.dpt_id === selectedDept.dpt_id ? updated : d))
        );
        showOperationStatus('success', `"${formData.dpt_name}" updated successfully!`);
        setShowUpdateModal(false);
      } else {
        const res = await departmentService.createDepartment({
          dpt_name: formData.dpt_name.trim(),
        });
        setAllDepartments(prev => [...prev, res.data || res]);
        showOperationStatus('success', `"${formData.dpt_name}" created successfully!`);
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
    const result = await Swal.fire({
      title: 'Delete Department?',
      text: `This will permanently delete "${dept.dpt_name}"`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete it',
    });

    if (result.isConfirmed) {
      try {
        setOperationLoading(true);
        await departmentService.deleteDepartment(dept.dpt_id);
        setAllDepartments(prev => prev.filter(d => d.dpt_id !== dept.dpt_id));
        showOperationStatus('success', `"${dept.dpt_name}" deleted`);
      } catch (err) {
        showOperationStatus('error', err.message || 'Failed to delete');
      } finally {
        setOperationLoading(false);
      }
    }
    setDeleteConfirm(null);
  };

  const totalPages = Math.ceil(departments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDepts = departments.slice(startIndex, endIndex);

  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100">
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
                  <ChevronDown className={`w-4 h-4 ${sortBy === 'dpt_name' ? 'text-blue-600' : 'text-gray-400'}`} />
                </div>
              </th>
              <th className="text-right py-3 px-4 text-gray-600 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentDepts.map((dept) => (
              <motion.tr
                key={dept.dpt_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="hover:bg-gray-50"
              >
                <td className="py-3 px-4 text-gray-600">#{dept.dpt_id}</td>
                <td className="py-3 px-4 font-medium text-gray-900">{dept.dpt_name}</td>
                <td className="py-3 px-4 text-right space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => handleEdit(dept)}
                    className="text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50"
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
      {currentDepts.map((dept) => (
        <motion.div
          key={dept.dpt_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow border border-gray-100 p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(dept)} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => setDeleteConfirm(dept)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-500">#{dept.dpt_id}</div>
          <h3 className="font-semibold text-gray-900 mt-1">{dept.dpt_name}</h3>
        </motion.div>
      ))}
    </div>
  );

  const renderPagination = () => {
    const pages = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) startPage = Math.max(1, endPage - maxVisible + 1);

    for (let i = startPage; i <= endPage; i++) pages.push(i);

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-100 rounded-b-lg">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, departments.length)} of {departments.length}
        </div>
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 border rounded hover:bg-blue-50 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          {pages.map(page => (
            <motion.button
              key={page}
              whileHover={{ scale: 1.05 }}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'border hover:bg-blue-50'}`}
            >
              {page}
            </motion.button>
          ))}
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1.5 border rounded hover:bg-blue-50 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* Sticky Header */}
      <div className="sticky top-0 bg-white shadow-md z-10 border-b">
        <div className=" mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {}}
                className="text-gray-600 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50"
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
                onClick={loadData}
                className="flex items-center space-x-2 px-4 py-2 border rounded hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleAdd}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Department</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg shadow border p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-50 rounded-full">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Departments</p>
                <p className="text-xl font-semibold text-gray-900">{totalDepartments}</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white rounded-lg shadow border p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-50 rounded-full">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-xl font-semibold text-gray-900">{totalDepartments}</p>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-lg shadow border p-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gray-50 rounded-full">
                <Building2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-xl font-semibold text-green-600">All Active</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search & Controls */}
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10 pr-10 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex border rounded">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-lg shadow border p-12 text-center">
            <div className="inline-flex items-center gap-2 text-gray-600">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading departments...</span>
            </div>
          </div>
        ) : departments.length === 0 ? (
          <div className="bg-white rounded-lg shadow border p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900">
              {searchTerm ? 'No departments found' : 'No departments available'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Click "Add Department" to create one</p>
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
              className="fixed top-4 right-4 z-50"
            >
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm ${
                operationStatus.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
                'bg-red-50 border border-red-200 text-red-800'
              }`}>
                {operationStatus.type === 'success' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                <span className="font-medium">{operationStatus.message}</span>
                <button onClick={() => setOperationStatus(null)} className="ml-4">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        {operationLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40"
          >
            <div className="bg-white rounded-lg p-4 shadow-xl">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Delete Confirmation */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Delete Department</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-6">
                  Are you sure you want to delete <strong>{deleteConfirm.dpt_name}</strong>?
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 border rounded hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(deleteConfirm)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
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
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => {
                setShowAddModal(false);
                setShowUpdateModal(false);
              }}
            >
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
              >
                <h3 className="text-lg font-semibold mb-4">
                  {showUpdateModal ? 'Edit Department' : 'Add New Department'}
                </h3>
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">
                    {formError}
                  </div>
                )}
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department Name *
                    </label>
                    <input
                      type="text"
                      value={formData.dpt_name}
                      onChange={e => setFormData({ dpt_name: e.target.value })}
                      className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Human Resources"
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
                      }}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={operationLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
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

export default DepartmentDashboard;