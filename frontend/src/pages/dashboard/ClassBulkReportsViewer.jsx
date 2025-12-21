import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import classService from '../../services/classService';
import api from '../../api/api';
import { TraineeAssessmentReportDisplay } from './ReportDisplay';

const ClassBulkReportsViewer = () => {
  const { classId } = useParams();
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentReports, setStudentReports] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [error, setError] = useState(null);
  const [academicYear, setAcademicYear] = useState('2025/26');
  const [viewMode, setViewMode] = useState('all'); // 'all', 'semester1', 'semester2'

  useEffect(() => {
    loadClassData();
  }, [classId]);

  useEffect(() => {
    // Clear reports when academic year changes
    setStudentReports({});
    setLoadingProgress({ current: 0, total: 0 });
  }, [academicYear]);

  const loadClassData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch class info
      const classResponse = await classService.getClassById(classId);
      setClassInfo(classResponse.data || classResponse);

      // Fetch students in class
      const studentsResponse = await classService.getClassStudents(classId);
      const studentsList = studentsResponse.data || studentsResponse;
      setStudents(studentsList);
    } catch (err) {
      setError('Failed to load class data: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Validation function for report data
  const validateReportData = (data) => {
    if (!data) return false;
    
    // Check if data has the expected structure
    if (!data.student) return false;
    if (!data.academicYear) return false;
    
    // Check if subjects array exists (can be empty)
    if (!Array.isArray(data.subjects)) return false;
    
    // If subjects exist, validate they have required fields
    if (data.subjects.length > 0) {
      const validSubjects = data.subjects.every(subject => 
        subject.sbj_id && 
        subject.title && 
        subject.terms
      );
      if (!validSubjects) return false;
    }
    
    // Validate semester results if they exist
    if (data.semesterResults && !Array.isArray(data.semesterResults)) {
      return false;
    }
    
    // Validate overall statistics if they exist
    if (data.overallStatistics && typeof data.overallStatistics !== 'object') {
      return false;
    }
    
    return true;
  };

  // Transform and validate report data
  const transformReportData = (data) => {
    if (!validateReportData(data)) {
      return null;
    }

    // Check if report has actual data
    const hasData = data.subjects && data.subjects.length > 0;

    if (!hasData) {
      return { noReport: true };
    }

    return {
      student: data.student,
      subjects: data.subjects,
      semesterResults: data.semesterResults || [],
      disciplineMarks: data.disciplineMarks || [],
      overallStatistics: data.overallStatistics || {},
      overallRanking: data.overallRanking || {},
      categories: data.categories || {}
    };
  };

  // Load reports one by one
  const loadAllReports = async () => {
    if (students.length === 0) return;

    setLoadingReports(true);
    setLoadingProgress({ current: 0, total: students.length });
    setStudentReports({}); // Clear existing reports

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      
      try {
        const response = await api.get(
          `/report/student/${student.std_id}/assessment?ac_year=${academicYear}`
        );

        const result = response.data;
        const data = result.data;

        // Validate and transform the data
        const transformedData = transformReportData(data);

        if (transformedData) {
          // Update state with the validated report
          setStudentReports(prev => ({
            ...prev,
            [student.std_id]: transformedData
          }));
        } else {
          // Invalid data structure
          console.error(`Invalid report data for student ${student.std_id}`);
          setStudentReports(prev => ({
            ...prev,
            [student.std_id]: { noReport: true, error: 'Invalid data structure' }
          }));
        }
      } catch (err) {
        console.error(`Failed to load report for student ${student.std_id}:`, err);
        setStudentReports(prev => ({
          ...prev,
          [student.std_id]: { noReport: true, error: err.message }
        }));
      }

      // Update progress
      setLoadingProgress({ current: i + 1, total: students.length });
      
      // Small delay to prevent overwhelming the server
      if (i < students.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    setLoadingReports(false);
  };

  const handlePrintAll = () => {
    window.print();
  };

  const exportAllReports = () => {
    const exportData = {
      className: classInfo?.class_name,
      academicYear: academicYear,
      exportDate: new Date().toISOString(),
      students: students.map(student => {
        const report = studentReports[student.std_id];
        return {
          studentId: student.std_id,
          name: `${student.std_fname} ${student.std_lname}`,
          admissionNumber: student.admission_number,
          overallAverage: report?.overallStatistics?.overallAverage || 'N/A',
          position: report?.overallRanking?.position || 'N/A',
          totalStudents: report?.overallRanking?.totalStudents || 'N/A',
          hasReport: !report?.noReport,
          error: report?.error || null
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class-${classId}-reports-${academicYear.replace('/', '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading class data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  const reportsLoaded = Object.keys(studentReports).length > 0;
  const studentsWithReports = students
    .filter(s => studentReports[s.std_id] && !studentReports[s.std_id].noReport)
    .sort((a, b) => {
      const reportA = studentReports[a.std_id];
      const reportB = studentReports[b.std_id];
      
      const positionA = reportA?.overallRanking?.position || Infinity;
      const positionB = reportB?.overallRanking?.position || Infinity;
      
      return positionA - positionB;
    });
  const progressPercentage = loadingProgress.total > 0 
    ? Math.round((loadingProgress.current / loadingProgress.total) * 100) 
    : 0;

  return (
    <div className="bg-gray-50 min-h-screen">
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-area {
            display: block;
            width: 100%;
          }
          
          .single-report {
            page-break-before: always;
            page-break-after: always;
            page-break-inside: avoid;
            min-height: 100vh;
            display: block;
            position: relative;
            padding: 10mm;
            box-sizing: border-box;
          }
          
          .single-report:first-child {
            page-break-before: avoid;
          }
          
          .single-report:last-child {
            page-break-after: avoid;
          }
        }
        
        @media screen {
          .single-report {
            margin-bottom: 3rem;
            padding: 2rem;
            background: white;
            border: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
        }
      `}</style>

      {/* Control Panel - No Print */}
      <div className="no-print bg-white shadow-lg p-6 top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {classInfo?.class_name || 'Class'} Reports
              </h1>
              <p className="text-gray-600">
                Trade: {classInfo?.Trade?.trade_name || 'N/A'} | 
                Students: {students.length}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Academic Year:</label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                  placeholder="2025/26"
                  disabled={loadingReports}
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">View:</label>
                <select
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2"
                
                >
                  <option value="all">All Semesters</option>
                  <option value="semester1">Semester 1 Only</option>
                  <option value="semester2">Semester 2 Only</option>
                  <option value="semester3">Semester 3 Only</option>
                </select>
              </div>

              {!reportsLoaded ? (
                <button
                  onClick={loadAllReports}
                  disabled={loadingReports || students.length === 0}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {loadingReports ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Loading Reports...
                    </>
                  ) : (
                    'Load All Reports'
                  )}
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePrintAll}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 flex items-center gap-2"
                    disabled={studentsWithReports.length === 0}
                  >
                    <Printer className="w-5 h-5" />
                    Print All ({studentsWithReports.length})
                  </button>
                  
                  <button
                    onClick={exportAllReports}
                    className="bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Export Data
                  </button>

                  <button
                    onClick={loadAllReports}
                    className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
                  >
                    Reload Reports
                  </button>
                </>
              )}
            </div>
          </div>

          {reportsLoaded && (
            <div className="flex gap-4 text-sm">
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Reports Available: {studentsWithReports.length}
              </div>
              <div className="bg-red-100 text-red-800 px-4 py-2 rounded flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                No Reports: {students.length - studentsWithReports.length}
              </div>
            </div>
          )}

          {loadingReports && (
            <div className="mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">
                      Loading student reports... ({loadingProgress.current}/{loadingProgress.total})
                    </p>
                    <p className="text-sm text-blue-700">
                      Processing reports one by one
                    </p>
                  </div>
                  <span className="text-blue-900 font-bold">{progressPercentage}%</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="print-area">
        {!reportsLoaded && !loadingReports && (
          <div className="no-print max-w-7xl mx-auto mt-8 bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 text-lg">
              Click "Load All Reports" to fetch and display all student reports
            </p>
          </div>
        )}
        
        {reportsLoaded && studentsWithReports.length === 0 && !loadingReports && (
          <div className="no-print max-w-7xl mx-auto mt-8 bg-white rounded-lg shadow p-8 text-center">
            <p className="text-red-600 text-lg font-medium">
              No reports available for any students in this class
            </p>
          </div>
        )}
        
        {reportsLoaded && studentsWithReports.map((student, index) => {
          const report = studentReports[student.std_id];
          
          if (!report || report.noReport) return null;
          
          return (
            <div 
              key={student.std_id} 
              className="single-report"
            >
              <TraineeAssessmentReportDisplay
                reportData={report}
                academicYear={academicYear}
                initialViewMode={viewMode === 'all' ? undefined : viewMode}
                onBack={() => {}}
              />
            </div>
          );
        })}
      </div>

      {/* Students Without Reports - No Print */}
      {reportsLoaded && students.filter(s => studentReports[s.std_id]?.noReport).length > 0 && (
        <div className="no-print max-w-7xl mx-auto p-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-yellow-900 mb-3">
              Students Without Reports
            </h3>
            <ul className="space-y-2">
              {students
                .filter(s => studentReports[s.std_id]?.noReport)
                .map(student => {
                  const report = studentReports[student.std_id];
                  return (
                    <li key={student.std_id} className="text-yellow-800 flex items-start gap-2">
                      <XCircle className="w-4 h-4 mt-1 flex-shrink-0" />
                      <div>
                        <span className="font-medium">
                          {student.std_fname} {student.std_mname} {student.std_lname}
                        </span>
                        {' - '}
                        <span className="text-sm">Reg No: {student.admission_number}</span>
                        {report?.error && (
                          <span className="text-sm text-red-600 block">
                            Error: {report.error}
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassBulkReportsViewer;