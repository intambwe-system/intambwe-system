import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText, ArrowLeft, Plus, Edit, Trash2, Save, X, Check,
  GripVertical, ChevronUp, ChevronDown, AlertTriangle, BookOpen,
  CheckCircle, XCircle, Loader2, ListChecks, ToggleLeft, Type,
  AlignLeft, FileQuestion, HelpCircle, Eye, Copy, Layers, Upload, Image, ImagePlus
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import * as examService from '../../../services/examService';
import QuestionImporter from '../../../components/exam/QuestionImporter';

const QUESTION_TYPES = [
  { value: 'multiple_choice_single', label: 'Multiple Choice (Single)', icon: ListChecks, color: 'blue' },
  { value: 'multiple_choice_multiple', label: 'Multiple Choice (Multiple)', icon: CheckCircle, color: 'indigo' },
  { value: 'true_false', label: 'True / False', icon: ToggleLeft, color: 'green' },
  { value: 'fill_in_blank', label: 'Fill in the Blank', icon: Type, color: 'amber' },
  { value: 'short_answer', label: 'Short Answer', icon: AlignLeft, color: 'purple' },
  { value: 'essay', label: 'Essay', icon: FileQuestion, color: 'pink' }
];

const getEmptyQuestion = () => ({
  id: Date.now() + Math.random(),
  question_text: '',
  question_type: 'multiple_choice_single',
  points: 1,
  difficulty: 'medium',
  explanation: '',
  case_sensitive: false,
  correct_answers: [],
  word_limit_min: '',
  word_limit_max: '',
  image_url: '',
  options: [
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false }
  ],
  isExpanded: true,
  isValid: false,
  errors: []
});

