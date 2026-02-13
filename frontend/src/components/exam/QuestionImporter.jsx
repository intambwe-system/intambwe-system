import React, { useState, useCallback, useRef } from 'react';
import {
  Upload, FileText, FileJson, X, Check, AlertTriangle,
  Download, ChevronDown, ChevronUp, Loader2, CheckCircle,
  XCircle, HelpCircle, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Question types supported
const VALID_QUESTION_TYPES = [
  'multiple_choice_single',
  'multiple_choice_multiple',
  'true_false',
  'fill_in_blank',
  'short_answer',
  'essay'
];

const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Expected JSON Structure:
 * [
 *   {
 *     "question_text": "Your question here",
 *     "question_type": "multiple_choice_single",
 *     "points": 1,
 *     "difficulty": "medium",
 *     "explanation": "Optional explanation",
 *     "options": [
 *       { "option_text": "Option A", "is_correct": false },
 *       { "option_text": "Option B", "is_correct": true }
 *     ],
 *     "correct_answers": ["answer1", "answer2"]  // For fill_in_blank
 *   }
 * ]
 *
 * Expected CSV Structure:
 * question_text,question_type,points,difficulty,option_1,correct_1,option_2,correct_2,option_3,correct_3,option_4,correct_4,correct_answers,explanation
 */

const QuestionImporter = ({ onImport, onClose, maxPoints = null, currentPoints = 0 }) => {
  const [file, setFile] = useState(null);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [showStructureHelp, setShowStructureHelp] = useState(false);
  const fileInputRef = useRef(null);

  // Parse CSV content
  const parseCSV = (content) => {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
    const questions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      // Build question object
      const question = {
        question_text: row.question_text || '',
        question_type: row.question_type || 'multiple_choice_single',
        points: parseFloat(row.points) || 1,
        difficulty: row.difficulty || 'medium',
        explanation: row.explanation || '',
        options: [],
        correct_answers: [],
        _rowIndex: i + 1
      };

      // Parse options (option_1, correct_1, option_2, correct_2, etc.)
      for (let j = 1; j <= 6; j++) {
        const optText = row[`option_${j}`] || row[`option${j}`];
        const isCorrect = row[`correct_${j}`] || row[`correct${j}`];

        if (optText && optText.trim()) {
          question.options.push({
            option_text: optText.trim(),
            is_correct: isCorrect?.toString().toLowerCase() === 'true' || isCorrect === '1'
          });
        }
      }

      // Parse correct_answers for fill_in_blank (pipe-separated)
      if (row.correct_answers) {
        question.correct_answers = row.correct_answers.split('|').map(a => a.trim()).filter(a => a);
      }

      questions.push(question);
    }

    return questions;
  };

  // Helper to parse a CSV line handling quoted values
  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  // Parse JSON content
  const parseJSON = (content) => {
    const data = JSON.parse(content);

    if (!Array.isArray(data)) {
      throw new Error('JSON must be an array of questions');
    }

    return data.map((q, index) => ({
      ...q,
      _rowIndex: index + 1,
      points: parseFloat(q.points) || 1,
      difficulty: q.difficulty || 'medium',
      options: q.options || [],
      correct_answers: q.correct_answers || []
    }));
  };

  // Validate a single question
  const validateQuestion = (question, index) => {
    const errors = [];
    const warnings = [];

    // Required: question_text
    if (!question.question_text?.trim()) {
      errors.push(`Question text is required`);
    }

    // Validate question_type
    if (!VALID_QUESTION_TYPES.includes(question.question_type)) {
      errors.push(`Invalid question type: "${question.question_type}". Valid types: ${VALID_QUESTION_TYPES.join(', ')}`);
    }

    // Validate difficulty
    if (question.difficulty && !VALID_DIFFICULTIES.includes(question.difficulty)) {
      warnings.push(`Invalid difficulty "${question.difficulty}", defaulting to "medium"`);
      question.difficulty = 'medium';
    }

    // Validate points
    if (question.points <= 0) {
      warnings.push(`Points must be positive, defaulting to 1`);
      question.points = 1;
    }

    // MCQ validation
    if (['multiple_choice_single', 'multiple_choice_multiple'].includes(question.question_type)) {
      const validOptions = question.options.filter(o => o.option_text?.trim());

      if (validOptions.length < 2) {
        errors.push(`Multiple choice questions require at least 2 options`);
      }

      const correctOptions = validOptions.filter(o => o.is_correct);
      if (correctOptions.length === 0) {
        errors.push(`At least one correct answer must be marked`);
      }

      if (question.question_type === 'multiple_choice_single' && correctOptions.length > 1) {
        warnings.push(`Single choice question has multiple correct answers marked - only first will be used`);
      }
    }

    // True/False validation
    if (question.question_type === 'true_false') {
      if (question.options.length === 0) {
        // Auto-create true/false options
        question.options = [
          { option_text: 'True', is_correct: true },
          { option_text: 'False', is_correct: false }
        ];
        warnings.push(`True/False options auto-generated - "True" set as correct by default`);
      }
    }

    // Fill in blank validation
    if (question.question_type === 'fill_in_blank') {
      if (!question.correct_answers || question.correct_answers.length === 0) {
        errors.push(`Fill in the blank questions require at least one correct answer`);
      }
    }

    return { errors, warnings, isValid: errors.length === 0 };
  };

  // Handle file selection
  const handleFileSelect = useCallback(async (selectedFile) => {
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.split('.').pop().toLowerCase();

    if (!['json', 'csv'].includes(fileExtension)) {
      setErrors([{ message: 'Only JSON and CSV files are supported', row: 0 }]);
      return;
    }

    setFile(selectedFile);
    setParsing(true);
    setErrors([]);
    setWarnings([]);
    setParsedQuestions([]);

    try {
      const content = await selectedFile.text();
      let questions;

      if (fileExtension === 'json') {
        questions = parseJSON(content);
      } else {
        questions = parseCSV(content);
      }

      // Validate all questions
      const allErrors = [];
      const allWarnings = [];

      questions.forEach((question, index) => {
        const { errors, warnings, isValid } = validateQuestion(question, index);
        question._isValid = isValid;
        question._errors = errors;
        question._warnings = warnings;

        errors.forEach(err => allErrors.push({ message: err, row: question._rowIndex }));
        warnings.forEach(warn => allWarnings.push({ message: warn, row: question._rowIndex }));
      });

      setParsedQuestions(questions);
      setErrors(allErrors);
      setWarnings(allWarnings);

      // Auto-expand invalid questions
      const invalidIndexes = questions
        .map((q, i) => (q._isValid ? null : i))
        .filter(i => i !== null);
      setExpandedQuestions(new Set(invalidIndexes.slice(0, 5)));

    } catch (err) {
      setErrors([{ message: `Failed to parse file: ${err.message}`, row: 0 }]);
    } finally {
      setParsing(false);
    }
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  // Toggle question expansion
  const toggleQuestionExpand = (index) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Get valid questions
  const getValidQuestions = () => parsedQuestions.filter(q => q._isValid);

  // Calculate total points of valid questions
  const getValidQuestionsPoints = () => {
    return getValidQuestions().reduce((sum, q) => sum + (parseFloat(q.points) || 0), 0);
  };

  // Check if would exceed max points
  const wouldExceedLimit = () => {
    if (!maxPoints) return false;
    return (currentPoints + getValidQuestionsPoints()) > maxPoints;
  };

  // Handle import
  const handleImport = () => {
    const validQuestions = getValidQuestions();
    if (validQuestions.length === 0) return;

    // Clean up internal properties before importing
    const cleanedQuestions = validQuestions.map(q => {
      const { _rowIndex, _isValid, _errors, _warnings, ...clean } = q;
      return clean;
    });

    onImport(cleanedQuestions);
  };

  // Download sample template
  const downloadSampleJSON = () => {
    const sample = [
      {
        question_text: "What is the capital of France?",
        question_type: "multiple_choice_single",
        points: 2,
        difficulty: "easy",
        explanation: "Paris is the capital and largest city of France.",
        options: [
          { option_text: "London", is_correct: false },
          { option_text: "Paris", is_correct: true },
          { option_text: "Berlin", is_correct: false },
          { option_text: "Madrid", is_correct: false }
        ]
      },
      {
        question_text: "Which of the following are programming languages?",
        question_type: "multiple_choice_multiple",
        points: 3,
        difficulty: "medium",
        options: [
          { option_text: "Python", is_correct: true },
          { option_text: "HTML", is_correct: false },
          { option_text: "JavaScript", is_correct: true },
          { option_text: "CSS", is_correct: false }
        ]
      },
      {
        question_text: "The Earth is flat.",
        question_type: "true_false",
        points: 1,
        difficulty: "easy",
        options: [
          { option_text: "True", is_correct: false },
          { option_text: "False", is_correct: true }
        ]
      },
      {
        question_text: "The chemical symbol for water is ____.",
        question_type: "fill_in_blank",
        points: 1,
        difficulty: "easy",
        correct_answers: ["H2O", "h2o"]
      },
      {
        question_text: "Explain the concept of photosynthesis.",
        question_type: "essay",
        points: 10,
        difficulty: "hard",
        word_limit_min: 100,
        word_limit_max: 500
      }
    ];

    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadSampleCSV = () => {
    const headers = 'question_text,question_type,points,difficulty,option_1,correct_1,option_2,correct_2,option_3,correct_3,option_4,correct_4,correct_answers,explanation';
    const rows = [
      '"What is the capital of France?",multiple_choice_single,2,easy,"London",false,"Paris",true,"Berlin",false,"Madrid",false,,"Paris is the capital of France"',
      '"The Earth is flat.",true_false,1,easy,"True",false,"False",true,,,,,',
      '"The chemical symbol for water is ____.",fill_in_blank,1,easy,,,,,,,,"H2O|h2o",',
      '"Explain photosynthesis.",essay,10,hard,,,,,,,,,""'
    ];

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = getValidQuestions().length;
  const invalidCount = parsedQuestions.length - validCount;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Import Questions</h2>
              <p className="text-sm text-gray-500">Upload a JSON or CSV file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* File Structure Help */}
          <div className="mb-6">
            <button
              onClick={() => setShowStructureHelp(!showStructureHelp)}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              <Info className="w-4 h-4" />
              <span>View file structure requirements</span>
              {showStructureHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showStructureHelp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* JSON Structure */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <FileJson className="w-4 h-4 mr-2 text-amber-500" />
                            JSON Format
                          </h4>
                          <button
                            onClick={downloadSampleJSON}
                            className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download Template
                          </button>
                        </div>
                        <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`[
  {
    "question_text": "...",
    "question_type": "multiple_choice_single",
    "points": 1,
    "difficulty": "medium",
    "options": [
      { "option_text": "...", "is_correct": false },
      { "option_text": "...", "is_correct": true }
    ],
    "correct_answers": ["..."],
    "explanation": "..."
  }
]`}
                        </pre>
                      </div>

                      {/* CSV Structure */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 flex items-center">
                            <FileText className="w-4 h-4 mr-2 text-green-500" />
                            CSV Format
                          </h4>
                          <button
                            onClick={downloadSampleCSV}
                            className="text-xs text-primary-600 hover:text-primary-700 flex items-center"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Download Template
                          </button>
                        </div>
                        <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
{`question_text,question_type,points,
difficulty,option_1,correct_1,
option_2,correct_2,option_3,
correct_3,option_4,correct_4,
correct_answers,explanation`}
                        </pre>
                      </div>
                    </div>

                    {/* Valid Values */}
                    <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Question Types:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {VALID_QUESTION_TYPES.map(type => (
                            <span key={type} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                              {type}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Difficulty Levels:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {VALID_DIFFICULTIES.map(diff => (
                            <span key={diff} className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                              {diff}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Drop Zone */}
          {!file && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-primary-400 hover:bg-primary-50/50 transition-colors cursor-pointer"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv"
                onChange={(e) => handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <div className="flex justify-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <FileJson className="w-6 h-6 text-amber-600" />
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-gray-600 font-medium mb-2">
                Drop your file here, or click to browse
              </p>
              <p className="text-sm text-gray-500">
                Supports JSON and CSV files
              </p>
            </div>
          )}

          {/* Parsing Loading */}
          {parsing && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin mr-3" />
              <span className="text-gray-600">Parsing file...</span>
            </div>
          )}

          {/* File Selected - Show Results */}
          {file && !parsing && (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {file.name.endsWith('.json') ? (
                    <FileJson className="w-5 h-5 text-amber-500" />
                  ) : (
                    <FileText className="w-5 h-5 text-green-500" />
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setFile(null);
                    setParsedQuestions([]);
                    setErrors([]);
                    setWarnings([]);
                  }}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-2xl font-bold text-blue-700">{parsedQuestions.length}</p>
                  <p className="text-sm text-blue-600">Total Questions</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{validCount}</p>
                  <p className="text-sm text-green-600">Valid</p>
                </div>
                <div className={`p-4 rounded-lg border ${invalidCount > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className={`text-2xl font-bold ${invalidCount > 0 ? 'text-red-700' : 'text-gray-700'}`}>{invalidCount}</p>
                  <p className={`text-sm ${invalidCount > 0 ? 'text-red-600' : 'text-gray-600'}`}>Invalid</p>
                </div>
              </div>

              {/* Points Warning */}
              {maxPoints && wouldExceedLimit() && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Points limit exceeded</p>
                    <p className="text-sm text-red-600">
                      Current: {currentPoints.toFixed(2)} + Import: {getValidQuestionsPoints().toFixed(2)} = {(currentPoints + getValidQuestionsPoints()).toFixed(2)} / {maxPoints.toFixed(2)} max
                    </p>
                  </div>
                </div>
              )}

              {/* Errors */}
              {errors.length > 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-800">Errors ({errors.length})</span>
                  </div>
                  <ul className="space-y-1 text-sm text-red-700 max-h-32 overflow-y-auto">
                    {errors.slice(0, 10).map((err, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-red-500">•</span>
                        <span>Row {err.row}: {err.message}</span>
                      </li>
                    ))}
                    {errors.length > 10 && (
                      <li className="text-red-500 font-medium">...and {errors.length - 10} more errors</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {warnings.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-800">Warnings ({warnings.length})</span>
                  </div>
                  <ul className="space-y-1 text-sm text-amber-700 max-h-32 overflow-y-auto">
                    {warnings.slice(0, 5).map((warn, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-amber-500">•</span>
                        <span>Row {warn.row}: {warn.message}</span>
                      </li>
                    ))}
                    {warnings.length > 5 && (
                      <li className="text-amber-500 font-medium">...and {warnings.length - 5} more warnings</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Questions Preview */}
              {parsedQuestions.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <span className="font-medium text-gray-700">Questions Preview</span>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {parsedQuestions.map((question, index) => (
                      <div key={index} className={`${!question._isValid ? 'bg-red-50/50' : ''}`}>
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleQuestionExpand(index)}
                        >
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              question._isValid
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {question._isValid ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {question.question_text || `(Empty question)`}
                              </p>
                              <p className="text-xs text-gray-500">
                                {question.question_type} • {question.points} pts • {question.difficulty}
                              </p>
                            </div>
                          </div>
                          {expandedQuestions.has(index) ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </div>

                        <AnimatePresence>
                          {expandedQuestions.has(index) && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 space-y-2 text-sm">
                                {/* Show errors */}
                                {question._errors?.length > 0 && (
                                  <div className="p-2 bg-red-50 rounded text-red-700">
                                    {question._errors.map((err, i) => (
                                      <div key={i}>• {err}</div>
                                    ))}
                                  </div>
                                )}

                                {/* Show options */}
                                {question.options?.length > 0 && (
                                  <div>
                                    <span className="text-gray-500">Options:</span>
                                    <ul className="mt-1 space-y-1">
                                      {question.options.map((opt, i) => (
                                        <li key={i} className={`flex items-center space-x-2 ${opt.is_correct ? 'text-green-700' : 'text-gray-600'}`}>
                                          {opt.is_correct ? <Check className="w-3 h-3" /> : <span className="w-3" />}
                                          <span>{opt.option_text || '(empty)'}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Show correct answers for fill_in_blank */}
                                {question.question_type === 'fill_in_blank' && question.correct_answers?.length > 0 && (
                                  <div>
                                    <span className="text-gray-500">Accepted Answers: </span>
                                    <span className="text-green-700 font-mono">
                                      {question.correct_answers.join(', ')}
                                    </span>
                                  </div>
                                )}

                                {question.explanation && (
                                  <div>
                                    <span className="text-gray-500">Explanation: </span>
                                    <span className="text-gray-700">{question.explanation}</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="text-sm text-gray-500">
            {validCount > 0 && (
              <span>
                Ready to import {validCount} question{validCount !== 1 ? 's' : ''} ({getValidQuestionsPoints().toFixed(2)} points)
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={validCount === 0 || wouldExceedLimit()}
              className="flex items-center space-x-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Upload className="w-4 h-4" />
              <span>Import {validCount} Question{validCount !== 1 ? 's' : ''}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default QuestionImporter;
