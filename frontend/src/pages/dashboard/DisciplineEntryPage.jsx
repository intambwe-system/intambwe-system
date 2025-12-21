import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, Search, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import classService from '../../services/classService';
import studentService from '../../services/studentService';
import disciplineMarksService from '../../services/disciplineMarksService';

const DisciplineEntryPage = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [disciplineData, setDisciplineData] = useState({}); // { std_id: { score: 100 } }
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Search params
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedClass, setSelectedClass] = useState(searchParams.get('class') || '');
  const [academicYear, setAcademicYear] = useState(searchParams.get('year') || '2025/26');
  const [semester, setSemester] = useState(searchParams.get('semester') || 'Semester 1');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Sync URL params
  useEffect(() => {
    const params = {};
    if (selectedClass) params.class = selectedClass;
    if (academicYear) params.year = academicYear;
    if (semester) params.semester = semester;
    if (searchTerm) params.search = searchTerm;
    setSearchParams(params, { replace: true });
  }, [selectedClass, academicYear, semester, searchTerm, setSearchParams]);

  // Load classes
  useEffect(() => {
    const loadClasses = async () => {
      try {
        setLoading(true);
        const res = await classService.getAllClasses();
        setClasses(res.data || res);
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to load classes' });
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, []);

  // Load students + existing discipline marks when class/year/semester changes
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      if (!selectedClass) {
        setStudents([]);
        setDisciplineData({});
        return;
      }

      try {
        setLoading(true);

        // Load students in class
        const stuRes = await studentService.getStudentsByClass(selectedClass);
        const loadedStudents = stuRes.data || stuRes;
        if (cancelled) return;
        setStudents(loadedStudents);

        // Load existing discipline marks
        const marksRes = await disciplineMarksService.getAllDisciplineMarks({
          class_id: selectedClass,
          ac_year: academicYear,
          semester
        });
        const existingMarks = marksRes.data || marksRes || [];

        // Build map: std_id -> discipline_score
        const marksMap = {};
        existingMarks.forEach(record => {
          marksMap[record.std_id] = {
            score: record.discipline_score ?? 100,
            dis_id: record.dis_id // for updates
          };
        });

        // Initialize discipline data
        const initialData = {};
        loadedStudents.forEach(student => {
          initialData[student.std_id] = {
            score: marksMap[student.std_id]?.score ?? 100,
            dis_id: marksMap[student.std_id]?.dis_id || null
          };
        });

        if (!cancelled) {
          setDisciplineData(initialData);
        }
      } catch (err) {
        if (!cancelled) {
          setMessage({ type: 'error', text: 'Failed to load students or discipline records' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, [selectedClass, academicYear, semester]);

  const handleScoreChange = (studentId, value) => {
    if (value === '') {
      setDisciplineData(prev => ({
        ...prev,
        [studentId]: { ...prev[studentId], score: '' }
      }));
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    if (numValue < 0 || numValue > 100) {
      setMessage({ type: 'error', text: 'Discipline score must be between 0 and 100' });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }

    setDisciplineData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], score: numValue }
    }));
  };

  const handleSaveDiscipline = async () => {
    if (!selectedClass) {
      setMessage({ type: 'error', text: 'Please select a class' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const savePromises = students.map(student => {
        const data = disciplineData[student.std_id];
        if (!data || data.score === '' || data.score === undefined) return Promise.resolve();

        const payload = {
          std_id: student.std_id,
          class_id: parseInt(selectedClass),
          ac_year: academicYear,
          semester: semester,
          discipline_score: parseFloat(data.score),
          discipline_maxScore: 100
        };

        // If existing record (has dis_id), update; else create
        if (data.dis_id) {
          return disciplineMarksService.updateDisciplineMarks(data.dis_id, payload);
        } else {
          return disciplineMarksService.createDisciplineMarks(payload);
        }
      });

      await Promise.all(savePromises.filter(p => p)); // filter out skipped
      setMessage({ type: 'success', text: 'Discipline marks saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Save error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save discipline marks' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.std_fname} ${student.std_mname || ''} ${student.std_lname}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) ||
           student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discipline Marks Entry</h1>
          <p className="text-gray-600">Record student conduct and discipline scores (out of 100)</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="2025/26"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
                <option value="Semester 3">Semester 3</option>
              </select>
            </div>
          </div>

          {selectedClass && students.length > 0 && (
            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or admission number..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Save Button */}
        {selectedClass && students.length > 0 && (
          <div className="mb-6 text-right">
            <button
              onClick={handleSaveDiscipline}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 transition-colors"
            >
              {saving ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save All Discipline Marks
                </>
              )}
            </button>
          </div>
        )}

        {/* Messages */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Table */}
        {!loading && selectedClass && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Discipline Scores</h2>
              <p className="text-sm text-gray-600 mt-1">
                {filteredStudents.length} student(s) • {academicYear} • {semester}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase sticky left-0 bg-gray-50 z-10">
                      Adm. No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase sticky left-24 bg-gray-50 z-10">
                      Student Name
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase bg-orange-50">
                      Discipline Score<br />
                      <span className="text-xs font-normal text-gray-500">(/100)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student, index) => (
                    <tr key={student.std_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-inherit z-10">
                        {student.admission_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap sticky left-24 bg-inherit z-10">
                        <div className="text-sm font-medium text-gray-900">
                          {student.std_fname} {student.std_mname} {student.std_lname}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-orange-50">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={disciplineData[student.std_id]?.score ?? 100}
                          onChange={(e) => handleScoreChange(student.std_id, e.target.value)}
                          className="w-24 px-3 py-2 text-center border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 font-medium"
                          placeholder="100"
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
        {!loading && !selectedClass && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Class</h3>
            <p className="text-gray-600">Choose a class to manage discipline marks</p>
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
};

export default DisciplineEntryPage;