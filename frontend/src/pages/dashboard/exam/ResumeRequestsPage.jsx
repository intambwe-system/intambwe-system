import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Clock,
  Check,
  X,
  User,
  Mail,
  FileText,
  Loader2,
  RefreshCw,
  AlertTriangle,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import api from "../../../api/api";
import * as socketService from "../../../services/socketService";
import { useEmployeeAuth } from "../../../contexts/EmployeeAuthContext";
import Swal from "sweetalert2";

// Notification sound (simple beep using Web Audio API)
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";
    gainNode.gain.value = 0.3;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);

    // Second beep
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1000;
      osc2.type = "sine";
      gain2.gain.value = 0.3;
      osc2.start();
      osc2.stop(audioContext.currentTime + 0.2);
    }, 250);
  } catch (e) {
    console.log("Audio not supported");
  }
};

// Request browser notification permission
const requestNotificationPermission = async () => {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
};

// Show browser notification
const showBrowserNotification = (title, body) => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      requireInteraction: true,
    });
  }
};

const ResumeRequestsPage = () => {
  const { employee } = useEmployeeAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const socketConnected = useRef(false);

  // Load pending requests
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/exam/resume-requests/pending");
      setRequests(response.data.data || []);
    } catch (error) {
      console.error("Error loading resume requests:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to load resume requests",
        timer: 3000,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup socket connection
  useEffect(() => {
    loadRequests();
    requestNotificationPermission();

    // Connect socket if not already connected
    if (!socketConnected.current) {
      socketService.connectSocket({ token: document.cookie.match(/token=([^;]+)/)?.[1] });
      socketService.joinResumeMonitoring([]);
      socketConnected.current = true;
    }

    // Listen for new requests
    const cleanupNew = socketService.onNewResumeRequest((data) => {
      console.log("New resume request:", data);
      setRequests((prev) => {
        // Avoid duplicates
        if (prev.some((r) => r.request_id === data.request_id)) return prev;
        return [data, ...prev];
      });

      // Play sound and show notification
      if (soundEnabled) {
        playNotificationSound();
      }
      showBrowserNotification(
        "New Resume Request",
        `${data.requester_name} is requesting to resume "${data.exam_title}"`
      );
    });

    return () => {
      cleanupNew();
      socketService.leaveResumeMonitoring();
    };
  }, [loadRequests, soundEnabled]);

  // Countdown timer for requests
  useEffect(() => {
    const timer = setInterval(() => {
      setRequests((prev) =>
        prev.map((req) => {
          const expiresAt = new Date(req.expires_at).getTime();
          const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
          return { ...req, _countdown: remaining };
        }).filter((req) => req._countdown > 0 || !req.expires_at)
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle approve
  const handleApprove = async (requestId) => {
    try {
      setActionLoading(requestId);
      await api.post(`/exam/resume-requests/${requestId}/approve`);

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.request_id !== requestId));

      Swal.fire({
        icon: "success",
        title: "Approved",
        text: "Resume request approved. The student can now continue.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error approving request:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Failed to approve request",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle decline
  const handleDecline = async (requestId) => {
    const { value: reason } = await Swal.fire({
      title: "Decline Resume Request",
      input: "textarea",
      inputLabel: "Reason (optional)",
      inputPlaceholder: "Enter a reason for declining...",
      showCancelButton: true,
      confirmButtonText: "Decline",
      confirmButtonColor: "#ef4444",
    });

    if (reason === undefined) return; // Cancelled

    try {
      setActionLoading(requestId);
      await api.post(`/exam/resume-requests/${requestId}/decline`, { reason });

      // Remove from list
      setRequests((prev) => prev.filter((r) => r.request_id !== requestId));

      Swal.fire({
        icon: "info",
        title: "Declined",
        text: "Resume request has been declined.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error declining request:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "Failed to decline request",
      });
    } finally {
      setActionLoading(null);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return "Expired";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Format server time remaining
  const formatServerTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "Unlimited";
    if (seconds <= 0) return "No time left";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 rounded-xl">
            <Bell className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Resume Requests</h1>
            <p className="text-gray-500 text-sm">
              Students waiting to resume interrupted exams
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-colors ${
              soundEnabled
                ? "bg-green-100 text-green-600"
                : "bg-gray-100 text-gray-400"
            }`}
            title={soundEnabled ? "Sound enabled" : "Sound disabled"}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          {/* Refresh button */}
          <button
            onClick={loadRequests}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-gray-500">Loading requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white rounded-xl shadow-sm border p-12 text-center"
        >
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            No Pending Requests
          </h3>
          <p className="text-gray-400">
            When students request to resume interrupted exams, they will appear here.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {requests.map((request) => (
              <motion.div
                key={request.request_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  {/* Request Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          request.requester_type === "student"
                            ? "bg-blue-100"
                            : "bg-purple-100"
                        }`}
                      >
                        <User
                          className={`w-5 h-5 ${
                            request.requester_type === "student"
                              ? "text-blue-600"
                              : "text-purple-600"
                          }`}
                        />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {request.requester_name}
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            request.requester_type === "student"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {request.requester_type === "student" ? "Student" : "Guest"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{request.requester_email || "N/A"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{request.exam_title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          Time left:{" "}
                          <strong>
                            {formatServerTime(request.server_time_remaining)}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-600 font-medium">
                          Expires in: {formatTimeRemaining(request._countdown)}
                        </span>
                      </div>
                    </div>

                    {request.questions_answered != null && request.total_questions && (
                      <div className="mt-2 text-xs text-gray-500">
                        Progress: {request.questions_answered} / {request.total_questions} questions answered
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleApprove(request.request_id)}
                      disabled={actionLoading === request.request_id}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {actionLoading === request.request_id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Approve
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDecline(request.request_id)}
                      disabled={actionLoading === request.request_id}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default ResumeRequestsPage;
