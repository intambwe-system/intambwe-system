// src/pages/StudentManagementDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Search, Edit, Trash2, ChevronDown, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, X, RefreshCw,
  Grid3X3, List, User, Calendar, Phone, Mail, School
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Combobox } from '@headlessui/react';
import studentService from '../../services/studentService';
import classService from '../../services/classService';

const StudentManagementDashboard = () => {
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('std_fname');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [classQuery, setClassQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);

  const [formData, setFormData] = useState({
    std_fname: '',
    std_lname: '',
    std_email: '',
    std_phoneNumber: '',
    std_dob: '',
    std_gender: 'Male',
    class_id: ''
  });

  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadStudents();
    loadClasses();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await studentService.getAllStudents();
      const data = Array.isArray(res) ? res : res.data || [];
      setAllStudents(data);
      setStudents(data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load students');
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = async () => {
    try {
      const res = await classService.getAllClasses();
      const data = Array.isArray(res) ? res : res.data || [];
      setClasses(data);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const loadData = async () => {
    await Promise.all([loadStudents(), loadClasses()]);
  };

  useEffect(() => {
    let filtered = [...allStudents];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        `${s.std_fname} ${s.std_lname}`.toLowerCase().includes(term) ||
        s.std_email?.toLowerCase().includes(term) ||
        s.std_phoneNumber?.includes(term)
      );
    }

    filtered.sort((a, b) => {
      let aVal = a[sortBy] || '';
      let bVal = b[sortBy] || '';
      if (sortBy === 'std_fname') {
        aVal = `${a.std_fname} ${a.std_lname}`.toLowerCase();
        bVal = `${b.std_fname} ${b.std_lname}`.toLowerCase();
      } else {
        aVal = aVal.toString().toLowerCase();
        bVal = bVal.toString().toLowerCase();
      }
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

    setStudents(filtered);
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, allStudents]);

  const showToast = (type, message, duration = 3500) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const totalStudents = allStudents.length;
  const boys = allStudents.filter(s => s.std_gender === 'Male').length;
  const girls = allStudents.filter(s => s.std_gender === 'Female').length;

  const filteredClasses = useMemo(() => {
    return classes.filter(c =>
      c.class_name?.toLowerCase().includes(classQuery.toLowerCase())
    );
  }, [classes, classQuery]);

  const handleAddStudent = () => {
    setFormData({
      std_fname: '',
      std_lname: '',
      std_email: '',
      std_phoneNumber: '',
      std_dob: '',
      std_gender: 'Male',
      class_id: ''
    });
    setSelectedClass(null);
    setFormError('');
    setShowAddModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.std_fname || !formData.std_lname) {
      setFormError('First name and last name are required');
      return;
    }
    try {
      setOperationLoading(true);
      await studentService.createStudent({
        ...formData,
        class_id: selectedClass?.class_id || null
      });
      await loadStudents();
      setShowAddModal(false);
      showToast('success', `${formData.std_fname} ${formData.std_lname} added successfully!`);
    } catch (err) {
      setFormError(err.message || 'Failed to create student');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    const cls = classes.find(c => c.class_id === student.class_id);
    setSelectedClass(cls || null);
    setFormData({
      std_fname: student.std_fname || '',
      std_lname: student.std_lname || '',
      std_email: student.std_email || '',
      std_phoneNumber: student.std_phoneNumber || '',
      std_dob: student.std_dob || '',
      std_gender: student.std_gender || 'Male',
      class_id: student.class_id || ''
    });
    setFormError('');
    setShowUpdateModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.std_fname || !formData.std_lname) {
      setFormError('First name and last name are required');
      return;
    }
    try {
      setOperationLoading(true);
      await studentService.updateStudent(selectedStudent.std_id, {
        ...formData,
        class_id: selectedClass?.class_id || null
      });
      await loadStudents();
      setShowUpdateModal(false);
      showToast('success', `${formData.std_fname} ${formData.std_lname} updated successfully!`);
    } catch (err) {
      setFormError(err.message || 'Failed to update student');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async (student) => {
    try {
      setOperationLoading(true);
      await studentService.deleteStudent(student.std_id);
      await loadStudents();
      setDeleteConfirm(null);
      showToast('success', `${student.std_fname} ${student.std_lname} deleted successfully`);
    } catch (err) {
      showToast('error', err.message || 'Failed to delete student');
    } finally {
      setOperationLoading(false);
    }
  };

  const getFullName = (s) => `${s.std_fname} ${s.std_lname}`;
  const getClassName = (id) => classes.find(c => c.class_id === id)?.class_name || '-';

  const totalPages = Math.ceil(students.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentStudents = students.slice(startIdx, startIdx + itemsPerPage);

  const getGenderColor = (gender) => {
    return gender === 'Male'
      ? 'bg-blue-100 text-blue-800'
      : gender === 'Female'
      ? 'bg-pink-100 text-pink-800'
      : 'bg-gray-100 text-gray-800';
  };

  const ClassSelect = ({ value, onChange }) => (
    <Combobox value={value} onChange={onChange}>
      <div className="relative">
        <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
          Class *
        </Combobox.Label>
        <Combobox.Input
          className="w-full px-4 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          displayValue={(cls) => cls?.class_name || ''}
          onChange={(e) => setClassQuery(e.target.value)}
          placeholder="Search class..."
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3 mt-6">
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </Combobox.Button>
        <AnimatePresence>
          {filteredClasses.length > 0 && (
            <Combobox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5">
              {filteredClasses.map((cls) => (
                <Combobox.Option
                  key={cls.class_id}
                  value={cls}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-600 text-white' : 'text-gray-900'}`
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {cls.class_name}
                      </span>
                      {selected && (
                        <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-primary-600'}`}>
                          <CheckCircle className="w-5 h-5" />
                        </span>
                      )}
                    </>
                  )}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          )}
        </AnimatePresence>
      </div>
    </Combobox>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-sm z-10 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
              <p className="text-sm text-gray-500">Manage all students in the system</p>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleAddStudent}
                className="flex items-center gap-2 bg-primary-600 text-white px-5 py-2 rounded-lg shadow hover:bg-primary-700"
              >
                <Plus className="w-5 h-5" />
                Add Student
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Total Students', value: totalStudents, icon: Users, color: 'blue' },
            { label: 'Boys', value: boys, icon: User, color: 'sky' },
            { label: 'Girls', value: girls, icon: User, color: 'pink' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 bg-${stat.color}-100 rounded-lg`}>
                  <stat.icon className={`w-8 h-8 text-${stat.color}-600`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Search & Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="std_fname-asc">Name (A-Z)</option>
                <option value="std_fname-desc">Name (Z-A)</option>
                <option value="std_email-asc">Email (A-Z)</option>
                <option value="std_email-desc">Email (Z-A)</option>
              </select>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                {['table', 'grid', 'list'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2 ${viewMode === mode ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {mode === 'table' && <List className="w-5 h-5" />}
                    {mode === 'grid' && <Grid3X3 className="w-5 h-5" />}
                    {mode === 'list' && <School className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentStudents.map((student) => (
                    <motion.tr key={student.std_id} whileHover={{ backgroundColor: '#f9fafb' }}>
                      <td className="px-6 py-4 text-sm text-gray-900">{student.std_id}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{getFullName(student)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getGenderColor(student.std_gender)}`}>
                          {student.std_gender || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{getClassName(student.class_id)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.std_email || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{student.std_phoneNumber || '-'}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleEdit(student)} className="text-primary-600 hover:text-primary-800">
                          <Edit className="w-4 h-4" />
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.1 }} onClick={() => setDeleteConfirm(student)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t">
                <div className="text-sm text-gray-700">
                  Showing {startIdx + 1} to {Math.min(startIdx + itemsPerPage, students.length)} of {students.length} students
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i+1}
                      onClick={() => setCurrentPage(i+1)}
                      className={`px-3 py-1 rounded ${currentPage === i+1 ? 'bg-primary-600 text-white' : 'border hover:bg-gray-100'}`}
                    >
                      {i+1}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Toast */}
        <AnimatePresence>
          {operationStatus && (
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="fixed top-20 right-6 z-50"
            >
              <div className={`flex items-center gap-3 px-6 py-3 rounded-lg shadow-lg text-white ${operationStatus.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                {operationStatus.type === 'success' ? <CheckCircle /> : <XCircle />}
                <span>{operationStatus.message}</span>
                <button onClick={() => setOperationStatus(null)}><X className="w-5 h-5" /></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modals */}
        <AnimatePresence>
          {(showAddModal || showUpdateModal || deleteConfirm) && (
            <Modal
              title={
                deleteConfirm ? "Delete Student" :
                showAddModal ? "Add New Student" : "Update Student"
              }
              onClose={() => {
                setShowAddModal(false);
                setShowUpdateModal(false);
                setDeleteConfirm(null);
              }}
            >
              {deleteConfirm ? (
                <>
                  <p>Are you sure you want to delete <strong>{getFullName(deleteConfirm)}</strong>? This cannot be undone.</p>
                  <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                    <button onClick={() => handleDelete(deleteConfirm)} className="px-6 py-2 bg-red-600 text-white rounded">Delete</button>
                  </div>
                </>
              ) : (
                <form onSubmit={showAddModal ? handleCreate : handleUpdate} className="space-y-4">
                  {formError && <div className="bg-red-100 text-red-700 p-3 rounded">{formError}</div>}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input name="std_fname" placeholder="First Name *" value={formData.std_fname} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
                    </div>
                    <div>
                      <input name="std_lname" placeholder="Last Name *" value={formData.std_lname} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" required />
                    </div>
                  </div>
                  <select name="std_gender" value={formData.std_gender} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  <input type="email" name="std_email" placeholder="Email" value={formData.std_email} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                  <input type="tel" name="std_phoneNumber" placeholder="Phone" value={formData.std_phoneNumber} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                  <input type="date" name="std_dob" value={formData.std_dob} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg" />
                  <ClassSelect value={selectedClass} onChange={setSelectedClass} />
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => showAddModal ? setShowAddModal(false) : setShowUpdateModal(false)} className="px-4 py-2 border rounded hover:bg-gray-100">Cancel</button>
                    <button type="submit" disabled={operationLoading} className="px-6 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50">
                      {operationLoading ? 'Saving...' : (showAddModal ? 'Create Student' : 'Update Student')}
                    </button>
                  </div>
                </form>
              )}
            </Modal>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Modal = ({ title, children, onClose }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="bg-white rounded-xl p-6 w-full max-w-lg"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button onClick={onClose}><X className="w-5 h-5 text-gray-500" /></button>
      </div>
      {children}
    </motion.div>
  </motion.div>
);

export default StudentManagementDashboard;