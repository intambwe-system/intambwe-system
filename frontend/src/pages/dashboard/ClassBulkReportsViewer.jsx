import React, { useState, useEffect, use } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, Download, Loader2 } from 'lucide-react';
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
  const [error, setError] = useState(null);
  const [academicYear, setAcademicYear] = useState('2024/2025');

  useEffect(() => {
    loadClassData();
   
  }, [classId]);

  useEffect(() => {
    if (students.length > 0) {
      loadAllReports();
    }
    }, [students.length, academicYear]);

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

  const loadAllReports = async () => {
    if (students.length === 0) return;

    setLoadingReports(true);
    const reports = {};

    for (const student of students) {
      try {
        const response = await api.get(
          `/report/student/${student.std_id}/assessment?ac_year=${academicYear}`
        );

        const result = response.data;
        const data = result.data;

        const hasData = data.subjects && data.subjects.length > 0;

        if (hasData) {
          reports[student.std_id] = {
            student: data.student,
            subjects: data.subjects,
            semesterResults: data.semesterResults || [],
            overallStatistics: data.overallStatistics,
            overallRanking: data.overallRanking,
            categories: data.categories
          };
        } else {
          reports[student.std_id] = { noReport: true };
        }
      } catch (err) {
        console.error(`Failed to load report for student ${student.std_id}:`, err);
        reports[student.std_id] = { noReport: true };
      }
    }

    setStudentReports(reports);
    setLoadingReports(false);
  };

  const handlePrintAll = () => {
    window.print();
  };

  const exportAllReports = () => {
    const exportData = {
      className: classInfo?.class_name,
      academicYear: academicYear,
      students: students.map(student => {
        const report = studentReports[student.std_id];
        return {
          name: `${student.std_fname} ${student.std_lname}`,
          admissionNumber: student.admission_number,
          overallAverage: report?.overallStatistics?.overallAverage || 'N/A',
          position: report?.overallRanking?.position || 'N/A',
          hasReport: !report?.noReport
        };
      })
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class-${classId}-reports-${academicYear}.json`;
    a.click();
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
  const studentsWithReports = students.filter(s => studentReports[s.std_id] && !studentReports[s.std_id].noReport);

  return (
    <div className="bg-gray-50 min-h-screen">
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
          .page-break {
            page-break-after: always;
          }
        }
      `}</style>

      {/* Control Panel - No Print */}
      <div className="no-print bg-white shadow-lg p-6  top-0 z-10">
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
                  placeholder="2024/2025"
                />
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
                </>
              )}
            </div>
          </div>

          {reportsLoaded && (
            <div className="flex gap-4 text-sm">
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded">
                ✓ Reports Available: {studentsWithReports.length}
              </div>
              <div className="bg-red-100 text-red-800 px-4 py-2 rounded">
                ✗ No Reports: {students.length - studentsWithReports.length}
              </div>
            </div>
          )}

          {loadingReports && (
            <div className="mt-4">
              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Loading student reports...</p>
                    <p className="text-sm text-blue-700">
                      This may take a while depending on the number of students
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reports Display Area */}
      <div className="print-area p-4">
        {!reportsLoaded && !loadingReports && (
          <div className="max-w-7xl mx-auto bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 text-lg">
              Click "Load All Reports" to fetch and display all student reports
            </p>
          </div>
        )}

        {reportsLoaded && studentsWithReports.length === 0 && (
          <div className="max-w-7xl mx-auto bg-white rounded-lg shadow p-8 text-center">
            <p className="text-red-600 text-lg font-medium">
              No reports available for any students in this class
            </p>
          </div>
        )}

        {reportsLoaded && studentsWithReports.map((student, index) => {
          const report = studentReports[student.std_id];
          
          if (!report || report.noReport) return null;

          return (
            <div key={student.std_id} className={index < studentsWithReports.length - 1 ? 'page-break' : ''}>
              <TraineeAssessmentReportDisplay 
                reportData={report}
                academicYear={academicYear}
                onBack={() => {}} // No back button needed in bulk view
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
            <ul className="list-disc list-inside space-y-1 text-yellow-800">
              {students
                .filter(s => studentReports[s.std_id]?.noReport)
                .map(student => (
                  <li key={student.std_id}>
                    {student.std_fname} {student.std_mname} {student.std_lname} - 
                    Reg No: {student.admission_number}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassBulkReportsViewer;