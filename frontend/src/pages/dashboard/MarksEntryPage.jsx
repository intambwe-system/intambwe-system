import React, { useState, useEffect } from 'react';
import { Save, Search, AlertCircle, CheckCircle, Loader } from 'lucide-react';

import studentService from '../../services/studentService';
import subjectService from '../../services/subjectService';
import marksService from '../../services/marksService';
import classService from '../../services/classService';


const MarksEntryPage = () => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [academicYear, setAcademicYear] = useState('2024/2025');
  const [semester, setSemester] = useState('Semester 1');
  const [marksData, setMarksData] = useState({});
  const [existingMarks, setExistingMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Mock classes data - replace with actual API call
  useEffect(() => {
    fetchClasses()
  }, []);

  const fetchClasses = async () => {
      setLoading(true);
   
   
      
      try {
        const response = await classService.getAllClasses();
        const classData = response.data || response;
        setClasses(classData);
      } catch (err) {
        console.log(err.message || 'Failed to load classes');
        setClasses([]);
      } finally {
        setLoading(false);
      }
    };

  // Fetch subjects when component mounts or class changes
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const params = selectedClass ? { class_id: selectedClass } : {};
        const response = await subjectService.getAllSubjects();
        setSubjects(response.data || []);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setMessage({ type: 'error', text: 'Failed to load subjects' });
      }
    };
    fetchSubjects();
  }, [selectedClass]);

  // Fetch students when class is selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([]);
        return;
      }

      setLoading(true);
      try {
        const response = await studentService.getStudentsByClass(selectedClass);
        const studentsData = response.data || [];
        setStudents(studentsData);
        
        // Initialize marks data structure
        const initialMarks = {};
        studentsData.forEach(student => {
          initialMarks[student.std_id] = {
            cat_1: '',
            cat_2: '',
            cat_3: '',
            exam: '',
            remark: ''
          };
        });
        setMarksData(initialMarks);
      } catch (error) {
        console.error('Error fetching students:', error);
        setMessage({ type: 'error', text: 'Failed to load students' });
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [selectedClass]);

  // Fetch existing marks when subject is selected
  useEffect(() => {
    const fetchExistingMarks = async () => {
      if (!selectedClass || !selectedSubject || students.length === 0) return;

      try {
        const response = await marksService.getMarks({
          class_id: selectedClass,
          sbj_id: selectedSubject,
          ac_year: academicYear,
          semester: semester
        });

        const marks = response.data || [];
        const marksMap = {};
        marks.forEach(mark => {
          marksMap[mark.std_id] = {
            cat_1: mark.cat_1 || '',
            cat_2: mark.cat_2 || '',
            cat_3: mark.cat_3 || '',
            exam: mark.exam || '',
            remark: mark.remark || ''
          };
        });

        setExistingMarks(marksMap);
        
        // Update marksData with existing values
        setMarksData(prev => {
          const updated = { ...prev };
          Object.keys(marksMap).forEach(stdId => {
            if (updated[stdId]) {
              updated[stdId] = { ...marksMap[stdId] };
            }
          });
          return updated;
        });
      } catch (error) {
        console.error('Error fetching existing marks:', error);
      }
    };

    fetchExistingMarks();
  }, [selectedClass, selectedSubject, academicYear, semester, students]);

  const handleMarksChange = (studentId, field, value) => {
    // Validate numeric input
    if (value !== '' && (isNaN(value) || parseFloat(value) < 0)) {
      return;
    }

    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const calculateTotal = (studentId) => {
    const marks = marksData[studentId];
    if (!marks) return 0;

    const cat1 = parseFloat(marks.cat_1) || 0;
    const cat2 = parseFloat(marks.cat_2) || 0;
    const cat3 = parseFloat(marks.cat_3) || 0;
    const exam = parseFloat(marks.exam) || 0;

    return (cat1 + cat2 + cat3 + exam).toFixed(2);
  };

  const handleSaveMarks = async () => {
    if (!selectedClass || !selectedSubject) {
      setMessage({ type: 'error', text: 'Please select class and subject' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const promises = students.map(student => {
        const marks = marksData[student.std_id];
        
        // Only save if at least one mark is entered
        if (!marks.cat_1 && !marks.cat_2 && !marks.cat_3 && !marks.exam) {
          return null;
        }

        const payload = {
          std_id: student.std_id,
          sbj_id: parseInt(selectedSubject),
          class_id: parseInt(selectedClass),
          cat_1: marks.cat_1 ? parseFloat(marks.cat_1) : null,
          cat_2: marks.cat_2 ? parseFloat(marks.cat_2) : null,
          cat_3: marks.cat_3 ? parseFloat(marks.cat_3) : null,
          exam: marks.exam ? parseFloat(marks.exam) : null,
          ac_year: academicYear,
          semester: semester,
          remark: marks.remark || null
        };

        return marksService.createOrUpdateMarks(payload);
      });

      await Promise.all(promises.filter(p => p !== null));
      
      setMessage({ type: 'success', text: 'Marks saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving marks:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save marks' });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.std_fname} ${student.std_mname || ''} ${student.std_lname}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || 
           student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedSubjectName = subjects.find(s => s.sbj_id === parseInt(selectedSubject))?.sbj_name || '';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Marks Entry System</h1>
          <p className="text-gray-600">Enter and manage student marks by class and subject</p>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Class Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSubject('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                disabled={!selectedClass}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.sbj_id} value={subject.sbj_id}>
                    {subject.sbj_name} ({subject.sbj_code})
                  </option>
                ))}
              </select>
            </div>

            {/* Academic Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="2024/2025"
              />
            </div>

            {/* Semester */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
              </select>
            </div>
          </div>

          {/* Search Bar */}
          {selectedClass && students.length > 0 && (
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by student name or admission number..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}
        </div>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading students...</p>
          </div>
        )}

        {/* Marks Entry Table */}
        {!loading && selectedClass && selectedSubject && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedSubjectName}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {filteredStudents.length} student(s) • {academicYear} • {semester}
                  </p>
                </div>
                <button
                  onClick={handleSaveMarks}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save All Marks
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Admission No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      CAT 1
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      CAT 2
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      CAT 3
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Exam
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Remark
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student, index) => (
                    <tr key={student.std_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.admission_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {student.std_fname} {student.std_mname || ''} {student.std_lname}
                        </div>
                        <div className="text-sm text-gray-500">{student.std_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={marksData[student.std_id]?.cat_1 || ''}
                          onChange={(e) => handleMarksChange(student.std_id, 'cat_1', e.target.value)}
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={marksData[student.std_id]?.cat_2 || ''}
                          onChange={(e) => handleMarksChange(student.std_id, 'cat_2', e.target.value)}
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={marksData[student.std_id]?.cat_3 || ''}
                          onChange={(e) => handleMarksChange(student.std_id, 'cat_3', e.target.value)}
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={marksData[student.std_id]?.exam || ''}
                          onChange={(e) => handleMarksChange(student.std_id, 'exam', e.target.value)}
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-center font-semibold text-gray-900">
                          {calculateTotal(student.std_id)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={marksData[student.std_id]?.remark || ''}
                          onChange={(e) => handleMarksChange(student.std_id, 'remark', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && selectedClass && selectedSubject && students.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
            <p className="text-gray-600">
              There are no students enrolled in this class.
            </p>
          </div>
        )}

        {/* Initial State */}
        {!loading && (!selectedClass || !selectedSubject) && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Get Started</h3>
            <p className="text-gray-600">
              Select a class and subject to start entering marks
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarksEntryPage;