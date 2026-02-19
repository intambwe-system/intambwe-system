import React, { useState, useEffect, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle, XCircle, Loader2, X } from "lucide-react";
import StudentSidebar from "../components/dashboard/StudentSidebar";
import StudentHeader from "../components/dashboard/StudentHeader";
import * as examService from "../services/examService";

export default function StudentDashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Sealed exam auto-submit state
  const [sealedExamBanner, setSealedExamBanner] = useState(null); // { status: 'checking' | 'submitting' | 'success' | 'error', message: string }
  const [checkedForSealed, setCheckedForSealed] = useState(false);

  // Check for sealed exams on mount
  const checkAndSubmitSealedExams = useCallback(async () => {
    if (checkedForSealed) return;

    try {
      setSealedExamBanner({ status: 'checking', message: 'Checking for pending submissions...' });
      const result = await examService.checkSealedExams();

      if (result.sealed_attempts && result.sealed_attempts.length > 0) {
        // Found sealed exam - auto-submit it
        const sealedAttempt = result.sealed_attempts[0];
        setSealedExamBanner({
          status: 'submitting',
          message: `Submitting your sealed exam: ${sealedAttempt.exam_title || 'Exam'}...`
        });

        try {
          await examService.autoSubmitSealedExam(sealedAttempt.attempt_id);
          setSealedExamBanner({
            status: 'success',
            message: 'Your sealed exam has been submitted successfully!'
          });

          // Hide banner after 5 seconds
          setTimeout(() => setSealedExamBanner(null), 5000);
        } catch (submitErr) {
          console.error('Failed to auto-submit sealed exam:', submitErr);
          setSealedExamBanner({
            status: 'error',
            message: 'Failed to submit sealed exam. Please contact your instructor.'
          });
        }
      } else {
        // No sealed exams found, hide banner
        setSealedExamBanner(null);
      }
    } catch (err) {
      console.error('Error checking sealed exams:', err);
      setSealedExamBanner(null);
    } finally {
      setCheckedForSealed(true);
    }
  }, [checkedForSealed]);

  useEffect(() => {
    // Check for sealed exams when dashboard loads (not during exam)
    const isExamActive = /\/student\/dashboard\/exams\/[^/]+\/take/.test(location.pathname);
    if (!isExamActive && !checkedForSealed) {
      checkAndSubmitSealedExams();
    }
  }, [location.pathname, checkedForSealed, checkAndSubmitSealedExams]);

  // While actively taking an exam, hide the sidebar + header so the student
  // cannot click away to another page.
  const isExamActive = /\/student\/dashboard\/exams\/[^/]+\/take/.test(location.pathname);

  if (isExamActive) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Outlet />
      </main>
    );
  }

  // Sealed exam banner component
  const SealedExamBanner = () => {
    if (!sealedExamBanner) return null;

    const getBannerStyle = () => {
      switch (sealedExamBanner.status) {
        case 'checking':
        case 'submitting':
          return 'bg-blue-600';
        case 'success':
          return 'bg-emerald-600';
        case 'error':
          return 'bg-red-600';
        default:
          return 'bg-gray-600';
      }
    };

    const getIcon = () => {
      switch (sealedExamBanner.status) {
        case 'checking':
        case 'submitting':
          return <Loader2 className="w-5 h-5 animate-spin" />;
        case 'success':
          return <CheckCircle className="w-5 h-5" />;
        case 'error':
          return <XCircle className="w-5 h-5" />;
        default:
          return <Upload className="w-5 h-5" />;
      }
    };

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className={`fixed top-0 left-0 right-0 z-50 ${getBannerStyle()} text-white py-3 px-4 shadow-lg`}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getIcon()}
              <span className="font-medium">{sealedExamBanner.message}</span>
            </div>
            {(sealedExamBanner.status === 'success' || sealedExamBanner.status === 'error') && (
              <button
                onClick={() => setSealedExamBanner(null)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SealedExamBanner />
      <StudentSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <StudentHeader onMenuClick={() => setSidebarOpen(true)} />

        <main className={`flex-1 overflow-y-auto p-6 ${sealedExamBanner ? 'pt-16' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
