import React, { useEffect, useState } from "react";
import { BookOpen, RefreshCw, AlertCircle } from "lucide-react";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import employeeService from "../../../services/employeeService";

export default function MySubjectsPage() {
  const { employee } = useEmployeeAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await employeeService.getMyTeachingSubjects();
        const data = res.data || res;
        setAssignments(Array.isArray(data) ? data : data?.data || []);
      } catch (err) {
        setError(err.message || "Failed to load assigned subjects");
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-indigo-600" />
              My Subjects
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Subjects you are currently assigned to teach.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="p-2 border border-gray-300 rounded-full text-gray-600 hover:bg-gray-100 transition"
            disabled={loading}
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </header>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center text-indigo-600">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>Loading your subjects...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center text-red-600">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="font-medium">{error}</p>
            </div>
          ) : assignments.length === 0 ? (
            <div className="p-10 text-center">
              <AlertCircle className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No subjects assigned yet</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                You are not currently assigned to any subjects. Once the admin assigns subjects to you, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['#', 'Subject Code', 'Subject Name', 'Class'].map((header) => (
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
                  {assignments.map((a, index) => (
                    <tr key={a.id || index} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-800">
                        {a.Subject?.sbj_code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {a.Subject?.sbj_name || `Subject #${a.sbj_id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {a.Class?.class_name || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
