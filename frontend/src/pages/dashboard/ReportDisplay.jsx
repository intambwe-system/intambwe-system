import React, { useState, useEffect } from 'react';
import studentService from '../..//services/studentService';
import marksService from '../../services/marksService';
import classService from '../../services/classService';

const TraineeAssessmentReport = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [academicYear, setAcademicYear] = useState('2024/2025');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Load all students on component mount
  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setLoadingStudents(true);
    setError(null);
    try {
      const response = await studentService.getAllStudents({ std_status: 'Active' });
      setStudents(response.data || response);
    } catch (err) {
      setError('Failed to load students: ' + err.message);
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const loadStudentReport = async () => {
    if (!selectedStudentId) {
      setError('Please select a student');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch student details
      const studentResponse = await studentService.getStudentById(selectedStudentId);
      const student = studentResponse.data || studentResponse;

      // Fetch student transcript (marks)
      const transcriptResponse = await marksService.getStudentTranscript(selectedStudentId, {
        ac_year: academicYear
      });
      const marks = transcriptResponse.data || transcriptResponse;

      // Process marks data
      const processedMarks = processMarksData(marks);

      setReportData({
        student: student,
        subjects: processedMarks
      });
    } catch (err) {
      setError('Failed to load report: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Process marks data by subject and term
  const processMarksData = (marks) => {
    const subjectMap = new Map();
    
    if (!marks || marks.length === 0) return [];

    marks.forEach(mark => {
      const subject = mark.Subject;
      if (!subject) return;

      const key = subject.sbj_code;
      
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          code: subject.sbj_code,
          title: subject.sbj_name,
          credits: subject.sbj_credit,
          category: subject.category_type || 'GENERAL',
          terms: {}
        });
      }
      
      const subjectData = subjectMap.get(key);
      const termKey = mark.semester?.replace('Semester ', '') || '1';
      
      // Calculate FA (average of Formative Assessments normalized to 100%)
      let fa = 0;
      if (mark.FA && Array.isArray(mark.FA) && mark.FA.length > 0) {
        // Normalize each assessment to 100% then average
        const normalizedScores = mark.FA.map(assessment => {
          const score = parseFloat(assessment.score) || 0;
          const maxScore = parseFloat(assessment.maxScore) || 1;
          return (score / maxScore) * 100;
        });
        fa = (normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length).toFixed(2);
      }
      
      // Calculate LA (average of Integrated Assessments normalized to 100%)
      let la = 0;
      if (mark.IA && Array.isArray(mark.IA) && mark.IA.length > 0) {
        // Normalize each assessment to 100% then average
        const normalizedScores = mark.IA.map(assessment => {
          const score = parseFloat(assessment.score) || 0;
          const maxScore = parseFloat(assessment.maxScore) || 1;
          return (score / maxScore) * 100;
        });
        la = (normalizedScores.reduce((sum, score) => sum + score, 0) / normalizedScores.length).toFixed(2);
      }
      
      // CA normalized to 100%
      let ca = 0;
      const caScore = parseFloat(mark.CA_score || 0);
      const caMaxScore = parseFloat(mark.CA_maxScore || 1);
      if (caMaxScore > 0) {
        ca = ((caScore / caMaxScore) * 100).toFixed(2);
      }
      
      // Calculate total (FA + LA + CA) - all already on 100% scale, so just average them
      const total = ((parseFloat(fa) + parseFloat(la) + parseFloat(ca)) / 3).toFixed(2);
      
      subjectData.terms[termKey] = { fa, la, ca, avg: total };
    });

    return Array.from(subjectMap.values());
  };

  const calculateAnnualAverage = (terms) => {
    const values = Object.values(terms).map(t => parseFloat(t.avg));
    if (values.length === 0) return '0.00';
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
  };

  const categorizeSubjects = (subjects) => {
    const coreSpecific = subjects.filter(s => s.category === 'CORE');
    const coreGeneral = subjects.filter(s => s.category === 'GENERAL');
    const complementary = subjects.filter(s => s.category === 'COMPLEMENTARY');
    return { coreSpecific, coreGeneral, complementary };
  };

  const handlePrint = () => {
    window.print();
  };

  if (!reportData) {
    return (
      <div className="p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Load Student Assessment Report</h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Student</label>
              {loadingStudents ? (
                <p className="text-gray-500">Loading students...</p>
              ) : (
                <select
                  className="border border-gray-300 rounded px-4 py-2 w-full"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  <option value="">-- Select a student --</option>
                  {students.map((student) => (
                    <option key={student.std_id} value={student.std_id}>
                      {student.admission_number} - {student.std_fname} {student.std_mname} {student.std_lname}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Academic Year</label>
              <input
                type="text"
                className="border border-gray-300 rounded px-4 py-2 w-full"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g., 2023/24"
              />
            </div>

            <button
              onClick={loadStudentReport}
              disabled={loading || !selectedStudentId}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 w-full"
            >
              {loading ? 'Loading Report...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { coreSpecific, coreGeneral, complementary } = categorizeSubjects(reportData.subjects);
  const student = reportData.student;

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

      <div className="no-print mb-4 text-center space-x-4">
        <button
          onClick={handlePrint}
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
        >
          Print Report
        </button>
        <button
          onClick={() => setReportData(null)}
          className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700"
        >
          Load Another Report
        </button>
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
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <div className="text-white text-2xl font-bold">🔧</div>
            </div>
            <div className="text-[8px] font-bold mt-1 text-center">Intango Technical Secondary School</div>
            <div className="text-[7px] text-center">Skills Development School</div>
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
          <h2 className="font-bold text-sm">TRAINEE'S ASSESSMENT REPORT</h2>
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
          <span className="font-bold"> AVG:</span> Average | 
          <span className="font-bold"> A.A:</span> Annual Average
        </div>

        {/* Main Assessment Table */}
        <table className="w-full border-collapse text-[9px]">
          <thead>
            <tr>
              <th colSpan="3" rowSpan="2" className="border border-black p-1 bg-gray-100">Module Code</th>
              <th rowSpan="2" className="border border-black p-1 bg-gray-100">Competence Title</th>
              <th rowSpan="2" className="border border-black p-1 bg-gray-100">Credits</th>
              <th colSpan="4" className="border border-black p-0.5 bg-gray-100">1st Term</th>
              <th colSpan="4" className="border border-black p-0.5 bg-gray-100">2nd Term</th>
              <th colSpan="4" className="border border-black p-0.5 bg-gray-100">3rd Term</th>
              <th rowSpan="2" className="border border-black p-1 bg-gray-100">A.A<br/>(%)</th>
            </tr>
            <tr className="bg-gray-100">
              {['F.A', 'LA', 'C.A', 'AVG', 'F.A', 'LA', 'C.A', 'AVG', 'F.A', 'LA', 'C.A', 'AVG'].map((label, idx) => (
                <th key={idx} className="border border-black p-0.5">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Core Competencies - Specific */}
            {coreSpecific.length > 0 && (
              <>
                <tr className="bg-blue-50">
                  <td colSpan="18" className="border border-black p-1 font-bold">Core competencies - Specific</td>
                </tr>
                {coreSpecific.map((item, idx) => (
                  <tr key={`cs-${idx}`}>
                    <td colSpan="3" className="border border-black p-1">{item.code}</td>
                    <td className="border border-black p-1">{item.title}</td>
                    <td className="border border-black p-1 text-center">{item.credits}</td>
                    {['1', '2', '3'].map(term => {
                      const termData = item.terms[term] || {};
                      return (
                        <React.Fragment key={term}>
                          <td className="border border-black p-1 text-center">{termData.fa || '-'}</td>
                          <td className="border border-black p-1 text-center">{termData.la || '-'}</td>
                          <td className="border border-black p-1 text-center">{termData.ca || '-'}</td>
                          <td className="border border-black p-1 text-center">{termData.avg || '-'}</td>
                        </React.Fragment>
                      );
                    })}
                    <td className="border border-black p-1 text-center font-bold">{calculateAnnualAverage(item.terms)}</td>
                  </tr>
                ))}
              </>
            )}

            {/* Core Competencies - General */}
            {coreGeneral.length > 0 && (
              <>
                <tr className="bg-green-50">
                  <td colSpan="18" className="border border-black p-1 font-bold">Core competencies - General</td>
                </tr>
                {coreGeneral.map((item, idx) => (
                  <tr key={`cg-${idx}`}>
                    <td colSpan="3" className="border border-black p-1">{item.code}</td>
                    <td className="border border-black p-1">{item.title}</td>
                    <td className="border border-black p-1 text-center">{item.credits}</td>
                    {['1', '2', '3'].map(term => {
                      const termData = item.terms[term] || {};
                      return (
                        <React.Fragment key={term}>
                          <td className="border border-black p-1 text-center">{termData.fa || '-'}</td>
                          <td className="border border-black p-1 text-center">{termData.la || '-'}</td>
                          <td className="border border-black p-1 text-center">{termData.ca || '-'}</td>
                          <td className="border border-black p-1 text-center">{termData.avg || '-'}</td>
                        </React.Fragment>
                      );
                    })}
                    <td className="border border-black p-1 text-center font-bold">{calculateAnnualAverage(item.terms)}</td>
                  </tr>
                ))}
              </>
            )}

            {/* Complementary Competencies */}
            {complementary.length > 0 && (
              <>
                <tr className="bg-yellow-50">
                  <td colSpan="18" className="border border-black p-1 font-bold">Complementary competencies</td>
                </tr>
                {complementary.map((item, idx) => (
                  <tr key={`cc-${idx}`}>
                    <td colSpan="3" className="border border-black p-1">{item.code}</td>
                    <td className="border border-black p-1">{item.title}</td>
                    <td className="border border-black p-1 text-center">{item.credits}</td>
                    {['1', '2', '3'].map(term => {
                      const termData = item.terms[term] || {};
                      return (
                        <React.Fragment key={term}>
                          <td className="border border-black p-1 text-center">{termData.fa || '-'}</td>
                          <td className="border border-black p-1 text-center">{termData.la || '-'}</td>
                          <td className="border border-black p-1 text-center">{termData.ca || '-'}</td>
                          <td className="border border-black p-1 text-center">{termData.avg || '-'}</td>
                        </React.Fragment>
                      );
                    })}
                    <td className="border border-black p-1 text-center font-bold">{calculateAnnualAverage(item.terms)}</td>
                  </tr>
                ))}
              </>
            )}

            {reportData.subjects.length === 0 && (
              <tr>
                <td colSpan="18" className="border border-black p-4 text-center text-gray-500">
                  No assessment data available for this student
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Comments Section */}
        <div className="border-t border-black p-2">
          <div className="font-bold text-xs mb-1">Class Trainer's Comments & Signature</div>
          <div className="border border-gray-400 h-16"></div>
        </div>

        <div className="border-t border-black p-2">
          <div className="font-bold text-xs mb-1">Parents signature</div>
          <div className="border border-gray-400 h-12"></div>
        </div>

        {/* Deliberation Table */}
        <div className="border-t border-black">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 font-bold">Deliberation</th>
                <th className="border border-black p-2 font-bold">Promotion at 1st Sitting</th>
                <th className="border border-black p-2 font-bold">2nd Sitting</th>
                <th className="border border-black p-2 font-bold">Promoted after re-assessment</th>
                <th className="border border-black p-2 font-bold">Advised to Repeat</th>
                <th className="border border-black p-2 font-bold">Dismissed</th>
                <th className="border border-black p-2 font-bold">School Manager<br/>MURANGWA Annable<br/>SIGNATURE<br/>____/____/2024</th>
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

export default TraineeAssessmentReport;