import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Printer, Download, User } from 'lucide-react';
import classService from '../../services/classService';
import studentService from '../../services/studentService';
import logo from '../../assets/logo.png';
import api from '../../api/api';


const ClassReportsViewer = () => {
  const [classes, setClasses] = useState([]);
  const [expandedClasses, setExpandedClasses] = useState({});
  const [studentReports, setStudentReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState({});
  const [error, setError] = useState(null);
  const [academicYear, setAcademicYear] = useState('2024/2025');
  const [selectedReport, setSelectedReport] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize state from URL params on mount


  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams();

    if (Object.keys(expandedClasses).length > 0) {
      params.set('expanded', JSON.stringify(expandedClasses));
    }

    if (academicYear) {
      params.set('year', academicYear);
    }

    navigate(`?${params.toString()}`, { replace: true });
  }, [expandedClasses, academicYear]);

  // Load all classes on mount
  useEffect(() => {
    loadAllClasses();
  }, []);

  const loadAllClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await classService.getAllClasses();
      setClasses(response.data || response);
    } catch (err) {
      setError('Failed to load classes: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleClass = async (classId) => {
    const isExpanded = expandedClasses[classId];

    setExpandedClasses(prev => ({
      ...prev,
      [classId]: !isExpanded
    }));

    // If expanding and haven't loaded students yet, load them
    if (!isExpanded && !studentReports[classId]) {
      await loadClassStudents(classId);
    }
  };

  const loadClassStudents = async (classId) => {
    setLoadingReports(prev => ({ ...prev, [classId]: true }));
    try {
      const response = await classService.getClassStudents(classId);
      const students = response.data || response;

      // Initialize student reports for this class
      setStudentReports(prev => ({
        ...prev,
        [classId]: {
          students: students,
          reports: {}
        }
      }));
    } catch (err) {
      console.error(`Failed to load students for class ${classId}:`, err);
    } finally {
      setLoadingReports(prev => ({ ...prev, [classId]: false }));
    }
  };

  const loadStudentReport = async (classId, studentId) => {
    setLoadingReports(prev => ({
      ...prev,
      [`${classId}-${studentId}`]: true
    }));

    try {
      const response = await api.get(
        `/report/student/${studentId}/assessment?ac_year=${academicYear}`
      );

      const result = response.data;
      const data = result.data;

      // Check if student has any assessment data
      const hasData = data.subjects && data.subjects.length > 0;

      if (!hasData) {
        alert('No assessment data available for this student.');
        // Store a "no report" marker
        setStudentReports(prev => ({
          ...prev,
          [classId]: {
            ...prev[classId],
            reports: {
              ...prev[classId].reports,
              [studentId]: { noReport: true }
            }
          }
        }));
      } else {
        // Store the report data
        setStudentReports(prev => ({
          ...prev,
          [classId]: {
            ...prev[classId],
            reports: {
              ...prev[classId].reports,
              [studentId]: {
                student: data.student,
                subjects: data.subjects,
                semesterResults: data.semesterResults || [],
                overallStatistics: data.overallStatistics,
                overallRanking: data.overallRanking,
                categories: data.categories
              }
            }
          }
        }));
      }
    } catch (err) {
      console.error(`Failed to load report for student ${studentId}:`, err);
      // Mark as no report on error
      setStudentReports(prev => ({
        ...prev,
        [classId]: {
          ...prev[classId],
          reports: {
            ...prev[classId].reports,
            [studentId]: { noReport: true }
          }
        }
      }));
    } finally {
      setLoadingReports(prev => ({
        ...prev,
        [`${classId}-${studentId}`]: false
      }));
    }
  };
  const viewFullReport = (classId, studentId) => {
    const report = studentReports[classId]?.reports[studentId];
    if (report && !report.noReport) {
      setSelectedReport(report);
    }
  };

  const printReport = () => {
    window.print();
  };

  const exportReports = (classId) => {
    const classData = studentReports[classId];
    if (!classData) return;

    const exportData = {
      className: classes.find(c => c.class_id === classId)?.class_name,
      academicYear: academicYear,
      students: classData.students.map(student => {
        const report = classData.reports[student.std_id];
        return {
          name: `${student.std_fname} ${student.std_lname}`,
          admissionNumber: student.admission_number,
          overallAverage: report?.overallStatistics?.overallAverage || 'N/A',
          position: report?.overallRanking?.position || 'N/A'
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class-${classId}-reports.json`;
    a.click();
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading classes...</p>
      </div>
    );
  }

  if (selectedReport) {
    return <TraineeAssessmentReportDisplay
      reportData={selectedReport}
      academicYear={academicYear}
      onBack={() => setSelectedReport(null)}
    />;
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold text-gray-800">Class Reports</h1>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Academic Year:</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1"
                placeholder="2024/2025"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <p className="text-gray-600">
            View and print assessment reports for all students by class
          </p>
        </div>

        <div className="space-y-4">
          {classes.map((classItem) => (
            <div key={classItem.class_id} className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <button
                  onClick={() => toggleClass(classItem.class_id)}
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedClasses[classItem.class_id] ? (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-500" />
                    )}
                    <div className="text-left">
                      <h2 className="text-xl font-bold text-gray-800">
                        {classItem.class_name}
                      </h2>
                      <p className="text-sm text-gray-600">
                        Trade: {classItem.Trade?.trade_name || 'N/A'}
                      </p>
                    </div>
                  </div>
                  {studentReports[classItem.class_id] && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/employee/dashboard/class-report/${classItem.class_id}?year=${academicYear}`);
                      }}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                      
                    >
                      <Download className="w-4 h-4" />
                      All Reports
                    </button>
                  )}
                </button>
              </div>

              {expandedClasses[classItem.class_id] && (
                <div className="p-6">
                  {loadingReports[classItem.class_id] ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-gray-600">Loading students...</p>
                    </div>
                  ) : studentReports[classItem.class_id]?.students?.length > 0 ? (
                    <div className="grid gap-4">
                      {studentReports[classItem.class_id].students.map((student) => {
                        const report = studentReports[classItem.class_id].reports[student.std_id];
                        const isLoadingReport = loadingReports[`${classItem.class_id}-${student.std_id}`];

                        return (
                          <div
                            key={student.std_id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-800">
                                    {student.std_fname} {student.std_mname} {student.std_lname}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    Reg No: {student.admission_number}
                                  </p>
                                  {report && (
                                    <div className="mt-1 flex gap-4 text-sm">
                                      <span className="text-green-600 font-medium">
                                        Avg: {report.overallStatistics?.overallAverage || 'N/A'}%
                                      </span>
                                      <span className="text-blue-600 font-medium">
                                        Position: {report.overallRanking?.position || 'N/A'}/{report.overallRanking?.totalStudents || 'N/A'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                {!report ? (
                                  <button
                                    onClick={() => loadStudentReport(classItem.class_id, student.std_id)}
                                    disabled={isLoadingReport}
                                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                                  >
                                    {isLoadingReport ? 'Loading...' : 'Load Report'}
                                  </button>
                                ) : report.noReport ? (
                                  <div className="bg-red-100 text-red-700 px-4 py-2 rounded font-medium">
                                    No Report Available
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => viewFullReport(classItem.class_id, student.std_id)}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                                  >
                                    <Printer className="w-4 h-4" />
                                    View & Print
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-gray-500">
                      No students found in this class
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

          {classes.length === 0 && (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No classes found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};



export const TraineeAssessmentReportDisplay = ({ reportData, academicYear, onBack }) => {
  const [viewMode, setViewMode] = useState('all'); // 'all', 'semester1', 'semester2', 'semester3'

  const calculateAnnualAverage = (terms) => {
    const values = Object.values(terms).map(t => parseFloat(t.avg)).filter(v => !isNaN(v) && v > 0);
    if (values.length === 0) return null;
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  const hasAllSemesters = () => {
    const subjects = getAllSubjects();
    if (subjects.length === 0) return false;

    return subjects.every(subject => {
      const s1 = subject.terms?.['Semester 1']?.avg;
      const s2 = subject.terms?.['Semester 2']?.avg;
      const s3 = subject.terms?.['Semester 3']?.avg;
      return s1 && s2 && s3;
    });
  };

  const isCompetent = (value, type) => {
    const mark = parseFloat(value);
    if (isNaN(mark) || mark <= 0) return true;

    if (type?.toLowerCase().includes('specific') || type?.toLowerCase().includes('core')) {
      return mark >= 70;
    } else if (type?.toLowerCase().includes('general')) {
      return mark >= 60;
    } else {
      return mark >= 50;
    }
  };

  const getMarkStyle = (value, type) => {
    if (!value || value === '-') return {};

    if (!isCompetent(value, type)) {
      return {
        color: 'red',
        textDecoration: 'underline',
        fontWeight: 'bold'
      };
    }
    return {};
  };

  const getObservation = (item, annualAvg, type) => {
    const allSemesters = hasAllSemesters();

    if (allSemesters && annualAvg) {
      const avg = parseFloat(annualAvg);
      if (type?.includes('CORE') || type?.toLowerCase().includes('core') || type?.toLowerCase().includes('specific')) {
        return avg > 70 ? 'C' : 'NYC';
      } else if (type?.toLowerCase().includes('general')) {
        return avg > 60 ? 'C' : 'NYC';
      } else {
        return avg > 50 ? 'C' : 'NYC';
      }
    } else {
      const terms = item.terms || {};
      const s3 = parseFloat(terms['Semester 3']?.avg);
      const s2 = parseFloat(terms['Semester 2']?.avg);
      const s1 = parseFloat(terms['Semester 1']?.avg);

      const recentAvg = !isNaN(s3) && s3 > 0 ? s3 : (!isNaN(s2) && s2 > 0 ? s2 : s1);

      if (!recentAvg || isNaN(recentAvg)) return '-';

      if (type?.includes('CORE') || type?.toLowerCase().includes('core') || type?.toLowerCase().includes('specific')) {
        return recentAvg > 70 ? 'C' : 'NYC';
      } else if (type?.toLowerCase().includes('general')) {
        return recentAvg > 60 ? 'C' : 'NYC';
      } else {
        return recentAvg > 50 ? 'C' : 'NYC';
      }
    }
  };

  const getAllSubjects = () => {
    const { coreSpecific, coreGeneral, complementary } = getCategories();
    return [...coreSpecific, ...coreGeneral, ...complementary];
  };

  const calculateSemesterColumnTotals = (semesterName) => {
    const subjects = getAllSubjects();

    const totals = {
      fa: 0,
      la: 0,
      ca: 0,
      avg: 0
    };

    const hasValue = {
      fa: false,
      la: false,
      ca: false,
      avg: false
    };

    subjects.forEach(subject => {
      const term = subject.terms?.[semesterName];
      if (!term) return;

      if (term.fa !== null) {
        totals.fa += Number(term.fa);
        hasValue.fa = true;
      }

      if (term.la !== null) {
        totals.la += Number(term.la);
        hasValue.la = true;
      }

      if (term.ca !== null) {
        totals.ca += Number(term.ca);
        hasValue.ca = true;
      }

      if (term.avg !== null) {
        totals.avg += Number(term.avg);
        hasValue.avg = true;
      }
    });

    return {
      fa: hasValue.fa ? totals.fa.toFixed(1) : null,
      la: hasValue.la ? totals.la.toFixed(1) : null,
      ca: hasValue.ca ? totals.ca.toFixed(1) : null,
      avg: hasValue.avg ? totals.avg.toFixed(1) : null
    };
  };

  const getSemesterResult = (semesterName) => {
    if (!reportData?.semesterResults) return null;
    return reportData.semesterResults.find(sr => sr.semester === semesterName);
  };

  const handlePrint = () => {
    window.print();
  };

  const getSubjects = () => reportData?.subjects || [];
  const getCategories = () => reportData?.categories || { coreSpecific: [], coreGeneral: [], complementary: [] };
  const getOverallStats = () => reportData?.overallStatistics || { totalMarks: 0, overallAverage: 0, totalCredits: 0 };
  const getOverallRanking = () => reportData?.overallRanking || { position: null, totalStudents: 0, percentile: 0 };

  const { coreSpecific, coreGeneral, complementary } = getCategories();
  const student = reportData.student;
  const overallStats = getOverallStats();
  const overallRanking = getOverallRanking();

  const semester1Result = getSemesterResult('Semester 1');
  const semester2Result = getSemesterResult('Semester 2');
  const semester3Result = getSemesterResult('Semester 3');

  const allSemestersComplete = hasAllSemesters();

  // Determine which semesters to display based on view mode
  const getSemestersToDisplay = () => {
    if (viewMode === 'all') {
      return ['Semester 1', 'Semester 2', 'Semester 3'];
    } else if (viewMode === 'semester1') {
      return ['Semester 1'];
    } else if (viewMode === 'semester2') {
      return ['Semester 2'];
    } else if (viewMode === 'semester3') {
      return ['Semester 3'];
    }
    return ['Semester 1', 'Semester 2', 'Semester 3'];
  };

  const semestersToDisplay = getSemestersToDisplay();
  const showAnnualAverage = viewMode === 'all';

  return (
    <div className="bg-white p-4">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="no-print mb-4">
        {/* View Mode Selector */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded ${
              viewMode === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Terms
          </button>
          <button
            onClick={() => setViewMode('semester1')}
            className={`px-4 py-2 rounded ${
              viewMode === 'semester1'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Term 1 Only
          </button>
          <button
            onClick={() => setViewMode('semester2')}
            className={`px-4 py-2 rounded ${
              viewMode === 'semester2'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Term 2 Only
          </button>
          <button
            onClick={() => setViewMode('semester3')}
            className={`px-4 py-2 rounded ${
              viewMode === 'semester3'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Term 3 Only
          </button>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-x-4">
          <button
            onClick={handlePrint}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Print Report
          </button>
          <button
            onClick={onBack}
            className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
          >
            Back to Classes
          </button>
        </div>
      </div>

      <div className="print-area border border-black">
        {/* Header Section */}
        <div className="grid grid-cols-3 border-b border-black">
          <div className="border-r border-black p-3 text-xs">
            <div className="font-bold">INTANGO TECHNICAL SECONDARY SCHOOL</div>
            <div className="mt-1"><span className="font-bold">Phone:</span> 0788333010</div>
            <div><span className="font-bold">E-mail:</span> intangotss@gmail.com</div>
            <div><span className="font-bold">Website:</span> www.intangotss.rw</div>
          </div>

          <div className="border-r border-black p-3 flex flex-col items-center justify-center">
            <img src={logo} className='h-40' alt="" />
          </div>

          <div className="p-3 text-xs">
            <div><span className="font-bold">YEAR:</span> {academicYear}</div>
            <div className="mt-1"><span className="font-bold">CLASS:</span> {student.Class?.class_name || 'N/A'}</div>
            <div className="mt-1"><span className="font-bold">NAMES:</span> {student.std_fname} {student.std_mname || ''} {student.std_lname}</div>
            <div className="mt-1"><span className="font-bold">REG NO:</span> {student.admission_number}</div>
          </div>
        </div>

        {/* Title */}
        <div className="bg-gray-200 border-b border-black p-1.5 text-center">
          <h2 className="font-bold text-sm">
            TRAINEE'S ASSESSMENT REPORT
            {viewMode !== 'all' && (
              <span className="ml-2">
                ({viewMode === 'semester1' ? '1st Term' : viewMode === 'semester2' ? '2nd Term' : '3rd Term'})
              </span>
            )}
          </h2>
        </div>

        {/* Qualification Info */}
        <div className="border-b border-black">
          <div className="grid grid-cols-4 text-[10px]">
            <div className="border-r border-black p-1.5 font-bold">Qualification code</div>
            <div className="border-r border-black p-1.5 col-span-2">
              <span className="font-bold">Qualification Title:</span> TVET CERTIFICATE III IN {student.Class?.Trade?.trade_name || 'SOFTWARE DEVELOPMENT'}
            </div>
            <div className="p-1.5"></div>
          </div>
        </div>

        <div className="border-b border-black">
          <div className="grid grid-cols-4 text-[10px]">
            <div className="border-r border-black p-1.5">
              <span className="font-bold">Trade:</span> {student.Class?.Trade?.trade_name || 'SOFTWARE DEVELOPMENT'}
            </div>
            <div className="border-r border-black p-1.5 col-span-2">
              <span className="font-bold">RQF Level:</span> LEVEL 3
            </div>
            <div className="p-1.5"></div>
          </div>
        </div>

        {/* Assessment Legend */}
        <div className="border-b border-black p-1.5 text-[9px]">
          <span className="font-bold">F.A:</span> Formative Assessment |
          <span className="font-bold"> LA:</span> Integrated Assessment |
          <span className="font-bold"> C.A:</span> Comprehensive Assessment |
          <span className="font-bold"> AVG:</span> Average
          {showAnnualAverage && (
            <>
              <span className="font-bold"> | A.A:</span> Annual Average
            </>
          )}
          <span className="font-bold"> | R.E:</span> Re-Assessment
        </div>

        {/* Main Assessment Table */}
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr className="bg-gray-100 font-bold">
              <td colSpan="4" className="border border-black p-1 text-left"></td>
              <td className="border border-black p-1 text-center">MAX</td>

              {semestersToDisplay.map((semester, idx) => (
                <th key={idx} colSpan="4" className="border border-black p-0.5 bg-gray-100">
                  {semester === 'Semester 1' ? '1st Term' : semester === 'Semester 2' ? '2nd Term' : '3rd Term'}
                </th>
              ))}
              
              {showAnnualAverage && (
                <th colSpan={3} className="border border-black p-1 bg-gray-100">A.A<br />(%)</th>
              )}
            </tr>

            <tr className="bg-gray-100 font-bold">
              <td colSpan="4" className="border border-black p-1 text-left">Behaviour</td>
              <td className="border border-black p-1 text-center">100</td>

              {semestersToDisplay.map((semester, idx) => {
                const result = getSemesterResult(semester);
                return (
                  <td key={idx} colSpan="4" className="border border-black p-1 text-center">
                    {result ? `${result.percentage}%` : '-'}
                  </td>
                );
              })}

              {showAnnualAverage && (
                <td colSpan="3" className="border border-black p-1 text-center">
                  {allSemestersComplete ? `${overallStats.overallAverage}%` : '-'}
                </td>
              )}
            </tr>

            <tr>
              <th colSpan="3" rowSpan="2" className="border border-black p-1 bg-gray-100">Module Code</th>
              <th rowSpan="2" className="border border-black p-1 bg-gray-100">Competence Title</th>
              <th rowSpan="2" className="border border-black p-1 bg-gray-100">Credits</th>
            </tr>
            <tr className="bg-gray-100">
              {semestersToDisplay.map(() => (
                <>
                  <th className="border border-black p-0.5">F.A</th>
                  <th className="border border-black p-0.5">LA</th>
                  <th className="border border-black p-0.5">C.A</th>
                  <th className="border border-black p-0.5">AVG</th>
                </>
              ))}
              {showAnnualAverage && (
                <>
                  <th className="border border-black p-0.5">A.A</th>
                  <th className="border border-black p-0.5">R.E</th>
                  <th className="border border-black p-0.5">Observation</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Core Competencies - Specific */}
            {coreSpecific.length > 0 && (
              <>
                <tr className="bg-blue-50">
                  <td colSpan="20" className="border border-black p-1 font-bold">Core competencies - Specific</td>
                </tr>
                {coreSpecific.map((item, idx) => {
                  const annualAvg = calculateAnnualAverage(item.terms);
                  return (
                    <tr key={`cs-${idx}`}>
                      <td colSpan="3" className="border border-black p-1">{item.code}</td>
                      <td className="border border-black p-1">{item.title}</td>
                      <td className="border border-black p-1 text-center">{item.credits}</td>
                      {semestersToDisplay.map((term, termIdx) => {
                        const termData = item.terms[term] || {};
                        return (
                          <React.Fragment key={termIdx}>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.fa, 'specific')}>{termData.fa || '-'}</td>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.la, 'specific')}>{termData.la || '-'}</td>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.ca, 'specific')}>{termData.ca || '-'}</td>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.avg, 'specific')}>{termData.avg || '-'}</td>
                          </React.Fragment>
                        );
                      })}
                      {showAnnualAverage && (
                        <>
                          <td className="border border-black p-1 text-center font-bold" style={getMarkStyle(annualAvg, 'specific')}>
                            {allSemestersComplete && annualAvg ? annualAvg : '-'}
                          </td>
                          <td className="border border-black p-1 text-center font-bold"></td>
                          <td className="border border-black p-1 text-center font-bold">
                            {getObservation(item, annualAvg, 'specific')}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </>
            )}

            {/* Core Competencies - General */}
            {coreGeneral.length > 0 && (
              <>
                <tr className="bg-green-50">
                  <td colSpan="20" className="border border-black p-1 font-bold">Core competencies - General</td>
                </tr>
                {coreGeneral.map((item, idx) => {
                  const annualAvg = calculateAnnualAverage(item.terms);
                  return (
                    <tr key={`cg-${idx}`}>
                      <td colSpan="3" className="border border-black p-1">{item.code}</td>
                      <td className="border border-black p-1">{item.title}</td>
                      <td className="border border-black p-1 text-center">{item.credits}</td>
                      {semestersToDisplay.map((term, termIdx) => {
                        const termData = item.terms[term] || {};
                        return (
                          <React.Fragment key={termIdx}>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.fa, 'general')}>{termData.fa || '-'}</td>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.la, 'general')}>{termData.la || '-'}</td>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.ca, 'general')}>{termData.ca || '-'}</td>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.avg, 'general')}>{termData.avg || '-'}</td>
                          </React.Fragment>
                        );
                      })}
                      {showAnnualAverage && (
                        <>
                          <td className="border border-black p-1 text-center font-bold" style={getMarkStyle(annualAvg, 'general')}>
                            {allSemestersComplete && annualAvg ? annualAvg : '-'}
                          </td>
                          <td className="border border-black p-1 text-center font-bold"></td>
                          <td className="border border-black p-1 text-center font-bold">
                            {getObservation(item, annualAvg, 'general')}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </>
            )}

            {/* Complementary Competencies */}
            {complementary.length > 0 && (
              <>
                <tr className="bg-yellow-50">
                  <td colSpan="20" className="border border-black p-1 font-bold">Complementary competencies</td>
                </tr>
                {complementary.map((item, idx) => {
                  const annualAvg = calculateAnnualAverage(item.terms);
                  return (
                    <tr key={`cc-${idx}`}>
                      <td colSpan="3" className="border border-black p-1">{item.code}</td>
                      <td className="border border-black p-1">{item.title}</td>
                      <td className="border border-black p-1 text-center">{item.credits}</td>
                      {semestersToDisplay.map((term, termIdx) => {
                        const termData = item.terms[term] || {};
                        return (
                          <React.Fragment key={termIdx}>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.fa, 'complementary')}>{termData.fa || '-'}</td>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.la, 'complementary')}>{termData.la || '-'}</td>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.ca, 'complementary')}>{termData.ca || '-'}</td>
                            <td className="border border-black p-1 text-center" style={getMarkStyle(termData.avg, 'complementary')}>{termData.avg || '-'}</td>
                          </React.Fragment>
                        );
                      })}
                      {showAnnualAverage && (
                        <>
                          <td className="border border-black p-1 text-center font-bold" style={getMarkStyle(annualAvg, 'complementary')}>
                            {allSemestersComplete && annualAvg ? annualAvg : '-'}
                          </td>
                          <td className="border border-black p-1 text-center font-bold"></td>
                          <td className="border border-black p-1 text-center font-bold">
                            {getObservation(item, annualAvg, 'complementary')}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </>
            )}

            {getSubjects().length === 0 && (
              <tr>
                <td colSpan="20" className="border border-black p-4 text-center text-gray-500">
                  No assessment data available for this student
                </td>
              </tr>
            )}

            {/* Term Totals Row */}
            {getSubjects().length > 0 && (
              <>
                <tr className="bg-white font-bold">
                  <td colSpan="20" className="border border-black p-3 text-left"></td>
                </tr>
                <tr className="bg-blue-100 font-bold">
                  <td colSpan="4" className="border border-black p-1 text-left">TOTAL</td>
                  <td className="border border-black p-1 text-center">{overallStats.totalCredits}</td>
                  {semestersToDisplay.map((term, idx) => {
                    const semesterTotals = calculateSemesterColumnTotals(term);
                    return (
                      <React.Fragment key={idx}>
                        <td className="border border-black p-1 text-center">
                          {semesterTotals.fa ? semesterTotals.fa : '-'}
                        </td>
                        <td className="border border-black p-1 text-center">{semesterTotals.la ? semesterTotals.la : '-'}</td>
                        <td className="border border-black p-1 text-center">{semesterTotals.ca ? semesterTotals.ca : '-'}</td>
                        <td className="border border-black p-1 text-center">
                          {semesterTotals.avg ? semesterTotals.avg : '-'}
                        </td>
                      </React.Fragment>
                    );
                  })}

                  {showAnnualAverage && (
                    <>
                      <td className="border border-black p-1 text-center">
                        {allSemestersComplete ? overallStats.totalMarks : '-'}
                      </td>
                      <td className="border border-black p-1 text-center"></td>
                      <td className="border border-black p-1 text-center"></td>
                    </>
                  )}
                </tr>

                {/* Position Row */}
                <tr className="bg-yellow-100 font-bold">
                  <td colSpan="4" className="border border-black p-1 text-left">POSITION</td>
                  <td className="border border-black p-1 text-center"></td>

                  {semestersToDisplay.map((semester, idx) => {
                    const result = getSemesterResult(semester);
                    return (
                      <td key={idx} colSpan="4" className="border border-black p-1 text-center">
                        {result && result.ranking.position
                          ? `${result.ranking.position} out of ${result.ranking.totalStudents}`
                          : '-'}
                      </td>
                    );
                  })}

                  {showAnnualAverage && (
                    <>
                      <td colSpan="2" className="border border-black p-1 text-center">
                        {allSemestersComplete && overallRanking.position
                          ? `${overallRanking.position} out of ${overallRanking.totalStudents}`
                          : '-'}
                      </td>
                      <td className="border border-black p-1 text-center"></td>
                    </>
                  )}
                </tr>
              </>
            )}

            {/* Class Trainer's Comments & Signature */}
            <tr className="bg-white font-bold">
              <td colSpan="4" className="border border-black p-1 text-left">Class Trainer's Comments & Signature</td>
              <td className="border border-black p-1 text-center"></td>
              {semestersToDisplay.map((_, idx) => (
                <td key={idx} colSpan="4" className="border border-black p-1 text-center"></td>
              ))}
              {showAnnualAverage && (
                <td colSpan="3" className="border border-black p-1 text-center"></td>
              )}
            </tr>
            <tr className="bg-white font-bold">
              <td colSpan="4" className="border border-black p-1 text-left">Parents signature</td>
              <td className="border border-black p-1 text-center"></td>
              {semestersToDisplay.map((_, idx) => (
                <td key={idx} colSpan="4" className="border border-black p-1 text-center"></td>
              ))}
              {showAnnualAverage && (
                <td colSpan="3" className="border border-black p-1 text-center"></td>
              )}
            </tr>
          </tbody>
        </table>

        {/* Deliberation Table */}
        <div className="border-t border-black">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-1 font-bold">Deliberation</th>
                <th className="border border-black p-1 font-bold">Promotion at 1st Sitting</th>
                <th className="border border-black p-1 font-bold">2nd Sitting</th>
                <th className="border border-black p-1 font-bold">Promoted after re-assessment</th>
                <th className="border border-black p-1 font-bold">Advised to Repeat</th>
                <th className="border border-black p-1 font-bold">Dismissed</th>
                <th className="border border-black p-1 font-bold">School Manager<br />MURANGWA Annable<br />SIGNATURE<br />____/____/{new Date().getFullYear()}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-3"></td>
                <td className="border border-black p-3 text-center">
                  <input type="checkbox" className="w-4 h-4" />
                </td>
                <td className="border border-black p-3 text-center">
                  <input type="checkbox" className="w-4 h-4" />
                </td>
                <td className="border border-black p-3 text-center">
                  <input type="checkbox" className="w-4 h-4" />
                </td>
                <td className="border border-black p-3 text-center">
                  <input type="checkbox" className="w-4 h-4" />
                </td>
                <td className="border border-black p-3 text-center">
                  <input type="checkbox" className="w-4 h-4" />
                </td>
                <td className="border border-black p-3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-1 text-right text-[8px] border-t border-black">
          Powered by Intango TSS
        </div>
      </div>
    </div>
  );
};

export default ClassReportsViewer