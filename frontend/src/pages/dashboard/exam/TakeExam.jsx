import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import {
  Clock, AlertTriangle, ChevronLeft, ChevronRight, Flag, Check,
  Send, Shield, BookOpen, Play, Loader2, X, CheckCircle, XCircle,
  Eye, FileText, Timer, AlertCircle, Lock, Maximize, MonitorOff,
  RotateCcw, ClipboardList, Wifi, WifiOff, RefreshCw, ShieldCheck, Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import * as examService from '../../../services/examService';
import { useStudentAuth } from '../../../contexts/StudentAuthContext';
import api from '../../../api/api';
import WaitingApprovalScreen from '../../../components/exam/WaitingApprovalScreen';

// Simple hash function for client-side integrity check
const generateHash = async (data) => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const QUESTIONS_PER_PAGE = 3;
const TAB_SWITCH_WARNING_SECONDS = 4;
const MAX_TAB_SWITCHES_BEFORE_SUBMIT = 3; // Auto-submit after 3 violations

// Anti-screenshot CSS styles
const examSecurityStyles = `
  .exam-secure-container {
    user-select: none !important;
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
  }

  .exam-secure-container * {
    user-select: none !important;
    -webkit-user-select: none !important;
  }

  /* Allow text selection in input fields only */
  .exam-secure-container input,
  .exam-secure-container textarea {
    user-select: text !important;
    -webkit-user-select: text !important;
  }

  /* Prevent printing */
  @media print {
    .exam-secure-container {
      display: none !important;
    }
    body::after {
      content: "Printing is not allowed during examination.";
      display: block;
      font-size: 24px;
      padding: 50px;
      text-align: center;
    }
  }

  /* Make content harder to capture with some screen recorders */
  .exam-secure-container::before {
    content: "";
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 9999;
    background: transparent;
  }

  /* Blur effect when tab switched */
  .exam-content-blurred {
    filter: blur(30px) !important;
  }

  /* Ensure warning overlay is always clickable */
  .exam-warning-overlay {
    pointer-events: auto !important;
    filter: none !important;
  }
`;

const TakeExam = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { logout } = useStudentAuth();

  // Exam state
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());

  // UI state
  const [phase, setPhase] = useState('loading'); // loading, instructions, password, exam, submitted
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [returnPhase, setReturnPhase] = useState('instructions'); // where to go back after password
  const [operationStatus, setOperationStatus] = useState(null);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const timerRef = useRef(null);
  const timerEndTimeRef = useRef(null); // Store the actual end timestamp for accurate countdown

  // Anti-cheat state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [tabWarningCountdown, setTabWarningCountdown] = useState(TAB_SWITCH_WARNING_SECONDS);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [screenshotAttempts, setScreenshotAttempts] = useState(0);
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');
  const [isContentBlurred, setIsContentBlurred] = useState(false);
  const tabWarningTimerRef = useRef(null);
  const tabSwitchCountRef = useRef(0);

  // Offline submission handling with SEALING mechanism
  const [isOnline, setIsOnline] = useState(true); // Assume online, verify with health check
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [submissionRetryCount, setSubmissionRetryCount] = useState(0);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);
  const submissionRetryRef = useRef(null);
  const networkCheckRef = useRef(null);
  const MAX_SUBMISSION_RETRIES = 10;
  const NETWORK_CHECK_INTERVAL = 5000; // 5 seconds

  // SEALING state - once sealed, answers are LOCKED
  const [isSealed, setIsSealed] = useState(false);
  const [sealedData, setSealedData] = useState(null);
  const [sealStatus, setSealStatus] = useState(''); // 'sealing', 'sealed', 'submitting', 'submitted'

  // Timer persistence state
  const TIMER_PERSIST_INTERVAL = 30000; // Save timer every 30 seconds
  const timerPersistRef = useRef(null);

  // Resume request state (for teacher approval flow)
  const [resumeRequest, setResumeRequest] = useState(null);
  const [resumeRequestStatus, setResumeRequestStatus] = useState(null); // 'pending', 'approved', 'declined', 'expired'
  const [checkingSealed, setCheckingSealed] = useState(false);

  // Block in-app navigation while the exam is active (back button, programmatic navigate, etc.)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      phase === 'exam' && currentLocation.pathname !== nextLocation.pathname
  );

  // LocalStorage key for this exam attempt
  const getStorageKey = () => `exam_responses_${examId}_${attempt?.attempt_id || 'temp'}`;

  // Load exam info
  useEffect(() => {
    loadExamInfo();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timerPersistRef.current) clearInterval(timerPersistRef.current);
    };
  }, [examId]);

  // Timer persistence - save remaining time to localStorage every 30 seconds
  useEffect(() => {
    if (phase !== 'exam' || !timeRemaining || !examId || !attempt?.attempt_id) return;

    const persistTimer = () => {
      const key = `exam_timer_student_${examId}`;
      localStorage.setItem(key, JSON.stringify({
        timeRemaining,
        savedAt: Date.now(),
        attemptId: attempt.attempt_id
      }));
    };

    // Save immediately when entering exam
    persistTimer();

    // Then save every 30 seconds
    timerPersistRef.current = setInterval(persistTimer, TIMER_PERSIST_INTERVAL);

    return () => {
      if (timerPersistRef.current) {
        clearInterval(timerPersistRef.current);
      }
    };
  }, [phase, timeRemaining, examId, attempt?.attempt_id]);

  // Check for sealed exams on dashboard login (called from StudentDashboard)
  const checkForSealedExams = useCallback(async () => {
    try {
      setCheckingSealed(true);
      const result = await examService.checkSealedExams();

      if (result.sealed_attempts && result.sealed_attempts.length > 0) {
        // Found sealed exam - auto-submit it
        const sealedAttempt = result.sealed_attempts[0];

        try {
          await examService.autoSubmitSealedExam(sealedAttempt.attempt_id);
          showToast('success', 'Your previously sealed exam has been submitted.');
          // Reload exam info to get fresh state
          loadExamInfo();
        } catch (submitErr) {
          console.error('Failed to auto-submit sealed exam:', submitErr);
        }
      }

      return result;
    } catch (err) {
      console.error('Error checking sealed exams:', err);
      return { sealed_attempts: [], in_progress_attempts: [] };
    } finally {
      setCheckingSealed(false);
    }
  }, []);

  // Handle resume request callbacks
  const handleResumeApproved = useCallback((data) => {
    setResumeRequestStatus('approved');
    showToast('success', 'Your resume request was approved!');

    // Restore timer from localStorage if available
    const timerKey = `exam_timer_student_${examId}`;
    const savedTimer = localStorage.getItem(timerKey);

    setTimeout(() => {
      // Start the exam with restored time
      if (data.time_remaining_seconds) {
        setTimeRemaining(data.time_remaining_seconds);
      } else if (savedTimer) {
        try {
          const parsed = JSON.parse(savedTimer);
          const elapsed = Math.floor((Date.now() - parsed.savedAt) / 1000);
          const remaining = Math.max(0, parsed.timeRemaining - elapsed);
          setTimeRemaining(remaining);
        } catch (e) {
          // Use server time
        }
      }

      // Continue to start exam
      handleStartExam();
    }, 1500);
  }, [examId]);

  const handleResumeDeclined = useCallback((data) => {
    setResumeRequestStatus('declined');
    showToast('error', data.reason || 'Your resume request was declined.');
  }, []);

  const handleResumeExpired = useCallback(() => {
    setResumeRequestStatus('expired');
    showToast('error', 'Your resume request has expired.');
  }, []);

  // Create resume request for interrupted session
  const createResumeRequest = useCallback(async () => {
    if (!exam?.in_progress_attempt?.attempt_id) return;

    try {
      const result = await examService.createResumeRequest(exam.in_progress_attempt.attempt_id);
      setResumeRequest(result.request);
      setResumeRequestStatus('pending');
      setPhase('waiting_approval');
    } catch (err) {
      console.error('Failed to create resume request:', err);
      showToast('error', 'Failed to request resume approval. Please contact your instructor.');
    }
  }, [exam?.in_progress_attempt?.attempt_id]);

  const loadExamInfo = async () => {
    try {
      setLoading(true);
      const res = await examService.getExamInfoForStudent(examId);
      const examData = res.data || res;

      console.log('loadExamInfo response:', { res, examData, has_in_progress: examData?.has_in_progress });

      setExam(examData);
      // If there is an in-progress attempt, go to the secure resume screen
      if (examData.has_in_progress) {
        console.log('Setting phase to resume, in_progress_attempt:', examData.in_progress_attempt);
        setPhase('resume');
      } else {
        setPhase('instructions');
      }
    } catch (err) {
      console.error('loadExamInfo error:', err);
      showToast('error', err.message || 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message, duration = 4000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  // Security alert for exam violations (more prominent than toast)
  const showSecurityAlert = (message) => {
    setSecurityMessage(message);
    setShowSecurityWarning(true);
    setTimeout(() => setShowSecurityWarning(false), 3000);
  };

  // ============================================
  // LOCALSTORAGE PERSISTENCE
  // ============================================

  // Save responses to localStorage
  const saveResponsesToStorage = useCallback((newResponses) => {
    if (!attempt?.attempt_id) return;
    const key = `exam_responses_${examId}_${attempt.attempt_id}`;
    try {
      localStorage.setItem(key, JSON.stringify({
        responses: newResponses,
        flaggedQuestions: Array.from(flaggedQuestions),
        currentPage,
        timestamp: Date.now()
      }));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }, [examId, attempt?.attempt_id, flaggedQuestions, currentPage]);

  // Load responses from localStorage
  const loadResponsesFromStorage = useCallback(() => {
    if (!attempt?.attempt_id) return null;
    const key = `exam_responses_${examId}_${attempt.attempt_id}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        // Only use if saved within last 24 hours
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return data;
        }
      }
    } catch (err) {
      console.error('Failed to load from localStorage:', err);
    }
    return null;
  }, [examId, attempt?.attempt_id]);

  // Clear localStorage on submit
  const clearResponsesFromStorage = useCallback(() => {
    if (!attempt?.attempt_id) return;
    const key = `exam_responses_${examId}_${attempt.attempt_id}`;
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.error('Failed to clear localStorage:', err);
    }
  }, [examId, attempt?.attempt_id]);

  // ============================================
  // FULLSCREEN MODE
  // ============================================

  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.error('Failed to enter fullscreen:', err);
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.error('Failed to exit fullscreen:', err);
    }
  }, []);

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement || document.msFullscreenElement);
      setIsFullscreen(isFs);

      // If exited fullscreen during exam with tab detection enabled, show warning
      if (!isFs && phase === 'exam' && exam?.detect_tab_switch) {
        handleTabSwitch();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [phase, exam]);

  // ============================================
  // TAB SWITCH DETECTION & AUTO-LOGOUT (3 STRIKES RULE)
  // ============================================

  const handleTabSwitch = useCallback(() => {
    if (phase !== 'exam' || !exam?.detect_tab_switch) return;

    tabSwitchCountRef.current += 1;
    const newCount = tabSwitchCountRef.current;
    setTabSwitchCount(newCount);

    // Log to server
    if (attempt?.attempt_id) {
      examService.logTabSwitch(attempt.attempt_id).catch(console.error);
    }

    // Check if max violations reached - AUTO SUBMIT AND LOGOUT
    const maxSwitches = exam?.max_tab_switches || MAX_TAB_SWITCHES_BEFORE_SUBMIT;
    if (newCount >= maxSwitches) {
      handleAutoSubmitAndLogout(`Maximum tab switches (${maxSwitches}) exceeded. Your exam has been submitted.`);
      return;
    }

    // Show black screen warning
    setShowTabWarning(true);
    setTabWarningCountdown(TAB_SWITCH_WARNING_SECONDS);

    // Start countdown timer
    if (tabWarningTimerRef.current) {
      clearInterval(tabWarningTimerRef.current);
    }

    tabWarningTimerRef.current = setInterval(() => {
      setTabWarningCountdown(prev => {
        if (prev <= 1) {
          clearInterval(tabWarningTimerRef.current);
          // Auto-logout after countdown if they don't return
          handleAutoSubmitAndLogout('You did not return to the exam in time. Your exam has been submitted.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [phase, exam, attempt]);

  const handleReturnToExam = useCallback(() => {
    // Clear the countdown timer
    if (tabWarningTimerRef.current) {
      clearInterval(tabWarningTimerRef.current);
    }
    setShowTabWarning(false);
    setTabWarningCountdown(TAB_SWITCH_WARNING_SECONDS);

    // Re-enter fullscreen
    if (exam?.detect_tab_switch) {
      enterFullscreen();
    }
  }, [exam, enterFullscreen]);

  // Combined auto-submit and logout function
  const handleAutoSubmitAndLogout = useCallback(async (message) => {
    // Clear timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (tabWarningTimerRef.current) clearInterval(tabWarningTimerRef.current);

    // Submit exam before logging out
    if (attempt?.attempt_id) {
      try {
        setSubmitting(true);
        await examService.submitExam(attempt.attempt_id);
        clearResponsesFromStorage();
      } catch (err) {
        console.error('Failed to submit exam on auto-logout:', err);
      }
    }

    // Exit fullscreen
    exitFullscreen();

    // Show message and logout
    showToast('error', message);
    setTimeout(() => {
      logout();
      navigate('/student/login');
    }, 2000);
  }, [attempt, logout, navigate, exitFullscreen, clearResponsesFromStorage]);

  const handleAutoLogout = useCallback(async () => {
    await handleAutoSubmitAndLogout('You have been logged out due to exam policy violation.');
  }, [handleAutoSubmitAndLogout]);

  // ============================================
  // SCREENSHOT DETECTION
  // ============================================

  const handleScreenshotAttempt = useCallback(() => {
    if (phase !== 'exam') return;

    const newCount = screenshotAttempts + 1;
    setScreenshotAttempts(newCount);
    setShowScreenshotWarning(true);

    // Log to server
    if (attempt?.attempt_id) {
      examService.logTabSwitch(attempt.attempt_id).catch(console.error); // Reuse tab switch log
    }

    // Hide warning after 3 seconds
    setTimeout(() => setShowScreenshotWarning(false), 3000);

    // If too many screenshot attempts, auto-submit
    if (newCount >= 3) {
      handleAutoSubmitAndLogout('Multiple screenshot attempts detected. Your exam has been submitted.');
    }
  }, [phase, screenshotAttempts, attempt, handleAutoSubmitAndLogout]);

  // Comprehensive security detection (matching PublicExam.jsx)
  useEffect(() => {
    if (phase !== 'exam') return;

    const handleKeyDown = (e) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        handleScreenshotAttempt();
        return false;
      }

      // Windows Snipping Tool (Win + Shift + S)
      if ((e.metaKey || e.key === 'Meta') && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleScreenshotAttempt();
        return false;
      }

      // Mac screenshots (Cmd + Shift + 3/4/5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        handleScreenshotAttempt();
        return false;
      }

      // Ctrl + P (Print)
      if (e.ctrlKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        showSecurityAlert('Printing is disabled during examination');
        return false;
      }

      // F12 (DevTools)
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        showSecurityAlert('Developer tools are disabled');
        return false;
      }

      // Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        showSecurityAlert('Developer tools are disabled');
        return false;
      }

      // Ctrl+Shift+J (Console)
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        showSecurityAlert('Console is disabled');
        return false;
      }

      // Ctrl+U (View Source)
      if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        showSecurityAlert('View source is disabled');
        return false;
      }

      // Ctrl+S (Save)
      if (e.ctrlKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        showSecurityAlert('Saving page is disabled');
        return false;
      }

      // Ctrl+C (Copy) - except in text inputs
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          e.preventDefault();
          showSecurityAlert('Copying content is disabled');
          return false;
        }
      }

      // Alt+Tab detection
      if (e.altKey && e.key === 'Tab') {
        e.preventDefault();
        return false;
      }
    };

    // Prevent right-click
    const handleContextMenu = (e) => {
      e.preventDefault();
      showSecurityAlert('Right-click is disabled during examination');
      return false;
    };

    // Prevent copy (except in inputs)
    const handleCopy = (e) => {
      if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        showSecurityAlert('Copying is disabled');
        return false;
      }
    };

    // Prevent drag
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent selection (except in inputs)
    const handleSelectStart = (e) => {
      if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        return false;
      }
    };

    // DevTools detection via window size
    const devToolsCheck = setInterval(() => {
      const threshold = 160;
      if (window.outerWidth - window.innerWidth > threshold ||
          window.outerHeight - window.innerHeight > threshold) {
        showSecurityAlert('Please close developer tools to continue');
      }
    }, 1000);

    document.addEventListener('keydown', handleKeyDown, { capture: true });
    document.addEventListener('keyup', handleKeyDown, { capture: true });
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      clearInterval(devToolsCheck);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('keyup', handleKeyDown, { capture: true });
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [phase, handleScreenshotAttempt]);

  // ============================================
  // NETWORK HEALTH CHECK (using axios to backend)
  // ============================================

  const checkNetworkHealth = useCallback(async () => {
    try {
      // Use the health check endpoint at "/"
      await api.get('/', { timeout: 5000 });
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  // ============================================
  // SEALING MECHANISM - Lock answers on network loss or timer expiry
  // ============================================

  const sealExamSnapshot = useCallback(async (reason = 'network_loss') => {
    if (isSealed || sealedData) {
      console.log('Already sealed, skipping...');
      return sealedData;
    }

    setSealStatus('sealing');

    // Create the sealed snapshot
    const snapshot = {
      attempt_id: attempt?.attempt_id,
      exam_id: examId,
      responses: { ...responses },
      flagged_questions: Array.from(flaggedQuestions),
      sealed_at: new Date().toISOString(),
      sealed_timestamp: Date.now(),
      seal_reason: reason,
      time_remaining_at_seal: timeRemaining,
      tab_switch_count: tabSwitchCount,
      questions_answered: Object.keys(responses).filter(qId => isQuestionAnswered(responses[qId])).length,
      total_questions: questions.length,
    };

    // Generate hash for integrity verification
    const hash = await generateHash(snapshot);
    const sealedPayload = {
      ...snapshot,
      integrity_hash: hash,
    };

    // Store sealed data in state and localStorage
    setSealedData(sealedPayload);
    setIsSealed(true);
    setSealStatus('sealed');

    // Persist to localStorage for recovery
    try {
      const sealKey = `exam_sealed_${examId}_${attempt?.attempt_id}`;
      localStorage.setItem(sealKey, JSON.stringify(sealedPayload));
    } catch (err) {
      console.error('Failed to persist sealed data:', err);
    }

    console.log('Exam SEALED at:', snapshot.sealed_at, 'Reason:', reason);
    showToast('warning', `Your answers have been locked (${reason === 'timer_expired' ? 'time expired' : 'connection lost'}). Will submit when online.`);

    return sealedPayload;
  }, [isSealed, sealedData, attempt, examId, responses, flaggedQuestions, timeRemaining, tabSwitchCount, questions]);

  // Load any previously sealed data on mount
  useEffect(() => {
    if (attempt?.attempt_id && phase === 'exam') {
      const sealKey = `exam_sealed_${examId}_${attempt.attempt_id}`;
      try {
        const savedSealed = localStorage.getItem(sealKey);
        if (savedSealed) {
          const parsed = JSON.parse(savedSealed);
          // Verify it's for this attempt
          if (parsed.attempt_id === attempt.attempt_id) {
            setSealedData(parsed);
            setIsSealed(true);
            setSealStatus('sealed');
            setPendingSubmission(true);
            console.log('Restored sealed exam data from localStorage');
          }
        }
      } catch (err) {
        console.error('Failed to load sealed data:', err);
      }
    }
  }, [attempt?.attempt_id, phase, examId]);

  // Network health polling with sealing on disconnect
  useEffect(() => {
    if (phase !== 'exam') return;

    let lastOnlineStatus = true;

    const pollNetwork = async () => {
      const isHealthy = await checkNetworkHealth();

      if (isHealthy && !lastOnlineStatus) {
        // Network came back online!
        console.log('Network restored!');
        setIsOnline(true);
        setShowOfflineWarning(false);

        // If we have sealed data, auto-submit it
        if (sealedData && pendingSubmission) {
          submitSealedExam();
        }
      } else if (!isHealthy && lastOnlineStatus) {
        // Network went offline - SEAL THE EXAM!
        console.log('Network lost! Sealing exam...');
        setIsOnline(false);
        setShowOfflineWarning(true);

        // Seal the exam immediately
        if (!isSealed) {
          await sealExamSnapshot('network_loss');
          setPendingSubmission(true);
        }
      }

      lastOnlineStatus = isHealthy;
    };

    // Initial check
    pollNetwork();

    // Poll every 5 seconds
    networkCheckRef.current = setInterval(pollNetwork, NETWORK_CHECK_INTERVAL);

    // Also listen to browser online/offline events as backup
    const handleOffline = async () => {
      setIsOnline(false);
      setShowOfflineWarning(true);
      if (!isSealed && phase === 'exam') {
        await sealExamSnapshot('network_loss');
        setPendingSubmission(true);
      }
    };

    const handleOnline = () => {
      // Don't trust browser event alone, let health check verify
      pollNetwork();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (networkCheckRef.current) {
        clearInterval(networkCheckRef.current);
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (submissionRetryRef.current) {
        clearTimeout(submissionRetryRef.current);
      }
    };
  }, [phase, checkNetworkHealth, isSealed, sealedData, pendingSubmission, sealExamSnapshot]);

  // ============================================
  // SUBMIT SEALED EXAM
  // ============================================

  const submitSealedExam = useCallback(async () => {
    if (!sealedData || !sealedData.attempt_id) {
      console.error('No sealed data to submit');
      return;
    }

    if (submissionRetryCount >= MAX_SUBMISSION_RETRIES) {
      showToast('error', 'Maximum retry attempts reached. Please contact your instructor with your sealed exam data.');
      return;
    }

    try {
      setSubmitting(true);
      setSealStatus('submitting');
      setSubmissionRetryCount(prev => prev + 1);
      showToast('info', `Connection restored — submitting your exam... (Attempt ${submissionRetryCount + 1})`);

      // Submit the sealed payload to the server
      // The server should verify: timestamp is within exam window, hash matches
      const res = await examService.submitSealedExam(sealedData.attempt_id, {
        sealed_responses: sealedData.responses,
        sealed_at: sealedData.sealed_at,
        sealed_timestamp: sealedData.sealed_timestamp,
        integrity_hash: sealedData.integrity_hash,
        seal_reason: sealedData.seal_reason,
        time_remaining_at_seal: sealedData.time_remaining_at_seal,
      });

      const data = res.data || res;

      // Success! Clear all pending state
      setPendingSubmission(false);
      setSubmissionRetryCount(0);
      setSealStatus('submitted');

      // Clear localStorage
      clearResponsesFromStorage();
      const sealKey = `exam_sealed_${examId}_${sealedData.attempt_id}`;
      localStorage.removeItem(sealKey);

      // Exit fullscreen
      exitFullscreen();

      // Clear timer
      if (timerRef.current) clearInterval(timerRef.current);

      // Update attempt
      if (data.attempt) {
        setAttempt(data.attempt);
      } else if (data) {
        setAttempt(prev => ({ ...prev, ...data }));
      }

      setPhase('submitted');
      showToast('success', 'Exam submitted successfully!');
    } catch (err) {
      console.error('Sealed submission failed:', err);

      // Check if server rejected due to timing/hash issues
      if (err.response?.data?.message?.includes('expired') || err.response?.data?.message?.includes('window')) {
        showToast('error', 'Exam time window has passed. Your sealed answers could not be submitted. Please contact your instructor.');
        setSealStatus('rejected');
        return;
      }

      if (err.response?.data?.message?.includes('hash') || err.response?.data?.message?.includes('tampered')) {
        showToast('error', 'Integrity check failed. Please contact your instructor.');
        setSealStatus('rejected');
        return;
      }

      // Network still having issues, schedule retry with exponential backoff
      const backoffTime = Math.min(5000 * Math.pow(2, submissionRetryCount), 30000);
      showToast('error', `Submission failed. Retrying in ${backoffTime / 1000} seconds...`);

      submissionRetryRef.current = setTimeout(async () => {
        const isHealthy = await checkNetworkHealth();
        if (isHealthy) {
          submitSealedExam();
        }
      }, backoffTime);

      setSubmitting(false);
      setSealStatus('sealed');
    }
  }, [sealedData, submissionRetryCount, examId, checkNetworkHealth, clearResponsesFromStorage, exitFullscreen]);

  // Retry submission function - uses sealed data if available
  const retrySubmission = async () => {
    // If we have sealed data, use the sealed submission path
    if (sealedData) {
      await submitSealedExam();
      return;
    }

    if (!pendingSubmission || !attempt?.attempt_id) return;
    if (submissionRetryCount >= MAX_SUBMISSION_RETRIES) {
      showToast('error', 'Maximum retry attempts reached. Please contact your instructor.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmissionRetryCount(prev => prev + 1);
      showToast('info', `Retrying submission... (Attempt ${submissionRetryCount + 1})`);

      const res = await examService.submitExam(attempt.attempt_id);
      const data = res.data || res;

      // Success! Clear pending state
      setPendingSubmission(false);
      setSubmissionRetryCount(0);
      clearResponsesFromStorage();
      exitFullscreen();

      if (data.attempt) {
        setAttempt(data.attempt);
      } else if (data) {
        setAttempt(prev => ({ ...prev, ...data }));
      }

      setPhase('submitted');
      showToast('success', 'Exam submitted successfully!');
    } catch (err) {
      console.error('Retry submission failed:', err);

      // Schedule next retry with exponential backoff
      const backoffTime = Math.min(5000 * Math.pow(2, submissionRetryCount), 30000);
      showToast('error', `Submission failed. Retrying in ${backoffTime / 1000} seconds...`);

      submissionRetryRef.current = setTimeout(async () => {
        const isHealthy = await checkNetworkHealth();
        if (isHealthy) {
          retrySubmission();
        }
      }, backoffTime);

      setSubmitting(false);
    }
  };

  // Prevent navigation during exam and seal on page unload
  useEffect(() => {
    if (phase !== 'exam') return;

    const handleBeforeUnload = (e) => {
      // Seal the exam using sendBeacon for reliability during page unload
      if (attempt?.attempt_id && !isSealed) {
        const sealData = JSON.stringify({
          time_remaining_seconds: timeRemaining,
          responses: responses
        });

        // Use sendBeacon for reliability during page unload
        const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || '';
        navigator.sendBeacon(
          `${baseUrl}/api/student/exam/attempt/${attempt.attempt_id}/seal`,
          new Blob([sealData], { type: 'application/json' })
        );
      }

      // Show browser confirmation dialog
      e.preventDefault();
      e.returnValue = 'Your exam will be paused. You will need instructor approval to resume.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  // Inject security styles during exam
  useEffect(() => {
    if (phase !== 'exam') return;

    // Create and inject style element
    const styleElement = document.createElement('style');
    styleElement.id = 'exam-security-styles';
    styleElement.textContent = examSecurityStyles;
    document.head.appendChild(styleElement);

    // Prevent drag
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      // Cleanup
      const style = document.getElementById('exam-security-styles');
      if (style) style.remove();
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [phase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tabWarningTimerRef.current) {
        clearInterval(tabWarningTimerRef.current);
      }
    };
  }, []);

  // Start exam with optional password
  const handleStartExam = async () => {
    try {
      setLoading(true);

      // If exam requires password and we haven't entered it yet
      if ((exam.has_password || exam.access_password) && (phase === 'instructions' || phase === 'resume')) {
        setReturnPhase(phase); // remember where to return if cancelled
        setPhase('password');
        setLoading(false);
        return;
      }

      // Start the attempt
      console.log('handleStartExam - Calling startExam API with examId:', examId, 'password:', password ? '***' : 'none');
      const res = await examService.startExam(examId, password || undefined);
      const data = res.data || res;

      console.log('handleStartExam - API response:', { res, data, hasAttempt: !!data.attempt, hasQuestions: !!data.questions, questionsCount: data.questions?.length });

      setAttempt(data.attempt);
      setQuestions(data.questions || []);
      setTimeRemaining(data.time_remaining_seconds);

      // Load existing responses if resuming
      let respMap = {};
      let flagged = new Set();

      if (data.responses) {
        data.responses.forEach(r => {
          respMap[r.question_id] = {
            selected_option_id: r.selected_option_id,
            selected_option_ids: r.selected_option_ids,
            text_response: r.text_response,
            is_flagged: r.is_flagged
          };
          if (r.is_flagged) {
            flagged.add(r.question_id);
          }
        });
      }

      // Also check localStorage for any unsaved responses
      const savedData = loadResponsesFromStorage();
      if (savedData) {
        // Merge localStorage responses with server responses (localStorage takes priority)
        respMap = { ...respMap, ...savedData.responses };
        if (savedData.flaggedQuestions) {
          savedData.flaggedQuestions.forEach(qId => flagged.add(qId));
        }
        if (savedData.currentPage !== undefined) {
          setCurrentPage(savedData.currentPage);
        }
      }

      setResponses(respMap);
      setFlaggedQuestions(flagged);
      setPhase('exam');
      startTimer(data.time_remaining_seconds);

      // Enter fullscreen if tab detection is enabled
      if (data.attempt?.exam?.detect_tab_switch || exam?.detect_tab_switch) {
        setTimeout(() => enterFullscreen(), 500);
      }
    } catch (err) {
      if (err.message?.includes('password')) {
        setPasswordError('Invalid password');
        setPhase('password');
      } else if (err.message?.includes('expired') || err.message?.includes('auto-submitted')) {
        // Time expired - reload exam info to get fresh state
        showToast('error', err.message || 'Exam time has expired');
        setTimeout(() => {
          loadExamInfo();
        }, 2000);
      } else {
        showToast('error', err.message || 'Failed to start exam');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password.trim()) {
      setPasswordError('Please enter the access password');
      return;
    }
    setPasswordError('');
    await handleStartExam();
  };

  // Timer logic - uses wall clock time for accuracy
  const startTimer = (seconds) => {
    if (!seconds) return;

    // Store the actual end time based on wall clock
    timerEndTimeRef.current = Date.now() + (seconds * 1000);
    setTimeRemaining(seconds);

    // Track if warning was shown to avoid repeated warnings
    let warningShown = false;

    // Update every 250ms for smooth display, calculate from actual time
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((timerEndTimeRef.current - now) / 1000));

      setTimeRemaining(remaining);

      // Show warning at 5 minutes (300 seconds)
      if (!warningShown && remaining <= 300 && remaining > 0) {
        warningShown = true;
        setShowTimeWarning(true);
        setTimeout(() => setShowTimeWarning(false), 5000);
      }

      // Auto-submit when time is up
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        handleAutoSubmit();
      }
    }, 250); // Check more frequently for accuracy
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '--:--';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Response handling
  const handleResponseChange = async (questionId, value, type = 'single') => {
    const question = questions.find(q => q.question_id === questionId);
    let responseData = { ...responses[questionId] };

    if (type === 'single') {
      responseData.selected_option_id = value;
    } else if (type === 'multiple') {
      const current = responseData.selected_option_ids || [];
      if (current.includes(value)) {
        responseData.selected_option_ids = current.filter(id => id !== value);
      } else {
        responseData.selected_option_ids = [...current, value];
      }
    } else if (type === 'text') {
      responseData.text_response = value;
    }

    const newResponses = { ...responses, [questionId]: responseData };
    setResponses(newResponses);

    // Save to localStorage immediately
    saveResponsesToStorage(newResponses);

    // Save to server
    try {
      await examService.saveResponse(attempt.attempt_id, {
        question_id: questionId,
        ...responseData
      });
    } catch (err) {
      console.error('Failed to save response:', err);
      // Response is still saved in localStorage, so not lost
    }
  };

  const toggleFlag = async (questionId) => {
    const newFlagged = new Set(flaggedQuestions);
    const isFlagged = newFlagged.has(questionId);

    if (isFlagged) {
      newFlagged.delete(questionId);
    } else {
      newFlagged.add(questionId);
    }
    setFlaggedQuestions(newFlagged);

    // Save to localStorage
    saveResponsesToStorage(responses);

    // Save flag status to server
    try {
      await examService.saveResponse(attempt.attempt_id, {
        question_id: questionId,
        ...responses[questionId],
        is_flagged: !isFlagged
      });
    } catch (err) {
      console.error('Failed to save flag:', err);
    }
  };

  // Submit handling
  const handleAutoSubmit = async () => {
    showToast('error', 'Time expired! Auto-submitting your exam...');

    // Check if online
    const isHealthy = await checkNetworkHealth();

    if (!isHealthy) {
      // Offline - seal and wait for reconnection
      await sealExamSnapshot('timer_expired');
      setPendingSubmission(true);
      return;
    }

    // Online - submit normally
    await submitExam();
  };

  const handleManualSubmit = async () => {
    const answeredCount = Object.keys(responses).filter(qId => isQuestionAnswered(responses[qId])).length;

    const unansweredCount = questions.length - answeredCount;

    if (unansweredCount > 0) {
      const result = await Swal.fire({
        title: 'Unanswered Questions',
        text: `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Submit',
        cancelButtonText: 'Go Back',
      });
      if (!result.isConfirmed) return;
    }

    await submitExam();
  };

  const submitExam = async () => {
    if (!attempt?.attempt_id) {
      showToast('error', 'No active exam attempt found. Please try again.');
      return;
    }

    // If already sealed, use sealed submission
    if (isSealed && sealedData) {
      await submitSealedExam();
      return;
    }

    // Check if offline using health check
    const isHealthy = await checkNetworkHealth();

    if (!isHealthy) {
      showToast('warning', 'You are offline. Sealing your answers for later submission...');
      await sealExamSnapshot('network_loss');
      setPendingSubmission(true);
      setShowOfflineWarning(true);
      return;
    }

    try {
      setSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);
      if (tabWarningTimerRef.current) clearInterval(tabWarningTimerRef.current);

      console.log('Submitting exam with attempt ID:', attempt.attempt_id);
      const res = await examService.submitExam(attempt.attempt_id);
      console.log('Submit response:', res);

      const data = res.data || res;

      // Clear localStorage after successful submission
      clearResponsesFromStorage();
      const sealKey = `exam_sealed_${examId}_${attempt.attempt_id}`;
      localStorage.removeItem(sealKey);
      setPendingSubmission(false);
      setSubmissionRetryCount(0);

      // Exit fullscreen
      exitFullscreen();

      // Update attempt with response data
      if (data.attempt) {
        setAttempt(data.attempt);
      } else if (data) {
        setAttempt(prev => ({ ...prev, ...data }));
      }

      setPhase('submitted');
      showToast('success', 'Exam submitted successfully!');
    } catch (err) {
      console.error('Submit error:', err);

      // Check if it's a network error
      if (err.code === 'ERR_NETWORK' || err.message?.includes('network') || err.message?.includes('Network')) {
        showToast('warning', 'Network error. Sealing your answers for later submission...');
        await sealExamSnapshot('network_loss');
        setPendingSubmission(true);
        setShowOfflineWarning(true);

        // Start retry mechanism with exponential backoff
        submissionRetryRef.current = setTimeout(async () => {
          const isHealthy = await checkNetworkHealth();
          if (isHealthy) {
            submitSealedExam();
          }
        }, 5000);
      } else {
        showToast('error', err.message || 'Failed to submit exam. Please try again.');
      }
      setSubmitting(false);
    }
  };

  // Enhanced tab switch detection with black screen warning
  useEffect(() => {
    if (phase !== 'exam' || !exam?.detect_tab_switch) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabSwitch();
      } else if (showTabWarning) {
        // User returned - they need to click the button to continue
      }
    };

    const handleWindowBlur = () => {
      handleTabSwitch();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [phase, exam, attempt, handleTabSwitch, showTabWarning]);

  // Save currentPage to localStorage when it changes
  useEffect(() => {
    if (phase === 'exam' && attempt?.attempt_id) {
      saveResponsesToStorage(responses);
    }
  }, [currentPage, phase, attempt?.attempt_id]);

  // Pagination
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const currentQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  const isQuestionAnswered = (response) => {
    if (!response) return false;
    if (response.selected_option_id != null && response.selected_option_id !== '') return true;
    if (response.selected_option_ids?.length > 0) return true;
    if (response.text_response != null && String(response.text_response).trim() !== '') return true;
    return false;
  };

  const getQuestionStatus = (questionId) => {
    return isQuestionAnswered(responses[questionId]) ? 'answered' : 'unanswered';
  };

  // Render question based on type
  const renderQuestion = (question, index) => {
    const globalIndex = currentPage * QUESTIONS_PER_PAGE + index;
    const response = responses[question.question_id] || {};
    const isFlagged = flaggedQuestions.has(question.question_id);

    return (
      <motion.div
        key={question.question_id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className={`bg-white rounded-xl shadow-sm border-2 p-6 ${
          isFlagged ? 'border-amber-400' : 'border-gray-100'
        }`}
      >
        {/* Question Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">
              {globalIndex + 1}
            </span>
            <div>
              <span className="text-xs text-gray-500 uppercase tracking-wider">
                {question.question_type.replace(/_/g, ' ')}
              </span>
              <span className="mx-2 text-gray-300">•</span>
              <span className="text-xs text-gray-500">{question.points} pts</span>
            </div>
          </div>
          <button
            onClick={() => toggleFlag(question.question_id)}
            className={`p-2 rounded-full transition-colors ${
              isFlagged
                ? 'bg-amber-100 text-amber-600'
                : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
            }`}
            title={isFlagged ? 'Remove flag' : 'Flag for review'}
          >
            <Flag className="w-4 h-4" fill={isFlagged ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Question Text */}
        <p className="text-gray-900 font-medium mb-4 text-lg">{question.question_text}</p>

        {/* Question Image */}
        {question.image_url && (
          <div className="mb-4">
            <img
              src={question.image_url}
              alt={`Question ${globalIndex + 1} image`}
              className="max-w-full h-auto max-h-80 rounded-lg border border-gray-200 shadow-sm"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Answer Options */}
        {['multiple_choice_single', 'true_false'].includes(question.question_type) && (
          <div className="space-y-3">
            {question.AnswerOptions?.map(option => (
              <label
                key={option.option_id}
                className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  response.selected_option_id === option.option_id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={`question_${question.question_id}`}
                  checked={response.selected_option_id === option.option_id}
                  onChange={() => handleResponseChange(question.question_id, option.option_id, 'single')}
                  className="w-5 h-5 text-primary-600"
                />
                <span className="ml-3 text-gray-700">{option.option_text}</span>
              </label>
            ))}
          </div>
        )}

        {question.question_type === 'multiple_choice_multiple' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-2">Select all that apply</p>
            {question.AnswerOptions?.map(option => (
              <label
                key={option.option_id}
                className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  (response.selected_option_ids || []).includes(option.option_id)
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={(response.selected_option_ids || []).includes(option.option_id)}
                  onChange={() => handleResponseChange(question.question_id, option.option_id, 'multiple')}
                  className="w-5 h-5 text-primary-600 rounded"
                />
                <span className="ml-3 text-gray-700">{option.option_text}</span>
              </label>
            ))}
          </div>
        )}

        {question.question_type === 'fill_in_blank' && (
          <div>
            <input
              type="text"
              value={response.text_response || ''}
              onChange={(e) => handleResponseChange(question.question_id, e.target.value, 'text')}
              placeholder="Type your answer here..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all"
            />
          </div>
        )}

        {['short_answer', 'essay'].includes(question.question_type) && (
          <div>
            <textarea
              value={response.text_response || ''}
              onChange={(e) => handleResponseChange(question.question_id, e.target.value, 'text')}
              placeholder="Type your answer here..."
              rows={question.question_type === 'essay' ? 8 : 4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all resize-y"
            />
            {(question.word_limit_min || question.word_limit_max) && (
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>
                  Word count: {(response.text_response || '').split(/\s+/).filter(w => w).length}
                </span>
                <span>
                  {question.word_limit_min && `Min: ${question.word_limit_min}`}
                  {question.word_limit_min && question.word_limit_max && ' • '}
                  {question.word_limit_max && `Max: ${question.word_limit_max}`}
                </span>
              </div>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  // Navigation-block confirmation modal (fires when browser back / programmatic navigate attempted)
  const NavigationBlockModal = () => {
    if (blocker.state !== 'blocked') return null;
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Leave the Exam?</h2>
          <p className="text-gray-500 mb-6">
            Your exam is still in progress. If you leave now your answers will be saved,
            but you will need to return to finish and submit.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => blocker.reset()}
              className="flex-1 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
            >
              Stay in Exam
            </button>
            <button
              onClick={() => blocker.proceed()}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold transition-colors"
            >
              Leave Anyway
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading && phase === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl flex items-center space-x-4">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="text-lg text-gray-700">Loading exam...</span>
        </div>
      </div>
    );
  }

  // ============================================
  // RESUME PHASE – in-progress attempt exists
  // ============================================
  if (phase === 'resume' && exam) {
    const inProgress = exam.in_progress_attempt;
    const questionsAnswered = inProgress?.questions_answered || 0;
    const totalQuestions = exam.question_count || 0;
    const progressPct = totalQuestions > 0 ? Math.round((questionsAnswered / totalQuestions) * 100) : 0;

    // Approximate time remaining
    let approxMinutesLeft = null;
    if (exam.has_time_limit && exam.time_limit_minutes && inProgress?.started_at) {
      const elapsedSeconds = (Date.now() - new Date(inProgress.started_at).getTime()) / 1000;
      const totalSeconds = exam.time_limit_minutes * 60;
      approxMinutesLeft = Math.max(0, Math.ceil((totalSeconds - elapsedSeconds) / 60));
    }

    const formatStartedAt = (iso) => {
      if (!iso) return '';
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    };

    const canStartOver = exam.max_attempts > 1 && exam.attempts_used < exam.max_attempts - 1;

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8 text-white">
              <div className="flex items-center space-x-4 mb-3">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2 py-1 rounded-full">
                    Exam In Progress
                  </span>
                  <h1 className="text-2xl font-bold mt-1">{exam.title}</h1>
                  <p className="text-amber-100">{exam.subject?.sbj_name}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Progress summary */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-semibold text-amber-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Your Progress
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-amber-700">{questionsAnswered}</p>
                    <p className="text-xs text-amber-600">of {totalQuestions} answered</p>
                  </div>
                  {approxMinutesLeft !== null && (
                    <div className="text-center">
                      <p className={`text-3xl font-bold ${approxMinutesLeft <= 5 ? 'text-red-600' : 'text-amber-700'}`}>
                        {approxMinutesLeft}m
                      </p>
                      <p className="text-xs text-amber-600">approx. remaining</p>
                    </div>
                  )}
                </div>
                {/* Progress bar */}
                <div className="w-full bg-amber-200 rounded-full h-2.5">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-amber-600 mt-2 text-right">{progressPct}% complete</p>
                {inProgress?.started_at && (
                  <p className="text-xs text-amber-600 mt-1">
                    Started: {formatStartedAt(inProgress.started_at)}
                  </p>
                )}
              </div>

              {/* Password notice if protected */}
              {exam.has_password && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
                  <Lock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Password required to resume</p>
                    <p className="text-xs text-blue-600 mt-1">
                      For security, you must re-enter the access password before continuing.
                    </p>
                  </div>
                </div>
              )}

              {/* Resume button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartExam}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Resuming...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    <span>Resume Exam</span>
                  </>
                )}
              </motion.button>

              {/* Request instructor approval (for interrupted sessions) */}
              {inProgress?.is_sealed && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mt-4">
                  <p className="text-sm font-medium text-purple-900 mb-2">Session was interrupted</p>
                  <p className="text-xs text-purple-600 mb-3">
                    Your exam session was interrupted. You may need instructor approval to resume.
                  </p>
                  <button
                    onClick={createResumeRequest}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium text-sm disabled:opacity-60"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Request Instructor Approval</span>
                  </button>
                </div>
              )}

              {/* Start over (only if attempts allow it) */}
              {canStartOver && (
                <button
                  onClick={async () => {
                    const result = await Swal.fire({
                      title: 'Start Over?',
                      text: 'Your current in-progress attempt will count as used and you will begin a fresh attempt.',
                      icon: 'question',
                      showCancelButton: true,
                      confirmButtonColor: '#f59e0b',
                      cancelButtonColor: '#6b7280',
                      confirmButtonText: 'Yes, Start Over',
                      cancelButtonText: 'Cancel',
                    });
                    if (result.isConfirmed) {
                      // Abandon current attempt by navigating to the start fresh flow
                      setPhase('instructions');
                    }
                  }}
                  className="w-full flex items-center justify-center space-x-2 text-gray-500 hover:text-gray-700 py-2 text-sm"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Abandon &amp; Start Over ({exam.max_attempts - exam.attempts_used - 1} attempts left after this)</span>
                </button>
              )}

              <button
                onClick={() => navigate(-1)}
                className="w-full text-gray-400 hover:text-gray-600 py-2 text-sm"
              >
                Go Back
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Instructions phase
  if (phase === 'instructions' && exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-white">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{exam.title}</h1>
                  <p className="text-primary-200">{exam.subject?.sbj_name}</p>
                </div>
              </div>
            </div>

            {/* Exam Info */}
            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <FileText className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{exam.question_count || exam.Questions?.length || 0}</p>
                  <p className="text-xs text-gray-500">Questions</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Timer className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">
                    {exam.has_time_limit ? `${exam.time_limit_minutes}m` : '∞'}
                  </p>
                  <p className="text-xs text-gray-500">Time Limit</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <Check className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{exam.total_points || 0}</p>
                  <p className="text-xs text-gray-500">Total Points</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <AlertCircle className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{exam.pass_percentage}%</p>
                  <p className="text-xs text-gray-500">Pass Score</p>
                </div>
              </div>

              {/* Instructions */}
              {exam.instructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Instructions
                  </h3>
                  <div className="text-blue-800 whitespace-pre-wrap text-sm leading-relaxed">
                    {exam.instructions}
                  </div>
                </div>
              )}

              {/* Rules */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <h3 className="font-semibold text-amber-900 mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Important Notes
                </h3>
                <ul className="text-amber-800 text-sm space-y-2">
                  <li className="flex items-start">
                    <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>You have <strong>{exam.max_attempts}</strong> attempt(s) for this exam.</span>
                  </li>
                  {exam.has_time_limit && (
                    <li className="flex items-start">
                      <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>The exam will auto-submit when time runs out.</span>
                    </li>
                  )}
                  {exam.detect_tab_switch && (
                    <li className="flex items-start">
                      <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Tab switching is monitored. Max allowed: <strong>{exam.max_tab_switches}</strong></span>
                    </li>
                  )}
                  {(exam.has_password || exam.access_password) && (
                    <li className="flex items-start">
                      <Lock className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>This exam requires an access password.</span>
                    </li>
                  )}
                </ul>
              </div>

              {/* Start Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleStartExam}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-6 h-6" />
                    <span>Start Exam</span>
                  </>
                )}
              </motion.button>

              <button
                onClick={() => navigate(-1)}
                className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm"
              >
                Go Back
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Password phase
  if (phase === 'password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center py-8 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Access Password Required</h2>
            <p className="text-gray-500 mt-2">Enter the password provided by your instructor</p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter access password"
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-primary-200 transition-all ${
                  passwordError ? 'border-red-500' : 'border-gray-200 focus:border-primary-500'
                }`}
                autoFocus
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-2">{passwordError}</p>
              )}
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Continue</span>
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => setPhase(returnPhase)}
              className="w-full text-gray-500 hover:text-gray-700 py-2 mt-3 text-sm"
            >
              {returnPhase === 'resume' ? 'Back to Resume Screen' : 'Back to Instructions'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Waiting for approval phase (resume request)
  if (phase === 'waiting_approval') {
    return (
      <WaitingApprovalScreen
        requestId={resumeRequest?.request_id}
        examTitle={exam?.title}
        status={resumeRequestStatus}
        isPublic={false}
        onApproved={handleResumeApproved}
        onDeclined={handleResumeDeclined}
        onExpired={handleResumeExpired}
        onCancel={() => {
          setResumeRequest(null);
          setResumeRequestStatus(null);
          setPhase('resume');
        }}
      />
    );
  }

  // Checking sealed exams phase
  if (checkingSealed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center py-8 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Upload className="w-10 h-10 text-amber-600 animate-pulse" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Checking Exam Status...</h2>
          <p className="text-gray-500 mb-6">
            Please wait while we check for any pending submissions...
          </p>

          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            <span className="text-gray-600">Please wait...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Exam phase
  if (phase === 'exam') {
    return (
      <div className="min-h-screen bg-gray-100 exam-secure-container">
        <NavigationBlockModal />
        {/* Fixed Header */}
        <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-20">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-semibold text-gray-900 truncate">{exam.title}</h1>
                <p className="text-sm text-gray-500">
                  Page {currentPage + 1} of {totalPages}
                </p>
              </div>

              {/* Timer */}
              {timeRemaining !== null && (
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  timeRemaining <= 300
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  <Clock className="w-5 h-5" />
                  <span className="font-mono font-bold text-lg">{formatTime(timeRemaining)}</span>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={handleManualSubmit}
                disabled={submitting}
                className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                <span>Submit</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="fixed top-20 left-4 bg-white rounded-xl shadow-lg p-4 z-10 hidden lg:block max-h-[calc(100vh-120px)] overflow-y-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Questions</p>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const status = getQuestionStatus(q.question_id);
              const isFlagged = flaggedQuestions.has(q.question_id);
              const isCurrentPage = Math.floor(idx / QUESTIONS_PER_PAGE) === currentPage;

              return (
                <button
                  key={q.question_id}
                  onClick={() => setCurrentPage(Math.floor(idx / QUESTIONS_PER_PAGE))}
                  className={`w-8 h-8 rounded text-xs font-medium relative ${
                    status === 'answered'
                      ? 'bg-emerald-100 text-emerald-700'
                      : isCurrentPage
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600'
                  } ${isCurrentPage ? 'ring-2 ring-primary-500' : ''}`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-500 space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-emerald-100 rounded"></span>
              <span>Answered</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-gray-100 rounded"></span>
              <span>Unanswered</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
              <span>Flagged</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="pt-24 pb-24 px-4">
          <div className="max-w-3xl mx-auto lg:ml-52 space-y-6">
            {currentQuestions.map((question, index) => renderQuestion(question, index))}
          </div>
        </div>

        {/* Fixed Footer Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 z-20">
          <div className="max-w-3xl mx-auto lg:ml-52 px-4 flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous</span>
            </motion.button>

            <div className="flex items-center space-x-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-8 h-8 rounded-full text-sm font-medium ${
                    i === currentPage
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
              disabled={currentPage === totalPages - 1}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Time Warning */}
        <AnimatePresence>
          {showTimeWarning && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50"
            >
              <AlertTriangle className="w-6 h-6" />
              <span className="font-medium">5 minutes remaining!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Switch Warning Overlay */}
        <AnimatePresence>
          {showTabWarning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[100] flex items-center justify-center exam-warning-overlay"
            >
              <div className="text-center max-w-md mx-auto p-8">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <MonitorOff className="w-12 h-12 text-white" />
                </motion.div>

                <h2 className="text-3xl font-bold text-white mb-4">
                  Tab Switch Detected!
                </h2>

                <p className="text-gray-300 mb-4 text-lg">
                  You have left the exam window. This action has been logged.
                </p>

                {/* Violations Warning */}
                <div className="bg-red-900/50 rounded-lg p-4 mb-6">
                  <p className="text-red-300 font-semibold">
                    Warning: {tabSwitchCount} of {exam?.max_tab_switches || MAX_TAB_SWITCHES_BEFORE_SUBMIT} violations
                  </p>
                  <p className="text-red-400 text-sm mt-1">
                    {(exam?.max_tab_switches || MAX_TAB_SWITCHES_BEFORE_SUBMIT) - tabSwitchCount} more and your exam will be auto-submitted!
                  </p>
                </div>

                <div className="mb-8">
                  <div className="text-6xl font-bold text-red-500 mb-2">
                    {tabWarningCountdown}
                  </div>
                  <p className="text-gray-400">
                    seconds until automatic logout
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReturnToExam}
                  className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
                >
                  Return to Exam
                </motion.button>

                <p className="text-gray-500 mt-6 text-sm">
                  Violations: {tabSwitchCount} / {exam?.max_tab_switches || MAX_TAB_SWITCHES_BEFORE_SUBMIT}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Screenshot Warning */}
        <AnimatePresence>
          {showScreenshotWarning && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3 z-50"
            >
              <AlertTriangle className="w-6 h-6" />
              <div>
                <p className="font-bold">Screenshot Attempt Detected!</p>
                <p className="text-sm text-red-200">
                  This action has been logged. ({screenshotAttempts}/3 warnings)
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Warning Overlay */}
        <AnimatePresence>
          {showSecurityWarning && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3 z-50"
            >
              <AlertTriangle className="w-6 h-6" />
              <div>
                <p className="font-bold">{securityMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offline Warning / Pending Submission / Sealed Banner */}
        <AnimatePresence>
          {(showOfflineWarning || pendingSubmission || isSealed) && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3 z-50 max-w-md ${
                sealStatus === 'submitted' ? 'bg-emerald-600' :
                sealStatus === 'submitting' ? 'bg-blue-600' :
                isSealed ? 'bg-purple-600' :
                isOnline ? 'bg-amber-500' : 'bg-red-600'
              } text-white`}
            >
              {sealStatus === 'submitted' ? (
                <CheckCircle className="w-6 h-6" />
              ) : sealStatus === 'submitting' ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : isSealed ? (
                <ShieldCheck className="w-6 h-6" />
              ) : isOnline ? (
                <Wifi className="w-6 h-6" />
              ) : (
                <WifiOff className="w-6 h-6" />
              )}
              <div className="flex-1">
                {sealStatus === 'submitted' ? (
                  <>
                    <p className="font-bold">Exam Submitted Successfully!</p>
                    <p className="text-sm opacity-90">Redirecting to results...</p>
                  </>
                ) : sealStatus === 'submitting' ? (
                  <>
                    <p className="font-bold">Connection restored — submitting your exam...</p>
                    <p className="text-sm opacity-90">Please wait while we submit your sealed answers.</p>
                  </>
                ) : isSealed && !isOnline ? (
                  <>
                    <p className="font-bold flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Answers Locked & Sealed
                    </p>
                    <p className="text-sm opacity-90">
                      Your answers were sealed at {sealedData?.sealed_at ? new Date(sealedData.sealed_at).toLocaleTimeString() : 'N/A'}.
                      Waiting for connection to submit...
                    </p>
                  </>
                ) : isSealed && isOnline ? (
                  <>
                    <p className="font-bold flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Sealed — Ready to Submit
                    </p>
                    <p className="text-sm opacity-90">
                      {submitting ? 'Submitting...' : `Click retry to submit. Attempt ${submissionRetryCount}/${MAX_SUBMISSION_RETRIES}`}
                    </p>
                  </>
                ) : !isOnline ? (
                  <>
                    <p className="font-bold">You are offline</p>
                    <p className="text-sm opacity-90">
                      Your answers are being sealed. They will be submitted when connection returns.
                    </p>
                  </>
                ) : pendingSubmission ? (
                  <>
                    <p className="font-bold">Submitting your exam...</p>
                    <p className="text-sm opacity-90">
                      {submitting ? 'Please wait...' : `Retry attempt ${submissionRetryCount}/${MAX_SUBMISSION_RETRIES}`}
                    </p>
                  </>
                ) : null}
              </div>
              {isOnline && (pendingSubmission || isSealed) && !submitting && sealStatus !== 'submitted' && (
                <button
                  onClick={isSealed ? submitSealedExam : retrySubmission}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                  title="Submit now"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
              {submitting && sealStatus !== 'submitted' && <Loader2 className="w-5 h-5 animate-spin" />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Fullscreen indicator */}
        {exam?.detect_tab_switch && !isFullscreen && !showTabWarning && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={enterFullscreen}
            className="fixed bottom-20 right-4 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-30 hover:bg-amber-600"
          >
            <Maximize className="w-5 h-5" />
            <span className="text-sm font-medium">Enter Fullscreen</span>
          </motion.button>
        )}
      </div>
    );
  }

  // Submitted phase – briefly shown then auto-navigates to result
  if (phase === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 flex items-center justify-center py-8 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted!</h2>
          <p className="text-gray-500 mb-6">Your responses have been recorded successfully. Redirecting to your results...</p>

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(`/student/dashboard/exams/attempt/${attempt.attempt_id}/result`)}
              className="w-full flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-semibold"
            >
              <Eye className="w-5 h-5" />
              <span>View Results</span>
            </motion.button>

            <button
              onClick={() => navigate('/student/dashboard/exams')}
              className="w-full text-gray-600 hover:text-gray-800 py-2 font-medium"
            >
              Back to Exams
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};

export default TakeExam;