const QuestionEditor = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operationStatus, setOperationStatus] = useState(null);

  // Bulk add state
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkQuestions, setBulkQuestions] = useState([getEmptyQuestion()]);
  const [savingProgress, setSavingProgress] = useState({ current: 0, total: 0 });

  // Single edit state
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Import state
  const [showImporter, setShowImporter] = useState(false);

  // Image upload state
  const [uploadingImageFor, setUploadingImageFor] = useState(null); // Tracks which question ID is uploading
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, [examId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [examRes, questionsRes] = await Promise.all([
        examService.getExamById(examId),
        examService.getExamQuestions(examId)
      ]);

      setExam(examRes.data || examRes);
      const q = questionsRes.data || questionsRes || [];
      setQuestions(Array.isArray(q) ? q : []);
    } catch (err) {
      showToast('error', err.message || 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message, duration = 4000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  // ============== BULK ADD FUNCTIONS ==============

  const handleStartBulkAdd = () => {
    setBulkQuestions([getEmptyQuestion()]);
    setShowBulkAdd(true);
  };

  const handleAddMoreQuestions = (count = 1) => {
    const newQuestions = Array.from({ length: count }, () => getEmptyQuestion());
    setBulkQuestions(prev => [...prev, ...newQuestions]);
  };

  const handleRemoveBulkQuestion = (id) => {
    if (bulkQuestions.length <= 1) return;
    setBulkQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleBulkQuestionChange = (id, field, value) => {
    setBulkQuestions(prev => prev.map(q => {
      if (q.id !== id) return q;

      const updated = { ...q, [field]: value };

      // Handle question type change
      if (field === 'question_type') {
        if (value === 'true_false') {
          updated.options = [
            { option_text: 'True', is_correct: true },
            { option_text: 'False', is_correct: false }
          ];
        } else if (!['multiple_choice_single', 'multiple_choice_multiple'].includes(value)) {
          updated.options = [];
        } else if (q.options.length === 0) {
          updated.options = [
            { option_text: '', is_correct: false },
            { option_text: '', is_correct: false }
          ];
        }
      }

      return updated;
    }));
  };

  const handleBulkOptionChange = (questionId, optionIndex, field, value) => {
    setBulkQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;

      const newOptions = [...q.options];
      newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };

      // For single choice, uncheck others
      if (field === 'is_correct' && value && q.question_type === 'multiple_choice_single') {
        newOptions.forEach((opt, i) => {
          if (i !== optionIndex) opt.is_correct = false;
        });
      }

      return { ...q, options: newOptions };
    }));
  };

  const handleAddBulkOption = (questionId) => {
    setBulkQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      return { ...q, options: [...q.options, { option_text: '', is_correct: false }] };
    }));
  };

  const handleRemoveBulkOption = (questionId, optionIndex) => {
    setBulkQuestions(prev => prev.map(q => {
      if (q.id !== questionId) return q;
      if (q.options.length <= 2) return q;
      return { ...q, options: q.options.filter((_, i) => i !== optionIndex) };
    }));
  };

  const toggleBulkQuestionExpand = (id) => {
    setBulkQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, isExpanded: !q.isExpanded } : q
    ));
  };

  // Image upload handler
  const handleImageUpload = async (file, questionId, isBulk = true) => {
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('error', 'Please upload a valid image (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast('error', 'Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImageFor(questionId);

      const result = await examService.uploadQuestionImage(file);

      if (isBulk) {
        handleBulkQuestionChange(questionId, 'image_url', result.url);
      } else {
        setEditFormData(prev => ({ ...prev, image_url: result.url }));
      }

      showToast('success', 'Image uploaded successfully');
    } catch (error) {
      showToast('error', error.message || 'Failed to upload image');
    } finally {
      setUploadingImageFor(null);
    }
  };

  const handleRemoveImage = (questionId, isBulk = true) => {
    if (isBulk) {
      handleBulkQuestionChange(questionId, 'image_url', '');
    } else {
      setEditFormData(prev => ({ ...prev, image_url: '' }));
    }
  };

  // Handle paste event for images
  const handlePaste = (e, questionId, isBulk = true) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleImageUpload(file, questionId, isBulk);
        }
        break;
      }
    }
  };

  const handleCorrectAnswersChange = (questionId, value) => {
    const answers = value.split('\n').filter(a => a.trim());
    handleBulkQuestionChange(questionId, 'correct_answers', answers);
  };

  const validateBulkQuestion = (question) => {
    const errors = [];

    if (!question.question_text.trim()) {
      errors.push('Question text is required');
    }

    const needsOptions = ['multiple_choice_single', 'multiple_choice_multiple'].includes(question.question_type);
    if (needsOptions) {
      const validOptions = question.options.filter(o => o.option_text.trim());
      if (validOptions.length < 2) {
        errors.push('At least 2 options are required');
      }
      const hasCorrect = question.options.some(o => o.is_correct && o.option_text.trim());
      if (!hasCorrect) {
        errors.push('Select at least one correct answer');
      }
    }

    if (question.question_type === 'fill_in_blank' && question.correct_answers.length === 0) {
      errors.push('At least one correct answer is required');
    }

    return errors;
  };

  const getValidBulkQuestions = () => {
    return bulkQuestions.filter(q => validateBulkQuestion(q).length === 0);
  };

  const handleSaveAllQuestions = async () => {
    const validQuestions = getValidBulkQuestions();

    if (validQuestions.length === 0) {
      showToast('error', 'No valid questions to save. Please check all required fields.');
      return;
    }

    // Check if adding these questions would exceed the exam's total_points limit
    if (exam?.total_points) {
      const newQuestionsPoints = getBulkTotalPoints(validQuestions);
      const remainingPoints = getRemainingPoints();

      if (newQuestionsPoints > remainingPoints) {
        showToast('error',
          `Cannot add questions. Total points (${(getCurrentTotalPoints() + newQuestionsPoints).toFixed(2)}) would exceed exam limit (${parseFloat(exam.total_points).toFixed(2)}). Available: ${remainingPoints.toFixed(2)} points.`
        );
        return;
      }
    }

    try {
      setSaving(true);
      setSavingProgress({ current: 0, total: validQuestions.length });

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < validQuestions.length; i++) {
        const q = validQuestions[i];

        try {
          const needsOptions = ['multiple_choice_single', 'multiple_choice_multiple'].includes(q.question_type);
          const requiresManualGrading = ['essay', 'short_answer'].includes(q.question_type);

          const payload = {
            question_text: q.question_text,
            question_type: q.question_type,
            points: parseFloat(q.points) || 1,
            difficulty: q.difficulty,
            explanation: q.explanation || null,
            requires_manual_grading: requiresManualGrading,
            case_sensitive: q.question_type === 'fill_in_blank' ? q.case_sensitive : false,
            correct_answers: q.question_type === 'fill_in_blank' ? q.correct_answers : null,
            word_limit_min: ['essay', 'short_answer'].includes(q.question_type)
              ? parseInt(q.word_limit_min) || null : null,
            word_limit_max: ['essay', 'short_answer'].includes(q.question_type)
              ? parseInt(q.word_limit_max) || null : null,
            image_url: q.image_url || null
          };

          // Handle options
          let options = [];
          if (q.question_type === 'true_false') {
            const trueOption = q.options.find(o => o.option_text === 'True');
            options = [
              { option_text: 'True', is_correct: trueOption?.is_correct || false },
              { option_text: 'False', is_correct: !trueOption?.is_correct }
            ];
          } else if (needsOptions) {
            options = q.options
              .filter(o => o.option_text.trim())
              .map((o, idx) => ({
                option_text: o.option_text,
                is_correct: o.is_correct,
                option_order: idx
              }));
          }

          if (needsOptions || q.question_type === 'true_false') {
            payload.options = options;
          }

          await examService.addQuestion(examId, payload);
          successCount++;
        } catch (err) {
          failCount++;
          console.error(`Failed to save question ${i + 1}:`, err);
        }

        setSavingProgress({ current: i + 1, total: validQuestions.length });
      }

      if (failCount === 0) {
        showToast('success', `Successfully added ${successCount} question${successCount !== 1 ? 's' : ''}`);
        setShowBulkAdd(false);
        setBulkQuestions([getEmptyQuestion()]);
      } else {
        showToast('error', `Added ${successCount} questions, ${failCount} failed`);
      }

      await loadData();
    } catch (err) {
      showToast('error', err.message || 'Failed to save questions');
    } finally {
      setSaving(false);
      setSavingProgress({ current: 0, total: 0 });
    }
  };

  // ============== IMPORT FUNCTIONS ==============

  const handleImportQuestions = async (importedQuestions) => {
    // Convert imported questions to the format expected by handleSaveAllQuestions
    const questionsToSave = importedQuestions.map(q => ({
      id: Date.now() + Math.random(),
      question_text: q.question_text,
      question_type: q.question_type,
      points: q.points,
      difficulty: q.difficulty,
      explanation: q.explanation || '',
      case_sensitive: q.case_sensitive || false,
      correct_answers: q.correct_answers || [],
      word_limit_min: q.word_limit_min || '',
      word_limit_max: q.word_limit_max || '',
      options: q.options || [],
      isExpanded: false,
      isValid: true,
      errors: []
    }));

    // Close importer
    setShowImporter(false);

    // Save the questions directly
    try {
      setSaving(true);
      setSavingProgress({ current: 0, total: questionsToSave.length });

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < questionsToSave.length; i++) {
        const q = questionsToSave[i];

        try {
          const needsOptions = ['multiple_choice_single', 'multiple_choice_multiple'].includes(q.question_type);
          const requiresManualGrading = ['essay', 'short_answer'].includes(q.question_type);

          const payload = {
            question_text: q.question_text,
            question_type: q.question_type,
            points: parseFloat(q.points) || 1,
            difficulty: q.difficulty,
            explanation: q.explanation || null,
            requires_manual_grading: requiresManualGrading,
            case_sensitive: q.question_type === 'fill_in_blank' ? q.case_sensitive : false,
            correct_answers: q.question_type === 'fill_in_blank' ? q.correct_answers : null,
            word_limit_min: ['essay', 'short_answer'].includes(q.question_type)
              ? parseInt(q.word_limit_min) || null : null,
            word_limit_max: ['essay', 'short_answer'].includes(q.question_type)
              ? parseInt(q.word_limit_max) || null : null,
            image_url: q.image_url || null
          };

          // Handle options
          let options = [];
          if (q.question_type === 'true_false') {
            const trueOption = q.options.find(o => o.option_text === 'True');
            options = [
              { option_text: 'True', is_correct: trueOption?.is_correct || false },
              { option_text: 'False', is_correct: !trueOption?.is_correct }
            ];
          } else if (needsOptions) {
            options = q.options
              .filter(o => o.option_text?.trim())
              .map((o, idx) => ({
                option_text: o.option_text,
                is_correct: o.is_correct,
                option_order: idx
              }));
          }

          if (needsOptions || q.question_type === 'true_false') {
            payload.options = options;
          }

          await examService.addQuestion(examId, payload);
          successCount++;
        } catch (err) {
          failCount++;
          console.error(`Failed to save imported question ${i + 1}:`, err);
        }

        setSavingProgress({ current: i + 1, total: questionsToSave.length });
      }

      if (failCount === 0) {
        showToast('success', `Successfully imported ${successCount} question${successCount !== 1 ? 's' : ''}`);
      } else {
        showToast('error', `Imported ${successCount} questions, ${failCount} failed`);
      }

      await loadData();
    } catch (err) {
      showToast('error', err.message || 'Failed to import questions');
    } finally {
      setSaving(false);
      setSavingProgress({ current: 0, total: 0 });
    }
  };

  // ============== SINGLE EDIT FUNCTIONS ==============

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setEditFormData({
      question_text: question.question_text || '',
      question_type: question.question_type || 'multiple_choice_single',
      points: question.points || 1,
      difficulty: question.difficulty || 'medium',
      explanation: question.explanation || '',
      case_sensitive: question.case_sensitive || false,
      correct_answers: question.correct_answers || [],
      word_limit_min: question.word_limit_min || '',
      word_limit_max: question.word_limit_max || '',
      image_url: question.image_url || '',
      options: question.AnswerOptions?.length > 0
        ? question.AnswerOptions.map(o => ({
          option_id: o.option_id,
          option_text: o.option_text,
          is_correct: o.is_correct
        }))
        : [{ option_text: '', is_correct: false }, { option_text: '', is_correct: false }]
    });
    setShowEditForm(true);
  };

  const handleUpdateQuestion = async () => {
    if (!editFormData.question_text.trim()) {
      showToast('error', 'Question text is required');
      return;
    }

    // Check if updating this question would exceed the exam's total_points limit
    const newPoints = parseFloat(editFormData.points) || 1;
    if (wouldExceedLimit(newPoints, editingQuestion.question_id)) {
      const remainingPoints = getRemainingPoints();
      const existingPoints = parseFloat(editingQuestion.points || 0);
      const maxAllowed = remainingPoints + existingPoints;
      showToast('error',
        `Cannot set ${newPoints} points. Maximum allowed for this question: ${maxAllowed.toFixed(2)} points (exam limit: ${parseFloat(exam.total_points).toFixed(2)})`
      );
      return;
    }

    try {
      setSaving(true);

      const needsOptions = ['multiple_choice_single', 'multiple_choice_multiple'].includes(editFormData.question_type);
      const requiresManualGrading = ['essay', 'short_answer'].includes(editFormData.question_type);

      const payload = {
        question_text: editFormData.question_text,
        question_type: editFormData.question_type,
        points: parseFloat(editFormData.points) || 1,
        difficulty: editFormData.difficulty,
        explanation: editFormData.explanation || null,
        requires_manual_grading: requiresManualGrading,
        case_sensitive: editFormData.question_type === 'fill_in_blank' ? editFormData.case_sensitive : false,
        correct_answers: editFormData.question_type === 'fill_in_blank' ? editFormData.correct_answers : null,
        word_limit_min: ['essay', 'short_answer'].includes(editFormData.question_type)
          ? parseInt(editFormData.word_limit_min) || null : null,
        word_limit_max: ['essay', 'short_answer'].includes(editFormData.question_type)
          ? parseInt(editFormData.word_limit_max) || null : null,
        image_url: editFormData.image_url || null
      };

      // Handle options
      if (editFormData.question_type === 'true_false') {
        payload.options = [
          { option_text: 'True', is_correct: editFormData.options[0]?.is_correct || false },
          { option_text: 'False', is_correct: !editFormData.options[0]?.is_correct }
        ];
      } else if (needsOptions) {
        payload.options = editFormData.options
          .filter(o => o.option_text.trim())
          .map((o, idx) => ({
            ...(o.option_id ? { option_id: o.option_id } : {}),
            option_text: o.option_text,
            is_correct: o.is_correct,
            option_order: idx
          }));
      }

      await examService.updateQuestion(examId, editingQuestion.question_id, payload);
      showToast('success', 'Question updated successfully');
      setShowEditForm(false);
      setEditingQuestion(null);
      await loadData();
    } catch (err) {
      showToast('error', err.message || 'Failed to update question');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (question) => {
    try {
      setSaving(true);
      await examService.deleteQuestion(examId, question.question_id);
      await loadData();
      setDeleteConfirm(null);
      showToast('success', 'Question deleted successfully');
    } catch (err) {
      showToast('error', err.message || 'Failed to delete question');
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = async (newOrder) => {
    setQuestions(newOrder);
    try {
      const questionIds = newOrder.map(q => q.question_id);
      await examService.reorderQuestions(examId, questionIds);
    } catch (err) {
      showToast('error', 'Failed to reorder questions');
      await loadData();
    }
  };

  const getTypeInfo = (type) => {
    return QUESTION_TYPES.find(t => t.value === type) || QUESTION_TYPES[0];
  };

  // Calculate total points from existing questions
  const getCurrentTotalPoints = () => {
    return questions.reduce((sum, q) => sum + parseFloat(q.points || 0), 0);
  };

  // Calculate total points from bulk questions being added
  const getBulkTotalPoints = (questionsList) => {
    return questionsList.reduce((sum, q) => sum + parseFloat(q.points || 0), 0);
  };

  // Check if adding new points would exceed the limit
  const wouldExceedLimit = (newPoints, excludeQuestionId = null) => {
    if (!exam?.total_points) return false;
    const maxPoints = parseFloat(exam.total_points);
    let currentPoints = getCurrentTotalPoints();

    // If updating a question, subtract its current points
    if (excludeQuestionId) {
      const existingQuestion = questions.find(q => q.question_id === excludeQuestionId);
      if (existingQuestion) {
        currentPoints -= parseFloat(existingQuestion.points || 0);
      }
    }

    return (currentPoints + newPoints) > maxPoints;
  };

  // Get remaining available points
  const getRemainingPoints = () => {
    if (!exam?.total_points) return null;
    const maxPoints = parseFloat(exam.total_points);
    const currentPoints = getCurrentTotalPoints();
    return Math.max(0, maxPoints - currentPoints);
  };

  const getDifficultyBadge = (difficulty) => {
    const badges = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-amber-100 text-amber-800',
      hard: 'bg-red-100 text-red-800'
    };
    return badges[difficulty] || badges.medium;
  };

  // ============== RENDER COMPONENTS ==============

  const renderQuestionForm = (question, isBulk = true) => {
    const data = isBulk ? question : editFormData;
    const handleChange = isBulk
      ? (field, value) => handleBulkQuestionChange(question.id, field, value)
      : (field, value) => setEditFormData(prev => ({ ...prev, [field]: value }));
    const handleOptChange = isBulk
      ? (idx, field, value) => handleBulkOptionChange(question.id, idx, field, value)
      : (idx, field, value) => {
          setEditFormData(prev => {
            const newOptions = [...prev.options];
            newOptions[idx] = { ...newOptions[idx], [field]: value };
            if (field === 'is_correct' && value && prev.question_type === 'multiple_choice_single') {
              newOptions.forEach((opt, i) => { if (i !== idx) opt.is_correct = false; });
            }
            return { ...prev, options: newOptions };
          });
        };

    return (
      <div className="space-y-5">
        {/* Question Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {QUESTION_TYPES.map(type => {
              const Icon = type.icon;
              const isSelected = data.question_type === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleChange('question_type', type.value)}
                  className={`flex items-center space-x-2 p-2.5 rounded-lg border-2 transition-all text-sm ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-primary-600' : 'text-gray-500'}`} />
                  <span className="font-medium truncate">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Question Text *</label>
          <textarea
            value={data.question_text}
            onChange={(e) => handleChange('question_text', e.target.value)}
            rows={3}
            placeholder="Enter your question here..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Question Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center space-x-2">
              <Image className="w-4 h-4" />
              <span>Question Image (Optional)</span>
            </div>
          </label>

          {data.image_url ? (
            // Image preview when uploaded - also supports paste to replace
            <div
              className="relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50"
              tabIndex={0}
              onPaste={(e) => handlePaste(e, isBulk ? question.id : 'edit', isBulk)}>
              <img
                src={data.image_url}
                alt="Question preview"
                className="max-w-full h-auto max-h-48 mx-auto"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'flex';
                }}
              />
              <div className="hidden items-center justify-center h-32 bg-gray-100">
                <p className="text-red-500 text-sm">Failed to load image</p>
              </div>
              <div className="absolute top-2 right-2 flex space-x-2">
                <label className="p-2 bg-white rounded-full shadow-md cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) handleImageUpload(file, isBulk ? question.id : 'edit', isBulk);
                      e.target.value = '';
                    }}
                    disabled={uploadingImageFor === (isBulk ? question.id : 'edit')}
                  />
                  {uploadingImageFor === (isBulk ? question.id : 'edit') ? (
                    <Loader2 className="w-4 h-4 text-primary-600 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 text-gray-600" />
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(isBulk ? question.id : 'edit', isBulk)}
                  className="p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors"
                >
                  <X className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ) : (
            // Upload area when no image - supports click, drag & drop, and paste
            <div
              tabIndex={0}
              onPaste={(e) => handlePaste(e, isBulk ? question.id : 'edit', isBulk)}
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary-400', 'bg-primary-50'); }}
              onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary-400', 'bg-primary-50'); }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-primary-400', 'bg-primary-50');
                const file = e.dataTransfer.files[0];
                if (file && file.type.startsWith('image/')) {
                  handleImageUpload(file, isBulk ? question.id : 'edit', isBulk);
                }
              }}
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors outline-none focus:ring-2 focus:ring-primary-500 ${
                uploadingImageFor === (isBulk ? question.id : 'edit')
                  ? 'border-primary-400 bg-primary-50'
                  : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
              }`}
              onClick={() => document.getElementById(`image-input-${isBulk ? question.id : 'edit'}`).click()}
            >
              <input
                id={`image-input-${isBulk ? question.id : 'edit'}`}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) handleImageUpload(file, isBulk ? question.id : 'edit', isBulk);
                  e.target.value = '';
                }}
                disabled={uploadingImageFor === (isBulk ? question.id : 'edit')}
              />
              {uploadingImageFor === (isBulk ? question.id : 'edit') ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-2" />
                  <p className="text-sm text-primary-600">Uploading...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <ImagePlus className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    <span className="text-primary-600 font-medium">Click to upload</span>, drag & drop, or <span className="text-primary-600 font-medium">paste</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WebP (max 5MB)</p>
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Add an image to accompany this question (diagrams, charts, photos, etc.)
          </p>
        </div>

        {/* Points & Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
            <input
              type="number"
              value={data.points}
              onChange={(e) => handleChange('points', e.target.value)}
              min="0.5"
              step="0.5"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
            <select
              value={data.difficulty}
              onChange={(e) => handleChange('difficulty', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>

        {/* MCQ Options */}
        {['multiple_choice_single', 'multiple_choice_multiple'].includes(data.question_type) && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Answer Options *
              <span className="text-gray-500 font-normal ml-2">
                ({data.question_type === 'multiple_choice_single' ? 'Select one' : 'Select all that apply'})
              </span>
            </label>
            {data.options.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <input
                  type={data.question_type === 'multiple_choice_single' ? 'radio' : 'checkbox'}
                  checked={option.is_correct}
                  onChange={(e) => handleOptChange(idx, 'is_correct', e.target.checked)}
                  className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                />
                <input
                  type="text"
                  value={option.option_text}
                  onChange={(e) => handleOptChange(idx, 'option_text', e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                {data.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => isBulk ? handleRemoveBulkOption(question.id, idx) : setEditFormData(prev => ({
                      ...prev,
                      options: prev.options.filter((_, i) => i !== idx)
                    }))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => isBulk ? handleAddBulkOption(question.id) : setEditFormData(prev => ({
                ...prev,
                options: [...prev.options, { option_text: '', is_correct: false }]
              }))}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add Option</span>
            </button>
          </div>
        )}

        {/* True/False */}
        {data.question_type === 'true_false' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Correct Answer *</label>
            <div className="flex space-x-4">
              {['True', 'False'].map((val) => (
                <label key={val} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={data.options[0]?.is_correct === (val === 'True')}
                    onChange={() => handleChange('options', [
                      { option_text: 'True', is_correct: val === 'True' },
                      { option_text: 'False', is_correct: val === 'False' }
                    ])}
                    className="w-5 h-5 text-primary-600 focus:ring-primary-500"
                  />
                  <span className={`font-medium ${val === 'True' ? 'text-green-700' : 'text-red-700'}`}>
                    {val}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Fill in Blank */}
        {data.question_type === 'fill_in_blank' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Accepted Answers * (one per line)
              </label>
              <textarea
                value={data.correct_answers.join('\n')}
                onChange={(e) => isBulk
                  ? handleCorrectAnswersChange(question.id, e.target.value)
                  : setEditFormData(prev => ({ ...prev, correct_answers: e.target.value.split('\n').filter(a => a.trim()) }))
                }
                rows={4}
                placeholder="Enter accepted answers, one per line"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              />
            </div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.case_sensitive}
                onChange={(e) => handleChange('case_sensitive', e.target.checked)}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Case sensitive matching</span>
            </label>
          </div>
        )}

        {/* Essay/Short Answer */}
        {['essay', 'short_answer'].includes(data.question_type) && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Words</label>
                <input
                  type="number"
                  value={data.word_limit_min}
                  onChange={(e) => handleChange('word_limit_min', e.target.value)}
                  min="0"
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Words</label>
                <input
                  type="number"
                  value={data.word_limit_max}
                  onChange={(e) => handleChange('word_limit_max', e.target.value)}
                  min="0"
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-center">
              <HelpCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              This question requires manual grading
            </div>
          </div>
        )}

        {/* Explanation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Explanation (shown after grading)
          </label>
          <textarea
            value={data.explanation}
            onChange={(e) => handleChange('explanation', e.target.value)}
            rows={2}
            placeholder="Explain why the correct answer is correct..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 shadow-xl flex items-center space-x-3">
          <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          <span className="text-gray-700">Loading questions...</span>
        </div>
      </div>
    );
  }

  const validBulkCount = getValidBulkQuestions().length;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 bg-white shadow-md z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/employee/dashboard/exams')}
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-full"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {exam?.title || 'Exam'} - Questions
                </h1>
                <p className="text-sm text-gray-500">
                  {questions.length} question{questions.length !== 1 ? 's' : ''} •
                  Total: {questions.reduce((sum, q) => sum + parseFloat(q.points || 0), 0).toFixed(2)} points
                  {exam?.total_points ? ` / ${parseFloat(exam.total_points).toFixed(2)} max` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate(`/employee/dashboard/exams/${examId}/edit`)}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" />
                <span className="text-sm">Edit Exam</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowImporter(true)}
                className="flex items-center space-x-2 px-4 py-2 text-primary-600 border border-primary-300 rounded hover:bg-primary-50"
              >
                <Upload className="w-4 h-4" />
                <span className="text-sm">Import</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleStartBulkAdd}
                className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium shadow-md"
              >
                <Layers className="w-4 h-4" />
                <span className="text-sm">Add Questions</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className=" mx-auto">
          {/* Bulk Add Mode */}
          <AnimatePresence>
            {showBulkAdd && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                {/* Bulk Add Header */}
                <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-t-xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Layers className="w-6 h-6" />
                      <div>
                        <h2 className="text-lg font-semibold">Add Multiple Questions</h2>
                        <p className="text-primary-200 text-sm">
                          {bulkQuestions.length} question{bulkQuestions.length !== 1 ? 's' : ''} •
                          {validBulkCount} ready to save •
                          New points: {getBulkTotalPoints(getValidBulkQuestions()).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBulkAdd(false)}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Points Limit Warning */}
                  {exam?.total_points && (
                    <div className={`mt-3 p-2 rounded-lg text-sm ${
                      getBulkTotalPoints(getValidBulkQuestions()) > getRemainingPoints()
                        ? 'bg-red-500/30 text-red-100'
                        : 'bg-white/10'
                    }`}>
                      {getBulkTotalPoints(getValidBulkQuestions()) > getRemainingPoints() ? (
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span>
                            Exceeds limit! Current: {getCurrentTotalPoints().toFixed(2)} + New: {getBulkTotalPoints(getValidBulkQuestions()).toFixed(2)} = {(getCurrentTotalPoints() + getBulkTotalPoints(getValidBulkQuestions())).toFixed(2)} / {parseFloat(exam.total_points).toFixed(2)} max
                          </span>
                        </div>
                      ) : (
                        <span>
                          Available: {getRemainingPoints().toFixed(2)} points remaining (max: {parseFloat(exam.total_points).toFixed(2)})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Questions List */}
                <div className="bg-white border-x border-gray-200 divide-y divide-gray-100  ">
                  {bulkQuestions.map((question, index) => {
                    const errors = validateBulkQuestion(question);
                    const isValid = errors.length === 0 && question.question_text.trim();
                    const typeInfo = getTypeInfo(question.question_type);
                    const TypeIcon = typeInfo.icon;

                    return (
                      <div key={question.id} className={`${!question.isExpanded ? 'bg-gray-50' : ''}`}>
                        {/* Question Header */}
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleBulkQuestionExpand(question.id)}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                              isValid
                                ? 'bg-green-100 text-green-700'
                                : question.question_text.trim()
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-500'
                            }`}>
                              {isValid ? <Check className="w-4 h-4" /> : index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-medium text-gray-900 truncate max-w-md">
                                  {question.question_text || `Question ${index + 1}`}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                  <TypeIcon className="w-3 h-3 mr-1" />
                                  {typeInfo.label}
                                </span>
                              </div>
                              {errors.length > 0 && !question.isExpanded && (
                                <p className="text-xs text-red-500 mt-0.5">{errors[0]}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {bulkQuestions.length > 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveBulkQuestion(question.id);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            {question.isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Question Form */}
                        <AnimatePresence>
                          {question.isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4">
                                {renderQuestionForm(question, true)}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Bulk Add Footer */}
                <div className="bg-gray-50 border border-t-0 border-gray-200 rounded-b-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleAddMoreQuestions(1)}
                        className="flex items-center space-x-2 px-4 py-2 text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 font-medium text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Question</span>
                      </button>
                      <button
                        onClick={() => handleAddMoreQuestions(5)}
                        className="flex items-center space-x-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add 5 More</span>
                      </button>
                    </div>

                    <div className="flex items-center space-x-3">
                      {saving && savingProgress.total > 0 && (
                        <div className="text-sm text-gray-500">
                          Saving {savingProgress.current}/{savingProgress.total}...
                        </div>
                      )}
                      <button
                        onClick={() => setShowBulkAdd(false)}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveAllQuestions}
                        disabled={saving || validBulkCount === 0}
                        className="flex items-center space-x-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save {validBulkCount} Question{validBulkCount !== 1 ? 's' : ''}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit Single Question Modal */}
          <AnimatePresence>
            {showEditForm && editFormData && (
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
                  className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8"
                >
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Edit Question</h2>
                    <button
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingQuestion(null);
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {renderQuestionForm(editingQuestion, false)}
                  </div>
                  <div className="flex justify-end space-x-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingQuestion(null);
                      }}
                      className="px-5 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateQuestion}
                      disabled={saving}
                      className="flex items-center space-x-2 px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          <span>Update Question</span>
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Questions List */}
          {!showBulkAdd && (
            <>
              {questions.length === 0 ? (
                <div className="bg-white rounded-xl shadow border border-gray-200 p-12 text-center">
                  <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questions Yet</h3>
                  <p className="text-gray-500 mb-4">Add questions to your exam to get started.</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={handleStartBulkAdd}
                    className="inline-flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Add Questions</span>
                  </motion.button>
                </div>
              ) : (
                <Reorder.Group
                  axis="y"
                  values={questions}
                  onReorder={handleReorder}
                  className="space-y-4"
                >
                  {questions.map((question, index) => {
                    const typeInfo = getTypeInfo(question.question_type);
                    const TypeIcon = typeInfo.icon;

                    return (
                      <Reorder.Item
                        key={question.question_id}
                        value={question}
                        className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden cursor-grab active:cursor-grabbing"
                      >
                        <div className="p-4">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0 flex flex-col items-center space-y-2">
                              <div className="text-gray-400 hover:text-gray-600">
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                                {index + 1}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium bg-${typeInfo.color}-100 text-${typeInfo.color}-800`}>
                                  <TypeIcon className="w-3 h-3" />
                                  <span>{typeInfo.label}</span>
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyBadge(question.difficulty)}`}>
                                  {question.difficulty}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {question.points} pt{question.points !== 1 ? 's' : ''}
                                </span>
                              </div>

                              <p className="text-gray-900 font-medium mb-3">{question.question_text}</p>

                              {/* Show Options for MCQ */}
                              {['multiple_choice_single', 'multiple_choice_multiple', 'true_false'].includes(question.question_type) && (
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  {question.AnswerOptions?.map((opt, i) => (
                                    <div
                                      key={opt.option_id || i}
                                      className={`flex items-center space-x-2 px-3 py-2 rounded ${
                                        opt.is_correct ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-gray-50 text-gray-700'
                                      }`}
                                    >
                                      {opt.is_correct && <Check className="w-4 h-4 text-green-600" />}
                                      <span>{opt.option_text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Show Correct Answers for Fill in Blank */}
                              {question.question_type === 'fill_in_blank' && question.correct_answers?.length > 0 && (
                                <div className="text-sm">
                                  <span className="text-gray-500">Accepted: </span>
                                  <span className="text-green-700 font-mono">
                                    {question.correct_answers.join(', ')}
                                  </span>
                                </div>
                              )}

                              {/* Manual Grading Notice */}
                              {question.requires_manual_grading && (
                                <div className="text-xs text-amber-600 flex items-center space-x-1 mt-2">
                                  <HelpCircle className="w-3 h-3" />
                                  <span>Requires manual grading</span>
                                </div>
                              )}
                            </div>

                            <div className="flex-shrink-0 flex items-center space-x-1">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleEditQuestion(question)}
                                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-full"
                              >
                                <Edit className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => setDeleteConfirm(question)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Question</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                Are you sure you want to delete this question?
              </p>
              <div className="flex justify-end space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleDeleteQuestion(deleteConfirm)}
                  disabled={saving}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? 'Deleting...' : 'Delete'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
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

      {/* Question Importer Modal */}
      <AnimatePresence>
        {showImporter && (
          <QuestionImporter
            onImport={handleImportQuestions}
            onClose={() => setShowImporter(false)}
            maxPoints={exam?.total_points ? parseFloat(exam.total_points) : null}
            currentPoints={getCurrentTotalPoints()}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuestionEditor;
