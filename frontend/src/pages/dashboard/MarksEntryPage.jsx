import React, { useState, useEffect } from 'react';
import { Save, Search, AlertCircle, CheckCircle, Loader, Plus, X } from 'lucide-react';
import classService from '../../services/classService'; // adjust path if needed
import subjectService from '../../services/subjectService';
import studentService from '../../services/studentService';
import marksService from '../../services/marksService';

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
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // Assessment configurations
  const [faColumns, setFaColumns] = useState([]);
  const [iaColumns, setIaColumns] = useState([]);
  const [showFaModal, setShowFaModal] = useState(false);
  const [showIaModal, setShowIaModal] = useState(false);
  const [newAssessment, setNewAssessment] = useState({ label: '', maxScore: '' });

  // Load classes and subjects
  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoading(true);
        const [clsRes, subjRes] = await Promise.all([
          classService.getAllClasses(),
          subjectService.getAllSubjects()
        ]);
        setClasses(clsRes.data || clsRes);
        setSubjects(subjRes.data || subjRes);
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to load classes/subjects' });
      } finally {
        setLoading(false);
      }
    };
    loadInitial();
  }, []);

  // Load students + existing marks when class/subject changes
useEffect(() => {
  let cancelled = false;

  const loadData = async () => {
    if (!selectedClass || !selectedSubject) {
      setStudents([]);
      setMarksData({});
      setFaColumns([]);
      setIaColumns([]);
      return;
    }

    try {
      setLoading(true);

      // 1️⃣ Load students
      const stuRes = await studentService.getStudentsByClass(selectedClass);
      const loadedStudents = stuRes.data || stuRes;
      if (cancelled) return;

      setStudents(loadedStudents);

      // 2️⃣ Load marks
      const marksRes = await marksService.getMarks({
        class_id: selectedClass,
        sbj_id: selectedSubject,
        ac_year: academicYear,
        semester
      });

      const existingMarks = marksRes.data || [];

      // 3️⃣ Collect UNIQUE FA / IA columns
      const faMap = new Map();
      const iaMap = new Map();

      existingMarks.forEach(record => {
        (record.FA || []).forEach(item => {
          const key = `${item.label}|${item.maxScore}`;
          if (!faMap.has(key)) {
            faMap.set(key, {
              id: crypto.randomUUID(),
              label: item.label,
              maxScore: item.maxScore
            });
          }
        });

        (record.IA || []).forEach(item => {
          const key = `${item.label}|${item.maxScore}`;
          if (!iaMap.has(key)) {
            iaMap.set(key, {
              id: crypto.randomUUID(),
              label: item.label,
              maxScore: item.maxScore
            });
          }
        });
      });

      const faColumnsArr = Array.from(faMap.values());
      const iaColumnsArr = Array.from(iaMap.values());

      // 4️⃣ Normalize student marks to match columns
      const initialMarks = {};

      loadedStudents.forEach(student => {
        const record = existingMarks.find(
          m => m.std_id === student.std_id
        ) || {};

        const faByKey = new Map(
          (record.FA || []).map(i => [
            `${i.label}|${i.maxScore}`,
            i
          ])
        );

        const iaByKey = new Map(
          (record.IA || []).map(i => [
            `${i.label}|${i.maxScore}`,
            i
          ])
        );

        initialMarks[student.std_id] = {
          FA: faColumnsArr.map(col => ({
            label: col.label,
            maxScore: col.maxScore,
            score: faByKey.get(`${col.label}|${col.maxScore}`)?.score ?? ''
          })),
          IA: iaColumnsArr.map(col => ({
            label: col.label,
            maxScore: col.maxScore,
            score: iaByKey.get(`${col.label}|${col.maxScore}`)?.score ?? ''
          })),
          CA_score: record.CA_score ?? '',
          CA_maxScore: record.CA_maxScore ?? 100
        };
      });

      if (cancelled) return;

      // 5️⃣ Commit state ONCE
      setFaColumns(faColumnsArr);
      setIaColumns(iaColumnsArr);
      setMarksData(initialMarks);

    } catch (err) {
      if (!cancelled) {
        setMessage({ type: 'error', text: 'Failed to load students or marks' });
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  loadData();

  return () => {
    cancelled = true; // ✅ prevents double-commit in StrictMode
  };
}, [selectedClass, selectedSubject, academicYear, semester]);


  const handleAddFaColumn = () => {
  if (!newAssessment.label || !newAssessment.maxScore) {
    setMessage({ type: 'error', text: 'Please fill in all fields' });
    return;
  }

  const maxScore = parseFloat(newAssessment.maxScore);
  if (isNaN(maxScore) || maxScore <= 0) {
    setMessage({ type: 'error', text: 'Max score must be a positive number' });
    return;
  }

  const newColumn = {
    id: crypto.randomUUID(),
    label: newAssessment.label,
    maxScore
  };

  // ✅ functional update
  setFaColumns(prev => [...prev, newColumn]);

  // ✅ IMMUTABLE marks update (NO push)
  setMarksData(prev => {
    const updated = {};

    Object.entries(prev).forEach(([id, data]) => {
      updated[id] = {
        ...data,
        FA: [
          ...data.FA,
          { score: 0, maxScore, label: newAssessment.label }
        ]
      };
    });

    return updated;
  });

  setNewAssessment({ label: '', maxScore: '' });
  setShowFaModal(false);
};

const handleAddIaColumn = () => {
  if (!newAssessment.label || !newAssessment.maxScore) {
    setMessage({ type: 'error', text: 'Please fill in all fields' });
    return;
  }

  const maxScore = parseFloat(newAssessment.maxScore);
  if (isNaN(maxScore) || maxScore <= 0) {
    setMessage({ type: 'error', text: 'Max score must be a positive number' });
    return;
  }

  const newColumn = {
    id: crypto.randomUUID(),
    label: newAssessment.label,
    maxScore
  };

  setIaColumns(prev => [...prev, newColumn]);

  setMarksData(prev => {
    const updated = {};

    Object.entries(prev).forEach(([id, data]) => {
      updated[id] = {
        ...data,
        IA: [
          ...data.IA,
          { score: 0, maxScore, label: newAssessment.label }
        ]
      };
    });

    return updated;
  });

  setNewAssessment({ label: '', maxScore: '' });
  setShowIaModal(false);
};
const handleRemoveFaColumn = (index) => {
  const removedLabel = faColumns[index]?.label;

  // ✅ remove column immutably
  setFaColumns(prev => prev.filter((_, i) => i !== index));

  // ✅ rebuild marks immutably
  setMarksData(prev => {
    const updated = {};

    Object.entries(prev).forEach(([studentId, data]) => {
      updated[studentId] = {
        ...data,
        FA: data.FA.filter((_, i) => i !== index)
      };
    });

    return updated;
  });

  setMessage({
    type: 'success',
    text: `FA assessment "${removedLabel}" removed`
  });

  setTimeout(() => setMessage({ type: '', text: '' }), 3000);
};

const handleRemoveIaColumn = (index) => {
  const removedLabel = iaColumns[index]?.label;

  setIaColumns(prev => prev.filter((_, i) => i !== index));

  setMarksData(prev => {
    const updated = {};

    Object.entries(prev).forEach(([studentId, data]) => {
      updated[studentId] = {
        ...data,
        IA: data.IA.filter((_, i) => i !== index)
      };
    });

    return updated;
  });

  setMessage({
    type: 'success',
    text: `IA assessment "${removedLabel}" removed`
  });

  setTimeout(() => setMessage({ type: '', text: '' }), 3000);
};

  const handleFaScoreChange = (studentId, index, value) => {
    if (value === '') {
      setMarksData(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          FA: prev[studentId].FA.map((item, i) =>
            i === index ? { ...item, score: value } : item
          )
        }
      }));
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    const maxScore = marksData[studentId].FA[index].maxScore;
    if (numValue < 0 || numValue > maxScore) {
      setMessage({ type: 'error', text: `Score must be between 0 and ${maxScore}` });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        FA: prev[studentId].FA.map((item, i) =>
          i === index ? { ...item, score: value } : item
        )
      }
    }));
  };

  const handleIaScoreChange = (studentId, index, value) => {
    if (value === '') {
      setMarksData(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          IA: prev[studentId].IA.map((item, i) =>
            i === index ? { ...item, score: value } : item
          )
        }
      }));
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    const maxScore = marksData[studentId].IA[index].maxScore;
    if (numValue < 0 || numValue > maxScore) {
      setMessage({ type: 'error', text: `Score must be between 0 and ${maxScore}` });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        IA: prev[studentId].IA.map((item, i) =>
          i === index ? { ...item, score: value } : item
        )
      }
    }));
  };

  const handleCaScoreChange = (studentId, value) => {
    if (value === '') {
      setMarksData(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          CA_score: value
        }
      }));
      return;
    }
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    const maxScore = marksData[studentId].CA_maxScore;
    if (numValue < 0 || numValue > maxScore) {
      setMessage({ type: 'error', text: `CA score must be between 0 and ${maxScore}` });
      setTimeout(() => setMessage({ type: '', text: '' }), 2000);
      return;
    }
    setMarksData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        CA_score: value
      }
    }));
  };

