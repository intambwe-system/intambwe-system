import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader, Upload } from 'lucide-react';
import studentService from '../../../services/studentService';
import students from '../../../stores/L4';

const BulkStudentSubmit = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);


  const handleBulkSubmit = async () => {
    setLoading(true);
    setShowResults(false);
    const submissionResults = [];

    for (let student of students) {
      try {
        const response = await studentService.createStudent(student);
        submissionResults.push({
          student: `${student.std_fname} ${student.std_lname}`,
          status: 'success',
          message: 'Successfully created',
          data: response
        });
      } catch (error) {
        submissionResults.push({
          student: `${student.std_fname} ${student.std_lname}`,
          status: 'error',
          message: error.message
        });
      }
    }

    console.log(submissionResults);
    

    setResults(submissionResults);
    setShowResults(true);
    setLoading(false);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Bulk Student Registration
          </h1>
          <p className="text-gray-600 mb-6">
            Submit {students.length} students to the system
          </p>

          <button
            onClick={handleBulkSubmit}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-3 shadow-md"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={24} />
                Submitting Students... ({results.length}/{students.length})
              </>
            ) : (
              <>
                <Upload size={24} />
                Submit {students.length} Students
              </>
            )}
          </button>

          {showResults && (
            <div className="mt-8">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">
                  Submission Summary
                </h2>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="text-green-700 font-medium">
                      {successCount} Successful
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="text-red-600" size={20} />
                    <span className="text-red-700 font-medium">
                      {errorCount} Failed
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      result.status === 'success'
                        ? 'bg-green-50 border-green-500'
                        : 'bg-red-50 border-red-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {result.status === 'success' ? (
                        <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={20} />
                      ) : (
                        <XCircle className="text-red-600 flex-shrink-0 mt-1" size={20} />
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">
                          {result.student}
                        </p>
                        <p className={`text-sm ${
                          result.status === 'success' ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {result.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkStudentSubmit;