// src/pages/StudentManagementDashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Search, Edit, Trash2, Eye, ChevronDown, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, X, AlertCircle, RefreshCw,
  Filter, Grid3X3, List, Minimize2, Mail, Phone, User, Calendar, School, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Combobox } from '@headlessui/react';
import studentService from '../../services/studentService';
import classService from '../../services/classService';
import { useNavigate } from 'react-router-dom';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';

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
  const [itemsPerPage] = useState(8);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [classQuery, setClassQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState(null);

  const {employee} = useEmployeeAuth()
 

  const navigate = useNavigate()

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

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadStudents(), loadClasses()]);
  };

  const loadStudents = async () => {  
    try {
      setLoading(true);
      const res = await studentService.getAllStudents();
      const data = Array.isArray(res) ? res : res.data || [];
      setAllStudents(data);
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

  // Filter & Sort
  useEffect(() => {
    let filtered = [...allStudents];

    if (searchTerm.trim()) {
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

  const showToast = (type, message, duration = 3000) => {
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
    navigate(`/employee/dashboard/students/create`)

  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.std_fname?.trim() || !formData.std_lname?.trim()) {
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
      showToast('success', `${formData.std_fname} ${formData.std_lname} created successfully!`);
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
      std_dob: student.std_dob?.split('T')[0] || '',
      std_gender: student.std_gender || 'Male',
      class_id: student.class_id || ''
    });
    setFormError('');
    setShowUpdateModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!formData.std_fname?.trim() || !formData.std_lname?.trim()) {
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

  const handleViewStudent = (student) => {
    if (!student) return null
    navigate(`/employee/dashboard/students/view/${student.std_id}`)

  };

  const getFullName = (s) => `${s.std_fname} ${s.std_lname}`;
  const getClassName = (id) => classes.find(c => c.class_id === id)?.class_name || 'No Class';

  const getGenderBadgeColor = (gender) => {
    if (gender === 'Male') return 'bg-blue-100 text-blue-800';
    if (gender === 'Female') return 'bg-pink-100 text-pink-800';
    return 'bg-gray-100 text-gray-800';
  };

  // Pagination
  const totalPages = Math.ceil(students.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = students.slice(startIndex, endIndex);

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
          Showing {startIndex + 1}-{Math.min(endIndex, students.length)} of {students.length}
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

  // Reusable Class Combobox
  const ClassSelect = ({ value, onChange }) => (
    <Combobox value={value} onChange={onChange} nullable>
      <div className="relative">
        <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
          Class *
        </Combobox.Label>
        <Combobox.Input
          className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          displayValue={(cls) => cls?.class_name || ''}
          onChange={(e) => setClassQuery(e.target.value)}
          placeholder="Search class..."
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 mt-6">
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </Combobox.Button>
        <AnimatePresence>
          {filteredClasses.length > 0 && (
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
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

  // Table View
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
                  setSortBy('std_fname');
                  setSortOrder(sortBy === 'std_fname' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
                }}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  <ChevronDown className={`w-4 h-4 ${sortBy === 'std_fname' ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>
              </th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden lg:table-cell">Gender</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">Class</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden md:table-cell">Contact</th>
              <th className="text-right py-3 px-4 text-gray-600 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentStudents.map((student) => (
              <motion.tr
                key={student.std_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="hover:bg-gray-50"
              >
                <td className="py-3 px-4 text-gray-900">#{student.std_id}</td>
                <td className="py-3 px-4 font-medium text-gray-900">{getFullName(student)}</td>
                <td className="py-3 px-4 hidden lg:table-cell">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getGenderBadgeColor(student.std_gender)}`}>
                    {student.std_gender}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600">{getClassName(student.class_id)}</td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <div className="flex flex-col gap-1">
                    {student.std_email && (
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Mail className="w-4 h-4 text-gray-400" />
                        {student.std_email}
                      </div>
                    )}
                    {student.std_phoneNumber && (
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {student.std_phoneNumber}
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end space-x-2">
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleViewStudent(student)} className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50">
                      <Eye className="w-4 h-4" />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleEdit(student)} className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50">
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => setDeleteConfirm(student)} className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50">
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
      {currentStudents.map((student) => (
        <motion.div
          key={student.std_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">{getFullName(student)}</div>
              <div className="text-gray-500 text-xs">{getClassName(student.class_id)}</div>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getGenderBadgeColor(student.std_gender)}`}>
              {student.std_gender}
            </span>
            <div className="flex gap-2">
              <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleViewStudent(student)} className="text-gray-500 hover:text-primary-600 p-1.5 rounded-full hover:bg-primary-50">
                <Eye className="w-4 h-4" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleEdit(student)} className="text-gray-500 hover:text-primary-600 p-1.5 rounded-full hover:bg-primary-50">
                <Edit className="w-4 h-4" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} onClick={() => setDeleteConfirm(student)} className="text-gray-500 hover:text-red-600 p-1.5 rounded-full hover:bg-red-50">
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
        <div className=" mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="text-gray-600 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
              >
                <Minimize2 className="w-5 h-5" />
              </motion.button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Student Management</h1>
                <p className="text-sm text-gray-500">Manage all students with ease</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={loadData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-primary-600 border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh</span>
              </motion.button>
             
             { employee.emp_role != 'teacher' && <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleAddStudent}
                className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Student</span>
              </motion.button>}
            </div>
          </div>
        </div>
      </div>

      <div className=" mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Students', count: totalStudents, color: 'primary-600', icon: Users },
            { title: 'Boys', count: boys, color: 'blue-600', icon: User },
            { title: 'Girls', count: girls, color: 'pink-600', icon: User },
            { title: 'Classes', count: classes.length, color: 'purple-600', icon: School },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow border border-gray-100 p-4"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-3 bg-${stat.color.replace('600', '50')} rounded-full`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
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
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
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
                <option value="std_fname-asc">Name (A-Z)</option>
                <option value="std_fname-desc">Name (Z-A)</option>
                <option value="std_email-asc">Email (A-Z)</option>
                <option value="std_email-desc">Email (Z-A)</option>
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
              <span className="text-sm">Loading students...</span>
            </div>
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {searchTerm ? 'No Students Found' : 'No Students Available'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Add a new student to get started.'}
            </p>
          </div>
        ) : (
          <div>
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'grid' && renderGridView()}
            {renderPagination()}
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
                    <h3 className="text-lg font-semibold text-gray-900">Delete Student</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-700">
                    Are you sure you want to delete <span className="font-semibold">{getFullName(deleteConfirm)}</span>?
                  </p>
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
                    onClick={() => handleDelete(deleteConfirm)}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add / Edit Modal */}
        <AnimatePresence>
          {(showAddModal || showUpdateModal) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {showAddModal ? 'Add New Student' : 'Update Student'}
                </h3>
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                    {formError}
                  </div>
                )}
                <form onSubmit={showAddModal ? handleCreate : handleUpdate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        name="std_fname"
                        value={formData.std_fname}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        name="std_lname"
                        value={formData.std_lname}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      name="std_gender"
                      value={formData.std_gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="std_email"
                      value={formData.std_email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="std_phoneNumber"
                      value={formData.std_phoneNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      name="std_dob"
                      value={formData.std_dob}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <ClassSelect
                    value={selectedClass}
                    onChange={setSelectedClass}
                  />

                  <div className="flex justify-end space-x-3 pt-4">
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        setShowAddModal(false);
                        setShowUpdateModal(false);
                        setFormError('');
                      }}
                      className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      type="submit"
                      whileHover={{ scale: 1.05 }}
                      disabled={operationLoading}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                    >
                      {operationLoading ? 'Saving...' : (showAddModal ? 'Create Student' : 'Update Student')}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Modal */}
        <AnimatePresence>
          {showViewModal && selectedStudent && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                    <p className="text-sm text-gray-900">#{selectedStudent.std_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <p className="text-sm text-gray-900">{getFullName(selectedStudent)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getGenderBadgeColor(selectedStudent.std_gender)}`}>
                      {selectedStudent.std_gender}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                    <p className="text-sm text-gray-900">{getClassName(selectedStudent.class_id)}</p>
                  </div>
                  {selectedStudent.std_email && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <p className="text-sm text-gray-900">{selectedStudent.std_email}</p>
                    </div>
                  )}
                  {selectedStudent.std_phoneNumber && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <p className="text-sm text-gray-900">{selectedStudent.std_phoneNumber}</p>
                    </div>
                  )}
                  {selectedStudent.std_dob && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                      <p className="text-sm text-gray-900">{new Date(selectedStudent.std_dob).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setShowViewModal(false)}
                    className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        
        
      </div>
    </div>
  );
};

export default StudentManagementDashboard;