const calculateTotal = (studentId) => {
  const marks = marksData[studentId];
  if (!marks) return '0.00';

  // ---------- FA ----------
  const faPercentages = marks.FA
    .filter(fa => fa.score !== '' && fa.maxScore > 0)
    .map(fa => (parseFloat(fa.score) / fa.maxScore) * 100);

  const faAvg =
    faPercentages.length > 0
      ? faPercentages.reduce((a, b) => a + b, 0) / faPercentages.length
      : 0;

  // ---------- IA ----------
  const iaPercentages = marks.IA
    .filter(ia => ia.score !== '' && ia.maxScore > 0)
    .map(ia => (parseFloat(ia.score) / ia.maxScore) * 100);

  const iaAvg =
    iaPercentages.length > 0
      ? iaPercentages.reduce((a, b) => a + b, 0) / iaPercentages.length
      : 0;

  // ---------- CA ----------
  const caPct =
    marks.CA_score !== '' && marks.CA_maxScore > 0
      ? (parseFloat(marks.CA_score) / marks.CA_maxScore) * 100
      : 0;

  // ---------- FINAL WEIGHTED TOTAL ----------
  const finalTotal =
    (faAvg * 0.30) +
    (iaAvg * 0.40) +
    (caPct * 0.30);

  return finalTotal.toFixed(2);
};

  const handleSaveMarks = async () => {
    if (!selectedClass || !selectedSubject) {
      setMessage({ type: 'error', text: 'Please select class and subject' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      return;
    }
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const savePromises = students.map(student => {
        const marks = marksData[student.std_id];
        const payload = {
          std_id: student.std_id,
          sbj_id: parseInt(selectedSubject),
          class_id: parseInt(selectedClass),
          ac_year: academicYear,
          semester: semester,
          FA: marks.FA.map(fa => ({
            score: fa.score ? parseFloat(fa.score) : null,
            maxScore: fa.maxScore,
            label: fa.label
          })),
          IA: marks.IA.map(ia => ({
            score: ia.score ? parseFloat(ia.score) : null,
            maxScore: ia.maxScore,
            label: ia.label
          })),
          CA_score: marks.CA_score ? parseFloat(marks.CA_score) : null,
          CA_maxScore: marks.CA_maxScore
        };
        return marksService.createOrUpdateMarks(payload);
      });

      await Promise.all(savePromises);

      setMessage({ type: 'success', text: 'Marks saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving marks:', error);
      setMessage({ type: 'error', text: 'Failed to save marks' });
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

  const selectedSubjectName = subjects.find(s => s.sbj_id === parseInt(selectedSubject))?.sbj_name || '';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Marks Entry System</h1>
          <p className="text-gray-600">Enter and manage student marks with flexible assessment types</p>
        </div>
        {/* Filters */}
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
                  setFaColumns([]);
                  setIaColumns([]);
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
        {/* Assessment Controls */}
        {selectedClass && selectedSubject && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Configuration</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowFaModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add FA Assessment
              </button>
              <button
                onClick={() => setShowIaModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add IA Assessment
              </button>
              <div className="ml-auto">
                <button
                  onClick={handleSaveMarks}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
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
            
            {/* Active Assessments */}
            {(faColumns.length > 0 || iaColumns.length > 0) && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">Active Assessments:</p>
                <div className="flex flex-wrap gap-2">
                  {faColumns.map((col, idx) => (
                    <div key={col.id} className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                      <span>FA: {col.label} (/{col.maxScore})</span>
                      <button
                        onClick={() => handleRemoveFaColumn(idx)}
                        className="hover:bg-green-200 rounded-full p-0.5"
                        title="Remove assessment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {iaColumns.map((col, idx) => (
                    <div key={col.id} className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                      <span>IA: {col.label} (/{col.maxScore})</span>
                      <button
                        onClick={() => handleRemoveIaColumn(idx)}
                        className="hover:bg-purple-200 rounded-full p-0.5"
                        title="Remove assessment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {/* Messages */}
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
        {/* Marks Table */}
        {!loading && selectedClass && selectedSubject && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">{selectedSubjectName}</h2>
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
                    {faColumns.map((col) => (
                      <th key={col.id} className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase bg-green-50">
                        {col.label}<br />
                        <span className="text-xs font-normal text-gray-500">(/{col.maxScore})</span>
                      </th>
                    ))}
                    {iaColumns.map((col) => (
                      <th key={col.id} className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase bg-purple-50">
                        {col.label}<br />
                        <span className="text-xs font-normal text-gray-500">(/{col.maxScore})</span>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase bg-blue-50">
                      CA<br />
                      <span className="text-xs font-normal text-gray-500">(/100)</span>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase bg-gray-100">
                      Total %
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
                      {marksData[student.std_id]?.FA.map((fa, idx) => (
                        <td key={idx} className="px-4 py-4 whitespace-nowrap bg-green-50">
                          <input
                            type="number"
                            step="0.01"
                            value={fa.score}
                            onChange={(e) => handleFaScoreChange(student.std_id, idx, e.target.value)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                            placeholder="0"
                          />
                        </td>
                      ))}
                      {marksData[student.std_id]?.IA.map((ia, idx) => (
                        <td key={idx} className="px-4 py-4 whitespace-nowrap bg-purple-50">
                          <input
                            type="number"
                            step="0.01"
                            value={ia.score}
                            onChange={(e) => handleIaScoreChange(student.std_id, idx, e.target.value)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-4 whitespace-nowrap bg-blue-50">
                        <input
                          type="number"
                          step="0.01"
                          value={marksData[student.std_id]?.CA_score || ''}
                          onChange={(e) => handleCaScoreChange(student.std_id, e.target.value)}
                          className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap bg-gray-100">
                        <div className="text-center font-bold text-gray-900">
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
        {/* Empty States */}
        {!loading && (!selectedClass || !selectedSubject) && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Get Started</h3>
            <p className="text-gray-600">Select a class and subject to start entering marks</p>
          </div>
        )}
      </div>
      {/* FA Modal */}
      {showFaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Formative Assessment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAssessment.label}
                  onChange={(e) => setNewAssessment({ ...newAssessment, label: e.target.value })}
                  placeholder="e.g., Quiz 1, Assignment 1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Score <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newAssessment.maxScore}
                  onChange={(e) => setNewAssessment({ ...newAssessment, maxScore: e.target.value })}
                  placeholder="e.g., 20"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowFaModal(false);
                    setNewAssessment({ label: '', maxScore: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFaColumn}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* IA Modal */}
      {showIaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add Integrated Assessment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assessment Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newAssessment.label}
                  onChange={(e) => setNewAssessment({ ...newAssessment, label: e.target.value })}
                  placeholder="e.g., Project, Presentation"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Score <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newAssessment.maxScore}
                  onChange={(e) => setNewAssessment({ ...newAssessment, maxScore: e.target.value })}
                  placeholder="e.g., 30"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowIaModal(false);
                    setNewAssessment({ label: '', maxScore: '' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddIaColumn}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Add Assessment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksEntryPage;