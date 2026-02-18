import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, ArrowRight, Check, Save, BookOpen, Clock,
  Calendar, Settings, Shield, BarChart3, Users, AlertCircle,
  CheckCircle, XCircle, X, Loader2, Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as examService from '../../../services/examService';
import classService from '../../../services/classService';
import subjectService from '../../../services/subjectService';
import { useEmployeeAuth } from '../../../contexts/EmployeeAuthContext';

const ExamCreator = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { employee } = useEmployeeAuth();
  const isEditing = Boolean(examId);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [operationStatus, setOperationStatus] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    sbj_id: '',
    class_id: '',
    exam_mode: 'graded',
    has_time_limit: false,
    time_limit_minutes: 60,
    auto_submit_on_timeout: true,
    start_date: '',
    end_date: '',
    max_attempts: 1,
    total_points: '',
    pass_percentage: 50,
    randomize_questions: false,
    randomize_options: false,
    show_results_immediately: false,
    show_correct_answers: false,
    access_password: '',
    detect_tab_switch: false,
    max_tab_switches: 3,
    // Public Access Settings
    is_public: false,
    allow_non_students: false,
    require_participant_info: true,
    ac_year: '',
    semester: '',
    // Assessment Type for Marks Recording
    assessment_type: ''
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [classRes, subjectRes] = await Promise.all([
        classService.getAllClasses(),
        subjectService.getAllSubjects()
      ]);

      setClasses(Array.isArray(classRes) ? classRes : classRes.data || []);
      setSubjects(Array.isArray(subjectRes) ? subjectRes : subjectRes.data || []);

      if (isEditing) {
        const examRes = await examService.getExamById(examId);
        const exam = examRes.data || examRes;
        setFormData({
          title: exam.title || '',
          description: exam.description || '',
          instructions: exam.instructions || '',
          sbj_id: exam.sbj_id || '',
          class_id: exam.class_id || '',
          exam_mode: exam.exam_mode || 'graded',
          has_time_limit: exam.has_time_limit || false,
          time_limit_minutes: exam.time_limit_minutes || 60,
          auto_submit_on_timeout: exam.auto_submit_on_timeout ?? true,
          start_date: exam.start_date ? exam.start_date.slice(0, 16) : '',
          end_date: exam.end_date ? exam.end_date.slice(0, 16) : '',
          max_attempts: exam.max_attempts || 1,
          total_points: exam.total_points || '',
          pass_percentage: exam.pass_percentage || 50,
          randomize_questions: exam.randomize_questions || false,
          randomize_options: exam.randomize_options || false,
          show_results_immediately: exam.show_results_immediately || false,
          show_correct_answers: exam.show_correct_answers || false,
          access_password: exam.access_password || '',
          detect_tab_switch: exam.detect_tab_switch || false,
          max_tab_switches: exam.max_tab_switches || 3,
          is_public: exam.is_public || false,
          allow_non_students: exam.allow_non_students || false,
          require_participant_info: exam.require_participant_info ?? true,
          ac_year: exam.ac_year || '',
          semester: exam.semester || '',
          assessment_type: exam.assessment_type || ''
        });
      }
    } catch (err) {
      showToast('error', err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message, duration = 4000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateStep = (step) => {
    const errors = {};

    if (step === 1) {
      if (!formData.title.trim()) errors.title = 'Title is required';
      if (!formData.sbj_id) errors.sbj_id = 'Subject is required';
    }

    if (step === 2) {
      if (formData.has_time_limit && (!formData.time_limit_minutes || formData.time_limit_minutes < 1)) {
        errors.time_limit_minutes = 'Time limit must be at least 1 minute';
      }
      if (formData.start_date && formData.end_date && new Date(formData.start_date) >= new Date(formData.end_date)) {
        errors.end_date = 'End date must be after start date';
      }
    }

    if (step === 3) {
      if (formData.max_attempts < 1) errors.max_attempts = 'At least 1 attempt required';
      if (formData.pass_percentage < 0 || formData.pass_percentage > 100) {
        errors.pass_percentage = 'Pass percentage must be 0-100';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (e) => {
  

    // Validate all steps
    for (let step = 1; step <= totalSteps; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        return;
      }
    }

    try {
      setSubmitting(true);

      const payload = {
        ...formData,
        sbj_id: formData.sbj_id || null,
        class_id: formData.class_id || null,
        time_limit_minutes: formData.has_time_limit ? parseInt(formData.time_limit_minutes) : null,
        max_attempts: parseInt(formData.max_attempts),
        total_points: formData.total_points ? parseFloat(formData.total_points) : null,
        pass_percentage: parseFloat(formData.pass_percentage),
        max_tab_switches: formData.detect_tab_switch ? parseInt(formData.max_tab_switches) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        access_password: formData.access_password || null,
        assessment_type: formData.assessment_type || null
      };

      let result;
      if (isEditing) {
        result = await examService.updateExam(examId, payload);
        showToast('success', 'Exam updated successfully!');
      } else {
        result = await examService.createExam(payload);
        showToast('success', 'Exam created successfully!');
      }

      const newExamId = result.data?.exam_id || result.exam_id || examId;

      setTimeout(() => {
        navigate(`/employee/dashboard/exams/${newExamId}/questions`);
      }, 1500);

    } catch (err) {
      showToast('error', err.message || 'Failed to save exam');
    } finally {
      setSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info', icon: FileText },
    { number: 2, title: 'Timing', icon: Clock },
    { number: 3, title: 'Grading', icon: BarChart3 },
    { number: 4, title: 'Security', icon: Shield }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-xl flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          <span className="text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4">
      <div className=" mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {isEditing ? 'Edit Exam' : 'Create New Exam'}
                </h1>
                <p className="text-primary-100 mt-1">
                  Step {currentStep} of {totalSteps}: {steps[currentStep - 1].title}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/employee/dashboard/exams')}
                className="flex items-center space-x-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Exams</span>
              </motion.button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-gray-50 px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.number;
                const isCurrent = currentStep === step.number;

                return (
                  <React.Fragment key={step.number}>
                    <div className="flex flex-col items-center">
                      <motion.div
                        animate={{
                          scale: isCurrent ? 1.1 : 1,
                          backgroundColor: isCompleted ? '#10b981' : isCurrent ? '#6366f1' : '#d1d5db'
                        }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all`}
                      >
                        {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                      </motion.div>
                      <span className={`text-xs mt-2 font-medium ${isCurrent ? 'text-primary-600' : 'text-gray-500'}`}>
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-3 rounded transition-all ${isCompleted ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <form className="p-6">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-4">Basic Information</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exam Title *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Midterm Examination - Mathematics"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                      formErrors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.title && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.title}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subject *
                    </label>
                    <select
                      name="sbj_id"
                      value={formData.sbj_id}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        formErrors.sbj_id ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Subject</option>
                      {subjects.map(s => (
                        <option key={s.sbj_id} value={s.sbj_id}>{s.sbj_name}</option>
                      ))}
                    </select>
                    {formErrors.sbj_id && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.sbj_id}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class (Optional)
                    </label>
                    <select
                      name="class_id"
                      value={formData.class_id}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">All Classes</option>
                      {classes.map(c => (
                        <option key={c.class_id} value={c.class_id}>{c.class_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exam Mode
                    </label>
                    <select
                      name="exam_mode"
                      value={formData.exam_mode}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="graded">Graded Exam</option>
                      <option value="practice">Practice Test</option>
                      <option value="survey">Survey / Quiz</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      name="ac_year"
                      value={formData.ac_year}
                      onChange={handleChange}
                      placeholder="e.g., 2025-2026"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Semester
                    </label>
                    <select
                      name="semester"
                      value={formData.semester}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="">Select Semester</option>
                      <option value="Semester 1">Semester 1</option>
                      <option value="Semester 2">Semester 2</option>
                      <option value="Semester 3">Semester 3</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Brief description of the exam..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Instructions for Students
                  </label>
                  <textarea
                    name="instructions"
                    value={formData.instructions}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Instructions that will be shown to students before starting the exam..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 2: Timing & Scheduling */}
            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-4">Timing & Scheduling</h2>

                {/* Time Limit */}
                <div className="bg-blue-50 p-5 rounded-xl border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-gray-800">Time Limit</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="has_time_limit"
                        checked={formData.has_time_limit}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <AnimatePresence>
                    {formData.has_time_limit && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Duration (minutes)
                            </label>
                            <input
                              type="number"
                              name="time_limit_minutes"
                              value={formData.time_limit_minutes}
                              onChange={handleChange}
                              min="1"
                              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white ${
                                formErrors.time_limit_minutes ? 'border-red-500' : 'border-gray-300'
                              }`}
                            />
                            {formErrors.time_limit_minutes && (
                              <p className="text-red-500 text-sm mt-1">{formErrors.time_limit_minutes}</p>
                            )}
                          </div>
                        </div>

                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            name="auto_submit_on_timeout"
                            checked={formData.auto_submit_on_timeout}
                            onChange={handleChange}
                            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700">Auto-submit when time runs out</span>
                        </label>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Schedule */}
                <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-gray-800">Availability Schedule (Optional)</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white ${
                          formErrors.end_date ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {formErrors.end_date && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.end_date}</p>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    Leave empty to allow access anytime after publishing.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Grading & Results */}
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-4">Grading & Results</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Attempts
                    </label>
                    <input
                      type="number"
                      name="max_attempts"
                      value={formData.max_attempts}
                      onChange={handleChange}
                      min="1"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        formErrors.max_attempts ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.max_attempts && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.max_attempts}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Points
                    </label>
                    <input
                      type="number"
                      name="total_points"
                      value={formData.total_points}
                      onChange={handleChange}
                      min="0"
                      placeholder="Auto-calculated"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave empty to auto-calculate from questions</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passing Percentage (%)
                    </label>
                    <input
                      type="number"
                      name="pass_percentage"
                      value={formData.pass_percentage}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        formErrors.pass_percentage ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {formErrors.pass_percentage && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.pass_percentage}</p>
                    )}
                  </div>
                </div>

                {/* Randomization */}
                <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <Settings className="w-5 h-5 text-purple-600" />
                    <span className="font-medium text-gray-800">Randomization</span>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="randomize_questions"
                        checked={formData.randomize_questions}
                        onChange={handleChange}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Randomize question order for each student</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="randomize_options"
                        checked={formData.randomize_options}
                        onChange={handleChange}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">Randomize answer options order</span>
                    </label>
                  </div>
                </div>

                {/* Results Display */}
                <div className="bg-amber-50 p-5 rounded-xl border border-amber-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <BarChart3 className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-gray-800">Results Display</span>
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="show_results_immediately"
                        checked={formData.show_results_immediately}
                        onChange={handleChange}
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm text-gray-700">Show results immediately after submission</span>
                    </label>

                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="show_correct_answers"
                        checked={formData.show_correct_answers}
                        onChange={handleChange}
                        className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      <span className="text-sm text-gray-700">Show correct answers after submission</span>
                    </label>
                  </div>
                </div>

                {/* Assessment Type for Marks Recording */}
                <div className="bg-green-50 p-5 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <BookOpen className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-gray-800">Marks Recording (Optional)</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Assessment Type
                    </label>
                    <select
                      name="assessment_type"
                      value={formData.assessment_type}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                    >
                      <option value="">None (No auto-recording to marks)</option>
                      <option value="FA">Formative Assessment (FA) - Multiple allowed per subject</option>
                      <option value="IA">Integrated Assessment (IA) - Multiple allowed per subject</option>
                      <option value="CA">Comprehensive Assessment (CA) - Single score per subject</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      If set, exam scores will automatically be recorded to student marks when graded.
                      Make sure to set the subject for this to work correctly.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Security Settings */}
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-4">Security Settings</h2>

                {/* Access Password */}
                <div className="bg-red-50 p-5 rounded-xl border border-red-200">
                  <div className="flex items-center space-x-3 mb-4">
                    <Shield className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-gray-800">Access Password (Optional)</span>
                  </div>

                  <input
                    type="text"
                    name="access_password"
                    value={formData.access_password}
                    onChange={handleChange}
                    placeholder="Leave empty for no password"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Students must enter this password to start the exam.
                  </p>
                </div>

                {/* Tab Switch Detection */}
                <div className="bg-orange-50 p-5 rounded-xl border border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="font-medium text-gray-800">Tab Switch Detection</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="detect_tab_switch"
                        checked={formData.detect_tab_switch}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-orange-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                    </label>
                  </div>

                  <AnimatePresence>
                    {formData.detect_tab_switch && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Maximum Tab Switches Allowed
                        </label>
                        <input
                          type="number"
                          name="max_tab_switches"
                          value={formData.max_tab_switches}
                          onChange={handleChange}
                          min="1"
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Exam will auto-submit if student exceeds this limit.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Public Access Settings */}
                <div className="bg-purple-50 p-5 rounded-xl border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Globe className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-gray-800">Public Access (Non-Students)</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_public"
                        checked={formData.is_public}
                        onChange={handleChange}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                    </label>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Enable this to allow anyone with the link to take this exam without logging in.
                  </p>

                  <AnimatePresence>
                    {formData.is_public && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4"
                      >
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                          <div>
                            <p className="font-medium text-gray-800 text-sm">Require Participant Info</p>
                            <p className="text-xs text-gray-500">Ask for name, email, phone before starting</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="require_participant_info"
                              checked={formData.require_participant_info}
                              onChange={handleChange}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-500"></div>
                          </label>
                        </div>

                        <div className="bg-white rounded-lg border border-purple-200 p-3">
                          <p className="text-xs text-purple-700">
                            <strong>Note:</strong> After publishing, use the share link button to get the public URL.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-4">Exam Summary</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Title:</span>
                      <p className="font-medium text-gray-900">{formData.title || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Mode:</span>
                      <p className="font-medium text-gray-900 capitalize">{formData.exam_mode}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Time Limit:</span>
                      <p className="font-medium text-gray-900">
                        {formData.has_time_limit ? `${formData.time_limit_minutes} minutes` : 'No limit'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Pass Score:</span>
                      <p className="font-medium text-gray-900">{formData.pass_percentage}%</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                  currentStep === 1
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <ArrowLeft size={18} />
                Previous
              </motion.button>

              <span className="text-sm text-gray-500">
                Step {currentStep} of {totalSteps}
              </span>

              {currentStep < totalSteps ? (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  onClick={nextStep}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium"
                >
                  Next
                  <ArrowRight size={18} />
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  disabled={submitting}
                  onClick={handleSubmit} 
                  className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      {isEditing ? 'Save & Continue' : 'Create & Add Questions'}
                    </>
                  )}
                </motion.button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {operationStatus && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className={`flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg text-sm ${
              operationStatus.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {operationStatus.type === 'success'
                ? <CheckCircle className="w-5 h-5 text-green-600" />
                : <XCircle className="w-5 h-5 text-red-600" />
              }
              <span className="font-medium">{operationStatus.message}</span>
              <motion.button whileHover={{ scale: 1.1 }} onClick={() => setOperationStatus(null)}>
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamCreator;
