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
  const [loading, setLoading] = useState(false);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClasses();
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

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await subjectService.getAllSubjects();
        setSubjects(response.data || []);
      } catch (error) {
        console.error('Error fetching subjects:', error);
        setMessage({ type: 'error', text: 'Failed to load subjects' });
      }
    };
    fetchSubjects();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedClass) {
        setStudents([]);
        setMarksData({});
        return;
      }

      setLoading(true);
      try {
        const response = await studentService.getStudentsByClass(selectedClass);
        const studentsData = response.data || [];
        setStudents(studentsData);
        
        const initialMarks = {};
        studentsData.forEach(student => {
          initialMarks[student.std_id] = {
            cat_1: '',
            cat_2: '',
            cat_3: '',
            exam: ''
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

  // Updated useEffect to refetch marks when semester or academicYear changes
  useEffect(() => {
    const fetchExistingMarks = async () => {
      if (!selectedClass || !selectedSubject || students.length === 0) return;

      setLoadingMarks(true);
      try {
        const response = await marksService.getMarks({
          class_id: selectedClass,
          sbj_id: selectedSubject,
          ac_year: academicYear,
          semester: semester,
          limit: 1000
        });

        const marks = response.data || [];

        console.warn(response);
        
        // Reset marks data with empty values first
        setMarksData(prev => {
          const updated = {};
          
          // Initialize all students with empty marks
          students.forEach(student => {
            updated[student.std_id] = {
              cat_1: '',
              cat_2: '',
              cat_3: '',
              exam: ''
            };
          });
          
          // Then populate with existing marks if any
          marks.forEach(mark => {
            if (updated[mark.std_id]) {
              updated[mark.std_id] = {
                cat_1: mark.cat_1 !== null && mark.cat_1 !== undefined ? mark.cat_1 : '',
                cat_2: mark.cat_2 !== null && mark.cat_2 !== undefined ? mark.cat_2 : '',
                cat_3: mark.cat_3 !== null && mark.cat_3 !== undefined ? mark.cat_3 : '',
                exam: mark.exam !== null && mark.exam !== undefined ? mark.exam : ''
              };
            }
          });
          
          return updated;
        });
      } catch (error) {
        console.error('Error fetching existing marks:', error);
        setMessage({ type: 'error', text: 'Failed to load existing marks' });
      } finally {
        setLoadingMarks(false);
      }
    };

    fetchExistingMarks();
  }, [selectedClass, selectedSubject, academicYear, semester, students]);

  const handleMarksChange = (studentId, field, value) => {
    // Allow empty string
    if (value === '') {
      setMarksData(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [field]: value
        }
      }));
      return;
    }

    // Validate that it's a number
    const numValue = parseFloat(value);
    if (isNaN(numValue)) {
      return;
    }

    // Validate range: 0 to 100
    if (numValue < 0 || numValue > 100) {
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
    if (!marks) return '0.00';

    const cat1 = parseFloat(marks.cat_1) || 0;
    const cat2 = parseFloat(marks.cat_2) || 0;
    const cat3 = parseFloat(marks.cat_3) || 0;
    const exam = parseFloat(marks.exam) || 0;

    const total = cat1 + cat2 + cat3 + exam;
    
    // Calculate percentage out of 100
    const percentage = (total / 400) * 100;

    return percentage.toFixed(2);
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
          semester: semester
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
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Marks Entry System</h1>
          <p className="text-gray-600">Enter and manage student marks by class and subject</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading students...</p>
          </div>
        )}

        {loadingMarks && selectedClass && selectedSubject && (
          <div className="bg-blue-50 rounded-lg p-4 mb-6 flex items-center gap-2">
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-blue-800">Loading existing marks...</span>
          </div>
        )}

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
                  <p className="text-xs text-gray-500 mt-1">
                    Each assessment is out of 100 marks. Total is calculated as percentage out of 100.
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
                      CAT 1<br /><span className="text-[10px] font-normal text-gray-500">(out of 100)</span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      CAT 2<br /><span className="text-[10px] font-normal text-gray-500">(out of 100)</span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      CAT 3<br /><span className="text-[10px] font-normal text-gray-500">(out of 100)</span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Exam<br /><span className="text-[10px] font-normal text-gray-500">(out of 100)</span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Total %<br /><span className="text-[10px] font-normal text-gray-500">(out of 100)</span>
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
                          {calculateTotal(student.std_id)}%
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && selectedClass && selectedSubject && students.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
            <p className="text-gray-600">
              There are no students enrolled in this class.
            </p>
          </div>
        )}

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