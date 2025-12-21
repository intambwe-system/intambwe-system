import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, Upload, Award } from 'lucide-react';
import marksPayload from '../../../stores/marks';
import marksService from '../../../services/marksService';

const BulkMarksSubmit = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [existingMarks, setExistingMarks] = useState({});

  // Fetch existing marks on component mount
  useEffect(() => {
    const fetchExistingMarks = async () => {
      try {
        const allMarks = await Promise.all(
          marksPayload.map(p => 
            marksService.getMarksByStudent(p.std_id, p.sbj_id, p.class_id, p.ac_year, p.semester)
              .catch(() => null) // Return null if marks don't exist
          )
        );
        
        // Map existing marks by std_id for easy lookup
        const marksMap = {};
        allMarks.forEach((mark, idx) => {
          if (mark && mark.data) {
            marksMap[marksPayload[idx].std_id] = mark.data;
          }
        });
        setExistingMarks(marksMap);
      } catch (err) {
        console.error('Failed to fetch existing marks:', err);
      }
    };

    fetchExistingMarks();
  }, []);

  // Smart merge function that preserves existing marks
  const mergeMarks = (existing, newData) => {
    if (!existing) return newData;

    // Helper to merge assessment arrays (FA/IA)
    const mergeAssessments = (existingArr = [], newArr = []) => {
      if (!newArr || newArr.length === 0) return existingArr;
      if (!existingArr || existingArr.length === 0) return newArr;

      // Create a map of existing assessments by label+maxScore
      const existingMap = new Map(
        existingArr.map(item => [
          `${item.label}|${item.maxScore}`,
          item
        ])
      );

      // Merge: keep existing scores unless new data provides a non-null score
      const merged = newArr.map(newItem => {
        const key = `${newItem.label}|${newItem.maxScore}`;
        const existingItem = existingMap.get(key);

        if (existingItem) {
          // Only overwrite if new score is not null/empty
          return {
            ...newItem,
            score: (newItem.score !== null && newItem.score !== '') 
              ? newItem.score 
              : existingItem.score
          };
        }
        return newItem;
      });

      // Add any existing assessments not in new data
      existingArr.forEach(item => {
        const key = `${item.label}|${item.maxScore}`;
        if (!newArr.find(n => `${n.label}|${n.maxScore}` === key)) {
          merged.push(item);
        }
      });

      return merged;
    };

    return {
      ...existing,
      ...newData,
      // Merge FA assessments
      FA: mergeAssessments(existing.FA, newData.FA),
      // Merge IA assessments
      IA: mergeAssessments(existing.IA, newData.IA),
      // Only update CA if new data provides a non-null value
      CA_score: (newData.CA_score !== null && newData.CA_score !== '') 
        ? newData.CA_score 
        : existing.CA_score,
      CA_maxScore: newData.CA_maxScore || existing.CA_maxScore
    };
  };

  const handleBulkSubmit = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      // Merge new data with existing marks
      const updatedPayload = marksPayload.map(p => {
        const existing = existingMarks[p.std_id];
        return mergeMarks(existing, p);
      });

      const responses = await Promise.all(
        updatedPayload.map(p => marksService.createOrUpdateMarks(p))
      );

      setResults({
        success: true,
        count: responses.length,
        data: responses
      });
    } catch (err) {
      setError(err.message || 'Failed to submit marks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <Award className="text-purple-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-800">
              Bulk Marks Submission
            </h1>
          </div>
          <p className="text-gray-600 mb-2">
            Submit marks for {marksPayload.length} students
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Subject ID: 14 | Class ID: 1 | Academic Year: 2025/26 | Semester 1
          </p>

          {Object.keys(existingMarks).length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ℹ️ Found existing marks for {Object.keys(existingMarks).length} students. 
                Existing FA, IA, and CA marks will be preserved unless overwritten.
              </p>
            </div>
          )}

          <button
            onClick={handleBulkSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-3 shadow-lg"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={24} />
                Submitting Marks...
              </>
            ) : (
              <>
                <Upload size={24} />
                Submit {marksPayload.length} Marks Records
              </>
            )}
          </button>

          {error && (
            <div className="mt-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <XCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
                <div>
                  <h3 className="font-semibold text-red-800 mb-1">
                    Submission Failed
                  </h3>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {results && results.success && (
            <div className="mt-6 bg-green-50 border-l-4 border-green-500 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={28} />
                <div className="flex-1">
                  <h3 className="font-bold text-green-800 text-xl mb-2">
                    All Marks Submitted Successfully!
                  </h3>
                  <p className="text-green-700 mb-4">
                    Successfully submitted marks for {results.count} students. 
                    Existing marks were preserved where applicable.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkMarksSubmit;