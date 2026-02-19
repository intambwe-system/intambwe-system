import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, Loader2, XCircle, CheckCircle, AlertTriangle } from "lucide-react";
import * as socketService from "../../services/socketService";

/**
 * WaitingApprovalScreen - Reusable component for waiting on teacher resume approval
 *
 * @param {Object} props
 * @param {number|string} props.requestId - The resume request ID
 * @param {string} props.requestUuid - The resume request UUID (for guests)
 * @param {string} props.examTitle - Title of the exam
 * @param {Date|string} props.expiresAt - When the request auto-expires
 * @param {Function} props.onApproved - Callback when approved: (timeRemaining) => void
 * @param {Function} props.onDeclined - Callback when declined: (reason) => void
 * @param {Function} props.onExpired - Callback when request expires
 * @param {Object} props.authData - Auth data for socket: { token } or { sessionToken }
 */
const WaitingApprovalScreen = ({
  requestId,
  requestUuid,
  examTitle,
  expiresAt,
  onApproved,
  onDeclined,
  onExpired,
  authData = {},
}) => {
  const [status, setStatus] = useState("waiting"); // waiting, approved, declined, expired
  const [countdown, setCountdown] = useState(0);
  const [declineReason, setDeclineReason] = useState("");
  const [approvedTimeRemaining, setApprovedTimeRemaining] = useState(null);

  // Calculate initial countdown
  useEffect(() => {
    if (expiresAt) {
      const expiryTime = new Date(expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
      setCountdown(remaining);
    }
  }, [expiresAt]);

  // Countdown timer
  useEffect(() => {
    if (status !== "waiting" || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus("expired");
          onExpired?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, countdown, onExpired]);

  // Socket connection and event listeners
  useEffect(() => {
    // Connect socket with auth
    const socket = socketService.connectSocket(authData);

    // Join the wait room for this request
    socketService.waitForResumeApproval(requestId);

    // Listen for approval
    const cleanupApproved = socketService.onResumeApproved((data) => {
      console.log("Resume approved:", data);
      setStatus("approved");
      setApprovedTimeRemaining(data.time_remaining_seconds);
      setTimeout(() => {
        onApproved?.(data.time_remaining_seconds);
      }, 2000); // Show success message briefly
    });

    // Listen for decline
    const cleanupDeclined = socketService.onResumeDeclined((data) => {
      console.log("Resume declined:", data);
      setStatus("declined");
      setDeclineReason(data.reason || "Your request was declined by the instructor.");
      setTimeout(() => {
        onDeclined?.(data.reason);
      }, 3000); // Show declined message briefly
    });

    // Listen for expiry
    const cleanupExpired = socketService.onResumeExpired(() => {
      console.log("Resume expired");
      setStatus("expired");
      onExpired?.();
    });

    return () => {
      socketService.stopWaitingForApproval(requestId);
      cleanupApproved();
      cleanupDeclined();
      cleanupExpired();
    };
  }, [requestId, authData, onApproved, onDeclined, onExpired]);

  // Format countdown
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center"
      >
        {/* Waiting State */}
        {status === "waiting" && (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-20 h-20 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center"
            >
              <Loader2 className="w-10 h-10 text-blue-600" />
            </motion.div>

            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Session Interrupted
            </h2>

            <p className="text-gray-600 mb-6">
              Your exam session was interrupted. A request to resume has been
              sent to your instructor.
            </p>

            {examTitle && (
              <p className="text-sm text-gray-500 mb-4">
                Exam: <span className="font-medium">{examTitle}</span>
              </p>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 text-amber-700 mb-2">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Waiting for approval</span>
              </div>
              <p className="text-sm text-amber-600">
                Request expires in:{" "}
                <span className="font-mono font-bold">
                  {formatCountdown(countdown)}
                </span>
              </p>
            </div>

            <p className="text-xs text-gray-400">
              Please keep this window open. You will be notified when your
              instructor responds.
            </p>
          </>
        )}

        {/* Approved State */}
        {status === "approved" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="w-10 h-10 text-green-600" />
            </motion.div>

            <h2 className="text-2xl font-bold text-green-700 mb-2">
              Request Approved!
            </h2>

            <p className="text-gray-600 mb-4">
              Your instructor has approved your request. Resuming exam...
            </p>

            {approvedTimeRemaining != null && (
              <p className="text-sm text-gray-500">
                Time remaining:{" "}
                <span className="font-mono font-bold">
                  {formatCountdown(approvedTimeRemaining)}
                </span>
              </p>
            )}
          </>
        )}

        {/* Declined State */}
        {status === "declined" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center"
            >
              <XCircle className="w-10 h-10 text-red-600" />
            </motion.div>

            <h2 className="text-2xl font-bold text-red-700 mb-2">
              Request Declined
            </h2>

            <p className="text-gray-600 mb-4">{declineReason}</p>

            <p className="text-xs text-gray-400">
              Please contact your instructor for more information.
            </p>
          </>
        )}

        {/* Expired State */}
        {status === "expired" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto mb-6 bg-amber-100 rounded-full flex items-center justify-center"
            >
              <AlertTriangle className="w-10 h-10 text-amber-600" />
            </motion.div>

            <h2 className="text-2xl font-bold text-amber-700 mb-2">
              Request Expired
            </h2>

            <p className="text-gray-600 mb-4">
              Your resume request has expired. Please contact your instructor
              to request a new opportunity.
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default WaitingApprovalScreen;
