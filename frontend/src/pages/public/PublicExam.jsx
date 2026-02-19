import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock, AlertTriangle, ChevronLeft, ChevronRight, Flag, Check,
  Send, Shield, BookOpen, Play, Loader2, X, CheckCircle, XCircle,
  Eye, FileText, Timer, AlertCircle, Lock, Maximize, MonitorOff,
  User, Mail, Phone, ShieldAlert, Camera, Wifi, WifiOff, RefreshCw,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Swal from 'sweetalert2';
import api from '../../api/api';
import WaitingApprovalScreen from '../../components/exam/WaitingApprovalScreen';
import * as examService from '../../services/examService';
import * as socketService from '../../services/socketService';

const QUESTIONS_PER_PAGE = 4;
const TAB_SWITCH_WARNING_SECONDS = 5;
const MAX_TAB_SWITCHES = 3;
const MAX_SCREENSHOT_ATTEMPTS = 3;

const PublicExam = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();

  // Exam state
  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [sessionToken, setSessionToken] = useState(null);

  // UI state
  const [phase, setPhase] = useState('loading');
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [operationStatus, setOperationStatus] = useState(null);

  // Registration form
  const [registrationData, setRegistrationData] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const timerRef = useRef(null);
  const timerEndTimeRef = useRef(null); // Store the actual end timestamp for accurate countdown

  // Security state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [tabWarningCountdown, setTabWarningCountdown] = useState(TAB_SWITCH_WARNING_SECONDS);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [screenshotAttempts, setScreenshotAttempts] = useState(0);
  const [showSecurityWarning, setShowSecurityWarning] = useState(false);
  const [securityMessage, setSecurityMessage] = useState('');
  const [isContentBlurred, setIsContentBlurred] = useState(false);
  const tabWarningTimerRef = useRef(null);
  const tabSwitchCountRef = useRef(0);
  const securityOverlayRef = useRef(null);

  // Offline submission handling
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSubmission, setPendingSubmission] = useState(false);
  const [submissionRetryCount, setSubmissionRetryCount] = useState(0);
  const [showOfflineWarning, setShowOfflineWarning] = useState(false);
  const submissionRetryRef = useRef(null);
  const MAX_SUBMISSION_RETRIES = 10;

  // Sealed exam / Resume request state
  const [checkingSealed, setCheckingSealed] = useState(false);
  const [autoSubmittingSealed, setAutoSubmittingSealed] = useState(false);
  const [resumeRequest, setResumeRequest] = useState(null);
  const [resumeRequestStatus, setResumeRequestStatus] = useState(null); // 'pending', 'approved', 'declined', 'expired'
  const TIMER_PERSIST_INTERVAL = 30000; // Save timer every 30 seconds
  const timerPersistRef = useRef(null);

  // Participant info for watermark
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    email: '',
    timestamp: ''
  });

  // Load exam info
  useEffect(() => {
    loadExamInfo();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (timerPersistRef.current) clearInterval(timerPersistRef.current);
    };
  }, [uuid]);

  // Poll for connection when offline with sealed exam pending
  useEffect(() => {
    if (!autoSubmittingSealed || isOnline) return;

    const pollConnection = setInterval(async () => {
      try {
        // Simple GET to check if we're back online
        await api.get('/');
        setIsOnline(true);
        // Retry the auto-submit
        if (registrationData.email) {
          checkForSealedOrInterruptedExam(registrationData.email);
        }
      } catch {
        // Still offline
      }
    }, 5000);

    return () => clearInterval(pollConnection);
  }, [autoSubmittingSealed, isOnline, registrationData.email]);

  const loadExamInfo = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/public/exam/${uuid}`);
      const examData = res.data.exam;
      setExam(examData);
      setPhase('info');
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Exam not found or not available');
      setPhase('error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message, duration = 4000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const showSecurityAlert = (message) => {
    setSecurityMessage(message);
    setShowSecurityWarning(true);
    setTimeout(() => setShowSecurityWarning(false), 3000);
  };

  // ============================================
  // ENTERPRISE SECURITY IMPLEMENTATION
  // ============================================

  // Fullscreen functions
  const enterFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
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
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
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
    if (phase !== 'exam') return;

    const handleFullscreenChange = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement ||
                      document.mozFullScreenElement || document.msFullscreenElement);
      setIsFullscreen(isFs);

      if (!isFs && exam?.detect_tab_switch) {
        handleTabSwitch();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [phase, exam]);

  // Screenshot and Security Detection
  useEffect(() => {
    if (phase !== 'exam') return;

    const handleKeyDown = (e) => {
      // PrintScreen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        handleScreenshotAttempt('PrintScreen key detected');
        return false;
      }

      // Windows Snipping Tool (Win + Shift + S)
      if ((e.metaKey || e.key === 'Meta') && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleScreenshotAttempt('Snipping tool shortcut detected');
        return false;
      }

      // Mac screenshots (Cmd + Shift + 3/4/5)
      if (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        handleScreenshotAttempt('Mac screenshot shortcut detected');
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

      // Alt+Tab detection (blur will handle this)
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

    // Prevent copy
    const handleCopy = (e) => {
      if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        showSecurityAlert('Copying is disabled');
        return false;
      }
    };

    // Prevent paste (except in inputs)
    const handlePaste = (e) => {
      // Allow paste in inputs
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

    // DevTools detection via debugger
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
    document.addEventListener('paste', handlePaste);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      clearInterval(devToolsCheck);
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      document.removeEventListener('keyup', handleKeyDown, { capture: true });
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [phase]);

  // Online/Offline detection and automatic submission retry
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineWarning(false);
      if (pendingSubmission && phase === 'exam') {
        retrySubmission();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      if (phase === 'exam') {
        setShowOfflineWarning(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (submissionRetryRef.current) {
        clearTimeout(submissionRetryRef.current);
      }
    };
  }, [pendingSubmission, phase]);

  // Timer persistence - save remaining time to localStorage every 30 seconds
  useEffect(() => {
    if (phase !== 'exam' || !timeRemaining || !registrationData.email || !exam?.exam_id) return;

    const persistTimer = () => {
      const key = `exam_timer_${registrationData.email}_${exam.exam_id}`;
      localStorage.setItem(key, JSON.stringify({
        timeRemaining,
        savedAt: Date.now(),
        attemptId: attempt?.attempt_id
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
  }, [phase, timeRemaining, registrationData.email, exam?.exam_id, attempt?.attempt_id]);

  // Check for sealed exams when email is provided
  const checkForSealedOrInterruptedExam = async (email) => {
    try {
      setCheckingSealed(true);
      const result = await examService.checkSealedExamsPublic(email);

      if (result.sealed_attempts && result.sealed_attempts.length > 0) {
        // Found sealed exam - auto-submit it
        const sealedAttempt = result.sealed_attempts[0];
        setAutoSubmittingSealed(true);

        try {
          const submitResult = await examService.autoSubmitSealedExamPublic(
            sealedAttempt.attempt_id,
            email
          );

          // Navigate to result page
          showToast('success', 'Your previously sealed exam has been submitted.');
          navigate(`/public/exam/${uuid}/result/${sealedAttempt.attempt_id}?auto=true`);
          return { handled: true };
        } catch (submitErr) {
          console.error('Failed to auto-submit sealed exam:', submitErr);
          showToast('error', 'Failed to submit sealed exam. Please try again.');
          setAutoSubmittingSealed(false);
        }
      }

      if (result.in_progress_attempts && result.in_progress_attempts.length > 0) {
        // Found interrupted (non-sealed) exam - need resume approval
        const interruptedAttempt = result.in_progress_attempts[0];

        // Check if this exam matches current UUID
        if (interruptedAttempt.exam_uuid === uuid) {
          // Create resume request
          try {
            const resumeResult = await examService.createResumeRequestPublic(
              interruptedAttempt.attempt_id,
              email,
              registrationData.full_name
            );

            setResumeRequest(resumeResult.request);
            setResumeRequestStatus('pending');
            setPhase('waiting_approval');
            return { handled: true };
          } catch (resumeErr) {
            console.error('Failed to create resume request:', resumeErr);
            showToast('error', 'Failed to request exam resume. Please contact instructor.');
          }
        }
      }

      return { handled: false };
    } catch (err) {
      console.error('Error checking sealed exams:', err);
      // If 404 or no sealed exams, continue normally
      return { handled: false };
    } finally {
      setCheckingSealed(false);
    }
  };

  // Handle resume request approval/decline via socket
  const handleResumeApproved = useCallback((data) => {
    setResumeRequestStatus('approved');
    showToast('success', 'Your resume request was approved!');

    // Restore timer from localStorage if available
    const timerKey = `exam_timer_${registrationData.email}_${exam?.exam_id}`;
    const savedTimer = localStorage.getItem(timerKey);

    setTimeout(() => {
      // Resume the exam with remaining time from server
      if (data.time_remaining_seconds) {
        setTimeRemaining(data.time_remaining_seconds);
      } else if (savedTimer) {
        const parsed = JSON.parse(savedTimer);
        const elapsed = Math.floor((Date.now() - parsed.savedAt) / 1000);
        const remaining = Math.max(0, parsed.timeRemaining - elapsed);
        setTimeRemaining(remaining);
      }

      // Transition to exam phase
      setPhase('exam');
      startTimer(data.time_remaining_seconds || timeRemaining);
    }, 1500);
  }, [registrationData.email, exam?.exam_id]);

  const handleResumeDeclined = useCallback((data) => {
    setResumeRequestStatus('declined');
    showToast('error', data.reason || 'Your resume request was declined.');
  }, []);

  const handleResumeExpired = useCallback(() => {
    setResumeRequestStatus('expired');
    showToast('error', 'Your resume request has expired.');
  }, []);

  // Retry submission function for offline recovery
  const retrySubmission = async () => {
    if (!pendingSubmission || !attempt?.attempt_id) return;
    if (submissionRetryCount >= MAX_SUBMISSION_RETRIES) {
      showToast('error', 'Maximum retry attempts reached. Please contact the exam administrator.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmissionRetryCount(prev => prev + 1);
      showToast('info', `Retrying submission... (Attempt ${submissionRetryCount + 1})`);

      const res = await api.post(`/public/exam/attempt/${attempt.attempt_id}/submit`, {
        session_token: sessionToken
      });

      const data = res.data;
      setPendingSubmission(false);
      setSubmissionRetryCount(0);
      exitFullscreen();
      setAttempt(prev => ({ ...prev, ...data.attempt }));
      setPhase('submitted');
      localStorage.removeItem(`public_exam_${uuid}`);
      showToast('success', 'Exam submitted successfully!');
    } catch (err) {
      console.error('Retry submission failed:', err);
      const backoffTime = Math.min(5000 * Math.pow(2, submissionRetryCount), 30000);
      showToast('error', `Submission failed. Retrying in ${backoffTime / 1000} seconds...`);

      submissionRetryRef.current = setTimeout(() => {
        if (navigator.onLine) {
          retrySubmission();
        }
      }, backoffTime);
      setSubmitting(false);
    }
  };

  // CSS Security Styles
  useEffect(() => {
    if (phase !== 'exam') return;

    const styleElement = document.createElement('style');
    styleElement.id = 'exam-security-styles';
    styleElement.textContent = `
      /* Prevent selection globally */
      .exam-secure-mode {
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        -webkit-touch-callout: none !important;
      }

      .exam-secure-mode * {
        user-select: none !important;
        -webkit-user-select: none !important;
      }

      /* Allow selection in inputs */
      .exam-secure-mode input,
      .exam-secure-mode textarea {
        user-select: text !important;
        -webkit-user-select: text !important;
      }

      /* Print protection */
      @media print {
        .exam-secure-mode, .exam-secure-mode * {
          display: none !important;
          visibility: hidden !important;
        }
        body::before {
          content: "PRINTING IS NOT ALLOWED - EXAM CONTENT PROTECTED";
          display: block !important;
          font-size: 48px;
          color: red;
          text-align: center;
          padding: 200px 50px;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: white;
          z-index: 999999;
        }
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

      /* Watermark styles */
      .exam-watermark {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        pointer-events: none;
        z-index: 1000;
        overflow: hidden;
      }

      .exam-watermark-text {
        position: absolute;
        font-size: 14px;
        color: rgba(0, 0, 0, 0.06);
        white-space: nowrap;
        transform: rotate(-45deg);
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 2px;
      }
    `;
    document.head.appendChild(styleElement);

    // Add secure mode class to body
    document.body.classList.add('exam-secure-mode');

    return () => {
      const style = document.getElementById('exam-security-styles');
      if (style) style.remove();
      document.body.classList.remove('exam-secure-mode');
    };
  }, [phase]);

  // Screenshot attempt handler
  const handleScreenshotAttempt = useCallback((method) => {
    const newCount = screenshotAttempts + 1;
    setScreenshotAttempts(newCount);
    showSecurityAlert(`Screenshot attempt blocked! (${newCount}/${MAX_SCREENSHOT_ATTEMPTS})`);

    // Log to server
    if (attempt?.attempt_id && sessionToken) {
      api.post(`/public/exam/attempt/${attempt.attempt_id}/tab-switch`, {
        session_token: sessionToken,
        violation_type: 'screenshot',
        method
      }).catch(console.error);
    }

    if (newCount >= MAX_SCREENSHOT_ATTEMPTS) {
      handleAutoSubmitAndLogout('Too many screenshot attempts detected. Your exam has been submitted.');
    }
  }, [screenshotAttempts, attempt, sessionToken]);

  // Tab switch detection
  const handleTabSwitch = useCallback(() => {
    if (phase !== 'exam' || !exam?.detect_tab_switch) return;

    tabSwitchCountRef.current += 1;
    const newCount = tabSwitchCountRef.current;
    setTabSwitchCount(newCount);

    // Log to server
    if (attempt?.attempt_id && sessionToken) {
      api.post(`/public/exam/attempt/${attempt.attempt_id}/tab-switch`, {
        session_token: sessionToken
      }).catch(console.error);
    }

    const maxSwitches = exam?.max_tab_switches || MAX_TAB_SWITCHES;
    if (newCount >= maxSwitches) {
      handleAutoSubmitAndLogout(`Maximum tab switches (${maxSwitches}) exceeded. Your exam has been submitted.`);
      return;
    }

    setShowTabWarning(true);
    setTabWarningCountdown(TAB_SWITCH_WARNING_SECONDS);

    if (tabWarningTimerRef.current) {
      clearInterval(tabWarningTimerRef.current);
    }

    tabWarningTimerRef.current = setInterval(() => {
      setTabWarningCountdown(prev => {
        if (prev <= 1) {
          clearInterval(tabWarningTimerRef.current);
          handleAutoSubmitAndLogout('You did not return to the exam in time.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [phase, exam, attempt, sessionToken]);

  const handleReturnToExam = useCallback(() => {
    if (tabWarningTimerRef.current) {
      clearInterval(tabWarningTimerRef.current);
    }
    setShowTabWarning(false);
    setTabWarningCountdown(TAB_SWITCH_WARNING_SECONDS);
    if (exam?.detect_tab_switch) {
      enterFullscreen();
    }
  }, [exam, enterFullscreen]);

  const handleAutoSubmitAndLogout = useCallback(async (message) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (tabWarningTimerRef.current) clearInterval(tabWarningTimerRef.current);

    if (attempt?.attempt_id && sessionToken) {
      try {
        setSubmitting(true);
        await api.post(`/public/exam/attempt/${attempt.attempt_id}/submit`, {
          session_token: sessionToken
        });
      } catch (err) {
        console.error('Failed to submit on auto-logout:', err);
      }
    }

    exitFullscreen();
    showToast('error', message);

    setTimeout(() => {
      localStorage.removeItem(`public_exam_${uuid}`);
      window.location.href = '/';
    }, 3000);
  }, [attempt, sessionToken, uuid, exitFullscreen]);

  // Tab switch detection effect
  useEffect(() => {
    if (phase !== 'exam' || !exam?.detect_tab_switch) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabSwitch();
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
  }, [phase, exam, handleTabSwitch]);

  // Seal exam on page unload (browser close, PC shutdown, refresh)
  useEffect(() => {
    if (phase !== 'exam' || !attempt?.attempt_id || !sessionToken) return;

    const handleBeforeUnload = (e) => {
      // Seal the exam using sendBeacon for reliability
      const sealData = JSON.stringify({
        session_token: sessionToken,
        time_remaining_seconds: timeRemaining,
        responses: responses
      });

      // Use sendBeacon for reliability during page unload
      const baseUrl = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || '';
      navigator.sendBeacon(
        `${baseUrl}/api/public/exam/attempt/${attempt.attempt_id}/seal`,
        new Blob([sealData], { type: 'application/json' })
      );

      // Show browser confirmation dialog
      e.preventDefault();
      e.returnValue = 'Your exam will be paused. You will need instructor approval to resume.';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [phase, attempt?.attempt_id, sessionToken, timeRemaining, responses]);

  // Generate watermark positions
  const generateWatermarks = () => {
    if (!participantInfo.name) return null;

    const watermarks = [];
    const watermarkText = `${participantInfo.name} | ${participantInfo.email} | ${participantInfo.timestamp}`;

    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 5; col++) {
        watermarks.push(
          <span
            key={`wm-${row}-${col}`}
            className="exam-watermark-text"
            style={{
              top: `${row * 200 + 50}px`,
              left: `${col * 400 - 100}px`,
            }}
          >
            {watermarkText}
          </span>
        );
      }
    }
    return watermarks;
  };

  // ============================================
  // EXAM FLOW HANDLERS
  // ============================================

  const handleProceed = () => {
    if (exam.require_participant_info) {
      setPhase('registration');
    } else if (exam.has_password) {
      setPhase('password');
    } else {
      handleStartExam();
    }
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    const errors = {};

    if (!registrationData.full_name.trim()) {
      errors.full_name = 'Name is required';
    }
    if (!registrationData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(registrationData.email)) {
      errors.email = 'Invalid email format';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    // Store participant info for watermark
    setParticipantInfo({
      name: registrationData.full_name,
      email: registrationData.email,
      timestamp: new Date().toLocaleString()
    });

    // Check for sealed or interrupted exams before proceeding
    const { handled } = await checkForSealedOrInterruptedExam(registrationData.email);
    if (handled) {
      return; // Already handling sealed/interrupted exam
    }

    if (exam.has_password) {
      setPhase('password');
    } else {
      handleStartExam();
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!registrationData.password.trim()) {
      setFormErrors({ password: 'Password is required' });
      return;
    }
    handleStartExam();
  };

  const handleStartExam = async () => {
    try {
      setLoading(true);

      const res = await api.post(`/public/exam/${uuid}/start`, {
        full_name: registrationData.full_name,
        email: registrationData.email,
        phone: registrationData.phone,
        password: registrationData.password
      });

      const data = res.data;
      setSessionToken(data.session_token);
      setAttempt(data.attempt);
      setQuestions(data.questions || []);
      setTimeRemaining(data.time_remaining_seconds);

      // Update participant info
      setParticipantInfo({
        name: registrationData.full_name || 'Anonymous',
        email: registrationData.email || 'N/A',
        timestamp: new Date().toLocaleString()
      });

      // Store session
      localStorage.setItem(`public_exam_${uuid}`, JSON.stringify({
        session_token: data.session_token,
        attempt_id: data.attempt.attempt_id
      }));

      setPhase('exam');
      startTimer(data.time_remaining_seconds);

      if (exam.detect_tab_switch) {
        setTimeout(() => enterFullscreen(), 500);
      }
    } catch (err) {
      if (err.response?.data?.message?.includes('password')) {
        setFormErrors({ password: 'Invalid password' });
        setPhase('password');
      } else {
        showToast('error', err.response?.data?.message || 'Failed to start exam');
      }
    } finally {
      setLoading(false);
    }
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

    setResponses(prev => ({ ...prev, [questionId]: responseData }));

    try {
      await api.put(`/public/exam/attempt/${attempt.attempt_id}/response`, {
        session_token: sessionToken,
        question_id: questionId,
        ...responseData
      });
    } catch (err) {
      console.error('Failed to save response:', err);
    }
  };

  const toggleFlag = (questionId) => {
    const newFlagged = new Set(flaggedQuestions);
    if (newFlagged.has(questionId)) {
      newFlagged.delete(questionId);
    } else {
      newFlagged.add(questionId);
    }
    setFlaggedQuestions(newFlagged);
  };

  // Submit handling
  const handleAutoSubmit = async () => {
    showToast('error', 'Time expired! Auto-submitting your exam...');
    await submitExam();
  };

  const handleManualSubmit = async () => {
    const answeredCount = Object.keys(responses).filter(qId => {
      const r = responses[qId];
      return r.selected_option_id || r.selected_option_ids?.length || r.text_response;
    }).length;

    const unansweredCount = questions.length - answeredCount;

    if (unansweredCount > 0) {
      const result = await Swal.fire({
        title: 'Unanswered Questions',
        text: `You have ${unansweredCount} unanswered question(s). Are you sure you want to submit?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, Submit',
        cancelButtonText: 'Go Back',
      });
      if (!result.isConfirmed) return;
    }

    await submitExam();
  };

  const submitExam = async () => {
    // Check if offline - save locally and queue for retry
    if (!navigator.onLine) {
      showToast('warning', 'You are offline. Your answers are saved locally and will be submitted when connection returns.');
      setPendingSubmission(true);
      setShowOfflineWarning(true);
      // Responses are already saved via handleResponseChange
      return;
    }

    try {
      setSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const res = await api.post(`/public/exam/attempt/${attempt.attempt_id}/submit`, {
        session_token: sessionToken
      });

      const data = res.data;
      setPendingSubmission(false);
      setSubmissionRetryCount(0);
      exitFullscreen();
      setAttempt(prev => ({ ...prev, ...data.attempt }));
      setPhase('submitted');

      localStorage.removeItem(`public_exam_${uuid}`);
      showToast('success', 'Exam submitted successfully!');
    } catch (err) {
      // Check if it's a network error
      if (!navigator.onLine || err.code === 'ERR_NETWORK' || err.message?.includes('Network')) {
        showToast('warning', 'Network error. Your answers are saved locally. Will retry when connection returns.');
        setPendingSubmission(true);
        setShowOfflineWarning(true);

        // Start retry mechanism with exponential backoff
        submissionRetryRef.current = setTimeout(() => {
          if (navigator.onLine) {
            retrySubmission();
          }
        }, 5000);
      } else {
        showToast('error', err.response?.data?.message || 'Failed to submit exam');
      }
      setSubmitting(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const currentQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  // Render question
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
          >
            <Flag className="w-4 h-4" fill={isFlagged ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Question Image */}
        {question.image_url && (
          <div className="mb-4">
            <img
              src={question.image_url}
              alt="Question"
              className="max-w-full h-auto rounded-lg border border-gray-200"
              style={{ maxHeight: '300px' }}
              onContextMenu={(e) => e.preventDefault()}
              draggable={false}
            />
          </div>
        )}

        <p className="text-gray-900 font-medium mb-4 text-lg">{question.question_text}</p>

        {/* MCQ Single */}
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

        {/* MCQ Multiple */}
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

        {/* Fill in blank */}
        {question.question_type === 'fill_in_blank' && (
          <input
            type="text"
            value={response.text_response || ''}
            onChange={(e) => handleResponseChange(question.question_id, e.target.value, 'text')}
            placeholder="Type your answer here..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
            autoComplete="off"
            spellCheck="false"
          />
        )}

        {/* Essay/Short answer */}
        {['short_answer', 'essay'].includes(question.question_type) && (
          <div>
            <textarea
              value={response.text_response || ''}
              onChange={(e) => handleResponseChange(question.question_id, e.target.value, 'text')}
              placeholder="Type your answer here..."
              rows={question.question_type === 'essay' ? 8 : 4}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 resize-y"
              autoComplete="off"
              spellCheck="false"
            />
            {(question.word_limit_min || question.word_limit_max) && (
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>Word count: {(response.text_response || '').split(/\s+/).filter(w => w).length}</span>
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

  // ============================================
  // RENDER PHASES
  // ============================================

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

  // Error state
  if (phase === 'error') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-xl text-center max-w-md">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Exam Not Available</h2>
          <p className="text-gray-500">This exam is not available or the link is invalid.</p>
        </div>
      </div>
    );
  }

  // Info phase
  if (phase === 'info' && exam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-8 text-white">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{exam.title}</h1>
                  <p className="text-primary-200">{exam.subject?.sbj_name || 'Assessment'}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {exam.description && (
                <p className="text-gray-600">{exam.description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <FileText className="w-6 h-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold text-gray-900">{exam.question_count || 0}</p>
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

              {exam.instructions && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    Instructions
                  </h3>
                  <div className="text-blue-800 whitespace-pre-wrap text-sm">
                    {exam.instructions}
                  </div>
                </div>
              )}

              {/* Security Notice */}
              {exam.detect_tab_switch && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center">
                    <ShieldAlert className="w-5 h-5 mr-2" />
                    Security Notice
                  </h3>
                  <ul className="text-amber-800 text-sm space-y-2">
                    <li className="flex items-start">
                      <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>This exam will open in fullscreen mode</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Tab switching is monitored. Max allowed: <strong>{exam.max_tab_switches || 3}</strong></span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Screenshots and screen recording are blocked</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                      <span>Your identity will be watermarked on the exam</span>
                    </li>
                  </ul>
                </div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleProceed}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg"
              >
                <Play className="w-6 h-6" />
                <span>Start Exam</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Registration phase
  if (phase === 'registration') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center py-8 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Enter Your Details</h2>
            <p className="text-gray-500 mt-2">Please provide your information to continue</p>
          </div>

          <form onSubmit={handleRegistrationSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={registrationData.full_name}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, full_name: e.target.value }))}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg ${formErrors.full_name ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="Enter your full name"
                />
              </div>
              {formErrors.full_name && <p className="text-red-500 text-sm mt-1">{formErrors.full_name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={registrationData.email}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full pl-10 pr-4 py-3 border-2 rounded-lg ${formErrors.email ? 'border-red-500' : 'border-gray-200'}`}
                  placeholder="Enter your email"
                />
              </div>
              {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={registrationData.phone}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg"
                  placeholder="Enter your phone number"
                />
              </div>
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-semibold"
            >
              <span>Continue</span>
              <ChevronRight className="w-5 h-5" />
            </motion.button>

            <button
              type="button"
              onClick={() => setPhase('info')}
              className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm"
            >
              Back
            </button>
          </form>
        </motion.div>
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
            <p className="text-gray-500 mt-2">Enter the password provided by the exam administrator</p>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div className="mb-4">
              <input
                type="password"
                value={registrationData.password}
                onChange={(e) => {
                  setRegistrationData(prev => ({ ...prev, password: e.target.value }));
                  setFormErrors({});
                }}
                placeholder="Enter access password"
                className={`w-full px-4 py-3 border-2 rounded-lg ${formErrors.password ? 'border-red-500' : 'border-gray-200'}`}
                autoFocus
              />
              {formErrors.password && <p className="text-red-500 text-sm mt-2">{formErrors.password}</p>}
            </div>

            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Start Exam</span>
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => setPhase(exam.require_participant_info ? 'registration' : 'info')}
              className="w-full text-gray-500 hover:text-gray-700 py-2 mt-3 text-sm"
            >
              Back
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
        requestUuid={resumeRequest?.uuid}
        examTitle={exam?.title}
        status={resumeRequestStatus}
        isPublic={true}
        onApproved={handleResumeApproved}
        onDeclined={handleResumeDeclined}
        onExpired={handleResumeExpired}
        onCancel={() => {
          setResumeRequest(null);
          setResumeRequestStatus(null);
          setPhase('registration');
        }}
      />
    );
  }

  // Auto-submitting sealed exam phase
  if (autoSubmittingSealed || checkingSealed) {
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

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {autoSubmittingSealed ? 'Submitting Your Exam...' : 'Checking for Previous Exams...'}
          </h2>
          <p className="text-gray-500 mb-6">
            {autoSubmittingSealed
              ? 'We found a previously sealed exam. Submitting it now...'
              : 'Please wait while we check your exam status...'}
          </p>

          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            <span className="text-gray-600">Please wait...</span>
          </div>

          {!isOnline && (
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-amber-700">
                <WifiOff className="w-5 h-5" />
                <span className="text-sm font-medium">You are offline</span>
              </div>
              <p className="text-amber-600 text-sm mt-1">
                Will retry automatically when connection returns...
              </p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // Exam phase
  if (phase === 'exam') {
    return (
      <div className="min-h-screen bg-gray-100">
        {/* Watermark Overlay */}
        <div className="exam-watermark" ref={securityOverlayRef}>
          {generateWatermarks()}
        </div>

        {/* Header */}
        <div className="fixed top-0 left-0 right-0 bg-white shadow-md z-20">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-semibold text-gray-900 truncate">{exam.title}</h1>
                <p className="text-sm text-gray-500">Page {currentPage + 1} of {totalPages}</p>
              </div>

              {/* Security Status */}
              <div className="flex items-center space-x-2">
                {exam.detect_tab_switch && (
                  <div className="flex items-center space-x-1 px-3 py-1 bg-gray-100 rounded-full text-xs">
                    <Shield className="w-3 h-3 text-green-600" />
                    <span className="text-gray-600">Secure Mode</span>
                  </div>
                )}
              </div>

              {timeRemaining !== null && (
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                  timeRemaining <= 300 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
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
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span>Submit</span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="pt-24 pb-24 px-4">
          <div className="max-w-3xl mx-auto space-y-6">
            {currentQuestions.map((question, index) => renderQuestion(question, index))}
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 z-20">
          <div className="max-w-3xl mx-auto px-4 flex items-center justify-between">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
              disabled={currentPage === 0}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
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
                    i === currentPage ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Security Warning Overlay */}
        <AnimatePresence>
          {showSecurityWarning && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3 z-50"
            >
              <Camera className="w-6 h-6" />
              <div>
                <p className="font-bold">{securityMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offline Warning / Pending Submission Banner */}
        <AnimatePresence>
          {(showOfflineWarning || pendingSubmission) && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-4 rounded-lg shadow-xl flex items-center space-x-3 z-50 ${
                isOnline ? 'bg-amber-500' : 'bg-red-600'
              } text-white`}
            >
              {isOnline ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
              <div className="flex-1">
                {!isOnline ? (
                  <>
                    <p className="font-bold">You are offline</p>
                    <p className="text-sm opacity-90">
                      Your answers are saved locally. They will be submitted when connection returns.
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
              {isOnline && pendingSubmission && !submitting && (
                <button
                  onClick={retrySubmission}
                  className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                  title="Retry now"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              )}
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Warning Overlay */}
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

                <h2 className="text-3xl font-bold text-white mb-4">Tab Switch Detected!</h2>
                <p className="text-gray-300 mb-4">You have left the exam window.</p>

                <div className="bg-red-900/50 rounded-lg p-4 mb-6">
                  <p className="text-red-300 font-semibold">
                    Warning: {tabSwitchCount} of {exam?.max_tab_switches || MAX_TAB_SWITCHES} violations
                  </p>
                  <p className="text-red-400 text-sm mt-1">
                    {(exam?.max_tab_switches || MAX_TAB_SWITCHES) - tabSwitchCount} more and your exam will be auto-submitted!
                  </p>
                </div>

                <div className="mb-8">
                  <div className="text-6xl font-bold text-red-500 mb-2">{tabWarningCountdown}</div>
                  <p className="text-gray-400">seconds until automatic submission</p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleReturnToExam}
                  className="bg-white text-gray-900 px-8 py-4 rounded-xl font-bold text-lg"
                >
                  Return to Exam
                </motion.button>
              </div>
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

  // Submitted phase
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
          <p className="text-gray-500 mb-6">Your responses have been recorded successfully. View your results below.</p>

          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              onClick={() => navigate(`/public/exam/${uuid}/result/${attempt.attempt_id}?token=${sessionToken}`)}
              className="w-full flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white py-3 px-6 rounded-lg font-semibold"
            >
              <Eye className="w-5 h-5" />
              <span>View Results</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};

export default PublicExam;
