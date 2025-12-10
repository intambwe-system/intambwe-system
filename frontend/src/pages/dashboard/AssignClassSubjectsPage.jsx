import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Users, Search, RefreshCw, ChevronLeft, ChevronRight, Plus, Trash2, AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import classService from '../../services/classService';
import subjectService from '../../services/subjectService';
import employeeService from '../../services/employeeService';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';

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
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-between items-center p-5 border-b border-gray-100">
            <h3 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              {title}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
              ✕
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

const emptyRow = { subjectId: '', teacherId: '', credit: '', totalMax: '' };

export default function AssignClassSubjectsPage() {
  const { employee } = useEmployeeAuth();
  const isAdmin = employee?.emp_role === 'admin';

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedClass, setSelectedClass] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [rows, setRows] = useState([emptyRow]);

  const [viewMoreClass, setViewMoreClass] = useState(null);
  const [viewMoreAssignments, setViewMoreAssignments] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showViewMoreModal, setShowViewMoreModal] = useState(false);
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);

  const showToast = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [classRes, subjRes, teacherRes] = await Promise.all([
        classService.getAllClasses(),
        subjectService.getAllSubjects(),
        employeeService.getAllEmployees({ role: 'teacher', limit: 1000 }),
      ]);

      const classData = classRes.data || classRes;
      setClasses(Array.isArray(classData) ? classData : []);

      const subjData = subjRes.data || subjRes;
      setSubjects(Array.isArray(subjData) ? subjData : []);

      const teacherData = teacherRes.data || teacherRes;
      const teacherList = Array.isArray(teacherData) ? teacherData : teacherData?.data || [];
      setTeachers(teacherList.filter(t => t.emp_role === 'teacher'));
    } catch (err) {
      console.error('Failed to load assign-class-subjects data:', err);
      setError(err.message || 'Failed to load data');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const openViewMoreModalForClass = async (cls) => {
    setViewMoreClass(cls);
    setViewMoreAssignments([]);

    try {
      setOperationLoading(true);
      const res = await classService.getClassAssignments(cls.class_id);
      const data = res.data || res;
      const list = Array.isArray(data) ? data : data?.data || [];
      setViewMoreAssignments(list);
    } catch (err) {
      console.error('Failed to fetch class assignments for view more:', err);
      setViewMoreAssignments([]);
    } finally {
      setOperationLoading(false);
      setShowViewMoreModal(true);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const filteredClasses = useMemo(() => {
    let result = [...classes];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(c => (c.class_name || '').toLowerCase().includes(q));
    }
    return result;
  }, [classes, searchTerm]);

  const totalPages = Math.ceil(filteredClasses.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentClasses = filteredClasses.slice(startIndex, endIndex);

  const openAssignModalForClass = async (cls) => {
    setSelectedClass(cls);
    setRows([emptyRow]);
    setAssignments([]);

    try {
      setOperationLoading(true);
      const res = await classService.getClassAssignments(cls.class_id);
      const data = res.data || res;
      setAssignments(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error('Failed to fetch class assignments:', err);
      setAssignments([]);
    } finally {
      setOperationLoading(false);
      setShowAssignModal(true);
    }
  };

  const handleRowChange = (index, field, value) => {
    setRows(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  };

  const handleAddRow = () => {
    setRows(prev => [...prev, emptyRow]);
  };

  const handleRemoveRow = (index) => {
    setRows(prev => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const assignedSubjectIds = useMemo(
    () => assignments.map(a => a.sbj_id),
    [assignments]
  );

  const handleSaveAssignments = async () => {
    if (!selectedClass) return;

    const payloadAssignments = rows
      .filter(r => r.subjectId && r.credit !== '' && r.totalMax !== '')
      .map(r => ({
        sbj_id: parseInt(r.subjectId, 10),
        teacher_id: r.teacherId ? parseInt(r.teacherId, 10) : null,
        credit: parseInt(r.credit, 10),
        total_max: parseInt(r.totalMax, 10),
      }));

    if (payloadAssignments.length === 0) {
      showToast('warning', 'Please fill at least one valid row before saving.');
      return;
    }

    try {
      setOperationLoading(true);
      await classService.assignSubjectsToClass(selectedClass.class_id, { assignments: payloadAssignments });
      showToast('success', 'Assignments saved successfully');
      await openAssignModalForClass(selectedClass); // reload assignments
    } catch (err) {
      console.error('Failed to save assignments:', err);
      showToast('error', err.message || 'Failed to save assignments');
    } finally {
      setOperationLoading(false);
    }
  };

  const RenderToast = () => {
    if (!operationStatus) return null;
    const { type, message } = operationStatus;
    const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : AlertCircle;
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 py-6 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Access Restricted</h1>
          <p className="text-slate-600 text-sm">Only administrators can assign subjects to classes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            Assign Subjects to Classes
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={fetchInitialData}
              className="p-2 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition"
              disabled={loading}
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4 items-center border border-gray-100">
          <div className="relative flex-grow min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search classes by name..."
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
              <p>Loading classes...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">
              <XCircle className="w-6 h-6 mx-auto mb-2" />
              <p>Error: {error}</p>
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Classes Available</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                There are currently no classes available to assign subjects to. Once classes are created, they will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {['#', 'Class Name', 'Department', 'Trade', 'Class Teacher', 'Actions'].map((header) => (
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
                    {currentClasses.map((cls, index) => (
                      <tr key={cls.class_id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {startIndex + index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {cls.class_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {cls.Department?.dpt_name || cls.dpt_id || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {cls.Trade?.trade_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {cls.classTeacher?.emp_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button
                            onClick={() => openAssignModalForClass(cls)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition"
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Assign
                          </button>
                          <button
                            onClick={() => openViewMoreModalForClass(cls)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View more
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t border-gray-200 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredClasses.length)} of {filteredClasses.length} classes
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

      {/* Assign subjects modal */}
      <Modal
        show={isAdmin && showAssignModal && !!selectedClass}
        title={selectedClass ? `Assign Subjects to ${selectedClass.class_name}` : 'Assign Subjects'}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedClass(null);
          setRows([emptyRow]);
          setAssignments([]);
        }}
      >
        {selectedClass && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Class: <span className="font-semibold">{selectedClass.class_name}</span> | Department: {selectedClass.Department?.dpt_name || selectedClass.dpt_id || 'N/A'} | Trade: {selectedClass.Trade?.trade_name || 'N/A'}
            </p>

            {assignments.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-slate-900 mb-1">Already Assigned Subjects</h4>
                <div className="flex flex-wrap gap-2">
                  {assignments.map(a => (
                    <span key={a.id} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                      {a.Subject?.sbj_name || `Subject #${a.sbj_id}`} (credit: {a.credit}, max: {a.total_max})
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Max</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={index} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-600">{index + 1}</td>
                      <td className="px-3 py-2">
                        <select
                          value={row.subjectId}
                          onChange={(e) => handleRowChange(index, 'subjectId', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select subject</option>
                          {subjects.map(s => {
                            const disabled = assignedSubjectIds.includes(s.sbj_id);
                            return (
                              <option key={s.sbj_id} value={s.sbj_id} disabled={disabled}>
                                {s.sbj_name || s.sbj_code}{disabled ? ' (already assigned)' : ''}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.teacherId}
                          onChange={(e) => handleRowChange(index, 'teacherId', e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select teacher</option>
                          {teachers.map(t => (
                            <option key={t.emp_id} value={t.emp_id}>
                              {t.emp_name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.credit}
                          onChange={(e) => handleRowChange(index, 'credit', e.target.value)}
                          className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g. 3"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          value={row.totalMax}
                          onChange={(e) => handleRowChange(index, 'totalMax', e.target.value)}
                          className="w-24 border border-gray-300 rounded-md px-2 py-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g. 100"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(index)}
                          className="inline-flex items-center px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                          disabled={rows.length === 1}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-3">
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add another row
              </button>
              <button
                type="button"
                onClick={handleSaveAssignments}
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                disabled={operationLoading}
              >
                {operationLoading ? 'Saving...' : 'Save assignments'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* View more assigned subjects modal */}
      <Modal
        show={isAdmin && !!viewMoreClass && showViewMoreModal}
        title={viewMoreClass ? `Assigned Subjects for ${viewMoreClass.class_name}` : 'Assigned Subjects'}
        onClose={() => {
          setShowViewMoreModal(false);
          setViewMoreClass(null);
          setViewMoreAssignments([]);
        }}
      >
        {viewMoreClass && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Class: <span className="font-semibold">{viewMoreClass.class_name}</span> | Department: {viewMoreClass.Department?.dpt_name || viewMoreClass.dpt_id || 'N/A'} | Trade: {viewMoreClass.Trade?.trade_name || 'N/A'}
            </p>

            {viewMoreAssignments.length === 0 ? (
              <div className="py-4 text-center text-sm text-slate-500">
                No subjects have been assigned to this class yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Name</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teacher</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewMoreAssignments.map((a, index) => (
                      <tr key={a.id || index} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-600">{index + 1}</td>
                        <td className="px-3 py-2 text-gray-700">{a.Subject?.sbj_code || '-'}</td>
                        <td className="px-3 py-2 text-gray-900">{a.Subject?.sbj_name || `Subject #${a.sbj_id}`}</td>
                        <td className="px-3 py-2 text-gray-700">
                          {a.assignedTeacher?.emp_name
                            ? `${a.assignedTeacher.emp_name}${a.assignedTeacher.emp_email ? ` (${a.assignedTeacher.emp_email})` : ''}`
                            : 'Not assigned'}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{a.credit}</td>
                        <td className="px-3 py-2 text-gray-700">{a.total_max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      <RenderToast />
    </div>
  );
}
