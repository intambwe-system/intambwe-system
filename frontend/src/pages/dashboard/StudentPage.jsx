// StudentPage.js
import React, { useState, useEffect, useMemo } from 'react';
import {
  User, Plus, Search, Edit, Trash2, ChevronDown, ChevronLeft, ChevronRight,
  RefreshCw, Grid3X3, List, X, AlertTriangle, CheckCircle, XCircle, AlertCircle, Calendar, Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Assuming your studentService file is correctly imported
import studentService from '../../services/studentService';

// Helper component for Modals (to keep the main component clean)
const Modal = ({ show, title, onClose, children }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4"
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
              <User className="w-5 h-5 text-blue-600" />
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

// Define initial state for the student form fields, MAPPED TO BACKEND COLUMNS
const initialFormData = {
    std_fname: '', 
    std_lname: '', 
    std_email: '', 
    std_dob: '', 
    std_gender: '', 
    // dpt_id is kept in state for form continuity but will be filtered before API call
    dpt_id: '', 
    class_id: '', // Foreign Key
};

// Main Component
export default function StudentPage() {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('std_id');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [viewMode, setViewMode] = useState('table');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);

  // UPDATED formData state
  const [formData, setFormData] = useState(initialFormData);
  const [formError, setFormError] = useState('');

  // --- Utility Functions ---

  const showToast = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      // Use UTC to prevent date shifting issues
      const date = new Date(dateString + 'T00:00:00Z');
      return date.toLocaleDateString('en-US', { timeZone: 'UTC' });
    } catch {
      return 'Invalid Date';
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
        ...prev, 
        // Convert empty string to null/undefined for optional integer foreign keys
        [name]: (name === 'class_id' || name === 'dpt_id') && value === '' ? null : value,
    }));
  };
    
  // Helper to construct the full name for display
  const getStudentFullName = (student) => {
      if (student.std_fname && student.std_lname) {
          return `${student.std_fname} ${student.std_lname}`;
      }
      return 'N/A';
  }

  // --- CRUD Operations (CONNECTED TO SERVICE) ---

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      // ✅ ACTUAL API CALL TO FETCH DATA
      const res = await studentService.getAllStudents(); 
      const data = res.data || res; 
      setAllStudents(Array.isArray(data) ? data : []); 
    } catch (err) {
      console.error("Failed to fetch students:", err);
      setError(err.message || 'Failed to load students. Check API connection.');
      setAllStudents([]); 
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // Client-side Validation: std_fname AND std_lname are required
    if (!formData.std_fname.trim() || !formData.std_lname.trim()) {
      setFormError('First name and last name are required');
      return;
    }
    
    // Email format validation
    if (formData.std_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.std_email)) {
        setFormError('Invalid email format.');
        return;
    }

    const studentFullName = getStudentFullName(formData);

    try {
      setOperationLoading(true);
      
      // 🛑 CRITICAL UPDATE: Define ONLY the fields present in the Sequelize Student model
      const officialModelFields = ['std_fname', 'std_lname', 'std_email', 'std_dob', 'std_gender', 'class_id'];
      
      const studentData = Object.entries(formData).reduce((acc, [key, value]) => {
          // 🛑 Filter out 'dpt_id' and any other non-model fields automatically
          if (officialModelFields.includes(key) && value !== '') { 
              if (key === 'class_id' && value !== null) {
                  acc[key] = parseInt(value, 10); // Ensure foreign key is an integer
              } else if (key === 'std_dob' && value === '') {
                  acc[key] = null; // Send null for empty optional date
              } else {
                  acc[key] = value;
              }
          }
          return acc;
      }, {});
      
      // Ensure required fields are always included
      if (!studentData.std_fname) studentData.std_fname = formData.std_fname;
      if (!studentData.std_lname) studentData.std_lname = formData.std_lname;

      let successMessage = '';

      if (showUpdateModal && selectedStudent) {
        // ✅ ACTUAL API CALL FOR UPDATE 
        await studentService.updateStudent(selectedStudent.std_id, studentData);
        successMessage = `${studentFullName} updated successfully!`;
        setShowUpdateModal(false);
      } else {
        // ✅ ACTUAL API CALL FOR CREATE
        await studentService.createStudent(studentData);
        successMessage = `${studentFullName} created successfully!`;
        setShowAddModal(false);
      }

      showToast('success', successMessage);
      setFormData(initialFormData); 
      setSelectedStudent(null);
      await fetchStudents();

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Operation failed';
      setFormError(errorMessage);
      showToast('error', errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDelete = async (student) => {
    try {
      setOperationLoading(true);
      // ✅ ACTUAL API CALL FOR DELETE (using std_id)
      await studentService.deleteStudent(student.std_id); 
      
      showToast('success', `${getStudentFullName(student)} deleted successfully`);
      setDeleteConfirm(null);
      await fetchStudents();

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to delete student';
      showToast('error', errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  // --- Filtering, Sorting, and Pagination Logic ---
  
  const filteredAndSortedStudents = useMemo(() => {
    let result = [...allStudents];

    if (searchTerm.trim()) {
      result = result.filter(student =>
        getStudentFullName(student).toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(student.std_email || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    result.sort((a, b) => {
      
      let aVal, bVal;
      let isNumerical = false;

      const sortKey = sortBy === 'std_name_display' ? ['std_lname', 'std_fname'] : [sortBy];

      if (sortKey.includes('std_id')) {
        aVal = parseInt(a.std_id, 10);
        bVal = parseInt(b.std_id, 10);
        isNumerical = true;
      } else if (sortKey.includes('std_lname')) {
          const lnameComparison = (a.std_lname || '').toLowerCase().localeCompare((b.std_lname || '').toLowerCase());
          if (lnameComparison !== 0) return sortOrder === 'asc' ? lnameComparison : -lnameComparison;
          
          aVal = (a.std_fname || '').toLowerCase();
          bVal = (b.std_fname || '').toLowerCase();
      } else {
        aVal = (a[sortBy] || '').toString().toLowerCase();
        bVal = (b[sortBy] || '').toString().toLowerCase();
      }
      
      if (isNumerical) {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });

    return result;
  }, [allStudents, searchTerm, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = filteredAndSortedStudents.slice(startIndex, endIndex);

  // --- Effects ---

  useEffect(() => {
    fetchStudents();
  }, []); 

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder]);

  // --- Handlers for UI ---

  const handleAdd = () => {
    setFormData(initialFormData); 
    setFormError('');
    setSelectedStudent(null);
    setShowAddModal(true);
  };

  const handleEdit = (student) => {
    setSelectedStudent(student);
    // Mapped incoming student data fields to the new formData structure
    setFormData({ 
      std_fname: student.std_fname || '', 
      std_lname: student.std_lname || '', 
      std_email: student.std_email || '', 
      std_dob: student.std_dob || '',
      std_gender: student.std_gender || '',
      // dpt_id is kept in state but not used in the API call for Student
      dpt_id: student.dpt_id || '', 
      class_id: student.class_id || '', // Foreign Key
    });
    setFormError('');
    setShowUpdateModal(true);
  };

  const toggleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column) => {
    if (sortBy === column) {
      return sortOrder === 'asc' ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1 transform rotate-180" />;
    }
    return null;
  };

  const renderEmptyState = () => (
    <div className="text-center py-12 bg-white rounded-lg border border-gray-100 mt-4">
      <AlertCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
      <h3 className="text-xl font-semibold text-slate-900">No Students Found</h3>
      <p className="text-slate-500 mt-1">
        {searchTerm ? `No students match your search: "${searchTerm}".` : "Start by adding a new student to the system."}
      </p>
      {!searchTerm && (
        <button
          onClick={handleAdd}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Student
        </button>
      )}
    </div>
  );

  // --- Render Components ---

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

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {/* Headers matching the backend model fields */}
            {['ID', 'Name', 'Email', 'DOB', 'Gender', 'Class ID', 'Actions'].map((header, index) => (
              <th
                key={header}
                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${index < 6 ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                onClick={() => index < 6 && toggleSort(
                    header === 'ID' ? 'std_id' : 
                    header === 'Name' ? 'std_name_display' : // Custom sort key for full name
                    header === 'Email' ? 'std_email' : 
                    header === 'DOB' ? 'std_dob' : 
                    header === 'Gender' ? 'std_gender' : 
                    header === 'Class ID' ? 'class_id' : 
                    header.toLowerCase()
                )}
              >
                <div className="flex items-center">
                  {header}
                  {getSortIcon(
                    header === 'ID' ? 'std_id' : 
                    header === 'Name' ? 'std_name_display' : 
                    header === 'Email' ? 'std_email' : 
                    header === 'DOB' ? 'std_dob' : 
                    header === 'Gender' ? 'std_gender' : 
                    header === 'Class ID' ? 'class_id' : 
                    header.toLowerCase()
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {currentStudents.map((student) => (
            <motion.tr
              key={student.std_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="hover:bg-blue-50/50 transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {String(student.std_id).padStart(4, '0')}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{getStudentFullName(student)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.std_email || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(student.std_dob)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{student.std_gender || 'N/A'}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                  {student.class_id || 'N/A'} 
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex space-x-2">
                  <button onClick={() => handleEdit(student)} className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteConfirm(student)} className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderGrid = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
      <AnimatePresence>
        {currentStudents.map((student) => (
          <motion.div 
            key={student.std_id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                  {student.std_fname?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{getStudentFullName(student)}</h4>
                  <p className="text-xs text-slate-500">ID: S-{String(student.std_id).padStart(4, '0')}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button onClick={() => handleEdit(student)} className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-100 transition">
                  <Edit className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteConfirm(student)} className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-100 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              <div className="flex items-center text-sm text-slate-600">
                <User className="w-4 h-4 mr-2 text-indigo-500" />
                <span className="font-medium mr-1">Class ID:</span> {student.class_id || 'N/A'} 
              </div>
              <div className="flex items-center text-sm text-slate-600">
                <Calendar className="w-4 h-4 mr-2 text-slate-500" />
                <span className="font-medium mr-1">DOB:</span> {formatDate(student.std_dob)}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );


  const renderForm = (isUpdate) => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {formError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded">
          <p className="text-sm font-medium">{formError}</p>
        </div>
      )}
      <div className='grid grid-cols-2 gap-4'>
          {/* First Name (Required) */}
          <div>
            <label htmlFor="std_fname" className="block text-sm font-medium text-gray-700">First Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="std_fname"
              id="std_fname"
              value={formData.std_fname}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {/* Last Name (Required) */}
          <div>
            <label htmlFor="std_lname" className="block text-sm font-medium text-gray-700">Last Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="std_lname"
              id="std_lname"
              value={formData.std_lname}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>
      
      {/* Email Field (Optional) */}
      <div>
        <label htmlFor="std_email" className="block text-sm font-medium text-gray-700">Email (Optional)</label>
        <input
          type="email"
          name="std_email"
          id="std_email"
          value={formData.std_email}
          onChange={handleInputChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      {/* Optional fields matching Student model */}
      <div className='grid grid-cols-2 gap-4'>
          {/* Gender (Optional) */}
          <div>
            <label htmlFor="std_gender" className="block text-sm font-medium text-gray-700">Gender (Optional)</label>
            <select
              name="std_gender"
              id="std_gender"
              value={formData.std_gender || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {/* Date of Birth (Optional) */}
          <div>
            <label htmlFor="std_dob" className="block text-sm font-medium text-gray-700">Date of Birth (Optional)</label>
            <input
              type="date"
              name="std_dob"
              id="std_dob"
              value={formData.std_dob || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
      </div>
      
      {/* Foreign Key fields */}
      <div className='grid grid-cols-2 gap-4'>
          {/* Class ID (Model Field) */}
          <div>
            <label htmlFor="class_id" className="block text-sm font-medium text-gray-700">Class ID (Optional)</label>
            <input
              type="number"
              name="class_id"
              id="class_id"
              value={formData.class_id || ''} 
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1"
            />
          </div>
          {/* Department ID (FE Only - Will be filtered out of API payload) */}
          <div>
            <label htmlFor="dpt_id" className="block text-sm font-medium text-gray-700">Department ID (Optional - FE Only)</label>
            <input
              type="number"
              name="dpt_id"
              id="dpt_id"
              value={formData.dpt_id || ''} 
              onChange={handleInputChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 1"
            />
          </div>
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <button
          type="button"
          onClick={() => { setShowAddModal(false); setShowUpdateModal(false); setFormData(initialFormData); setFormError(''); }}
          className="px-4 py-2 text-sm font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
          disabled={operationLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={operationLoading}
        >
          {operationLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              {isUpdate ? 'Updating...' : 'Adding...'}
            </>
          ) : (
            isUpdate ? 'Save Changes' : 'Add Student'
          )}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <Home className="w-7 h-7 text-blue-600" />
              Student Management
            </h1>
            <div className="flex space-x-3">
              <button
                onClick={fetchStudents}
                className="p-2 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition"
                disabled={loading || operationLoading}
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={handleAdd}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Student
              </button>
            </div>
        </header>
        
        {/* Controls Bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex justify-between items-center border border-gray-100">
            <div className="relative flex-grow mr-4">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition ${viewMode === 'table' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
            </div>
        </div>


        {/* Content Area */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-blue-600">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading students...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">
              <XCircle className="w-6 h-6 mx-auto mb-2" />
              <p>Error: {error}</p>
            </div>
          ) : currentStudents.length === 0 && !searchTerm ? (
            renderEmptyState()
          ) : currentStudents.length === 0 && searchTerm ? (
            renderEmptyState()
          ) : (
            <>
              {viewMode === 'table' ? (
                renderTable()
              ) : (
                <div className="p-4">{renderGrid()}</div>
              )}

              {/* Pagination */}
              <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedStudents.length)} of {filteredAndSortedStudents.length} results
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-300 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md">
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

      {/* Modals and Toasts */}

      {/* Add/Create Modal */}
      <Modal 
        show={showAddModal} 
        title="Add New Student" 
        onClose={() => { setShowAddModal(false); setFormData(initialFormData); setFormError(''); }}
      >
        {renderForm(false)}
      </Modal>

      {/* Update/Edit Modal */}
      <Modal 
        show={showUpdateModal} 
        title={`Edit Student: ${getStudentFullName(selectedStudent || {})}`} 
        onClose={() => { setShowUpdateModal(false); setFormData(initialFormData); setFormError(''); setSelectedStudent(null); }}
      >
        {renderForm(true)}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={!!deleteConfirm} 
        title="Confirm Deletion" 
        onClose={() => setDeleteConfirm(null)}
      >
        <div className="text-center">
          <Trash2 className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-slate-900 mb-2">
            Are you sure you want to delete {getStudentFullName(deleteConfirm || {})}'s record?
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
              onClick={() => handleDelete(deleteConfirm)}
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