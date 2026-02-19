const {
  ResumeRequest,
  Exam,
  ExamAttempt,
  Student,
  GuestParticipant,
  Employee,
  Subject,
} = require("../../model");
const { Op } = require("sequelize");
const socketService = require("../../services/socketService");

// Request expiry time in milliseconds (10 minutes)
const REQUEST_EXPIRY_MS = 10 * 60 * 1000;

/**
 * Create a resume request (student)
 * POST /api/student/exam/resume-request
 */
const createResumeRequestStudent = async (req, res) => {
  try {
    const std_id = req.student.std_id;
    const { attempt_id, time_remaining_seconds } = req.body;

    // Find the attempt
    const attempt = await ExamAttempt.findByPk(attempt_id, {
      include: [
        {
          model: Exam,
          as: "exam",
          include: [{ model: Subject, as: "subject" }],
        },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify ownership
    if (attempt.std_id !== std_id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    // Must be in_progress
    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Attempt is not in progress",
      });
    }

    // Check if there's already a pending request for this attempt
    const existingRequest = await ResumeRequest.findOne({
      where: {
        attempt_id,
        status: "pending",
      },
    });

    if (existingRequest) {
      return res.json({
        success: true,
        message: "Resume request already pending",
        data: { request: existingRequest },
      });
    }

    // Get student info
    const student = await Student.findByPk(std_id);

    // Calculate server-side time remaining
    let serverTimeRemaining = null;
    if (attempt.exam.has_time_limit) {
      const examEndTime = new Date(attempt.started_at);
      examEndTime.setMinutes(examEndTime.getMinutes() + attempt.exam.time_limit_minutes);
      serverTimeRemaining = Math.max(0, Math.floor((examEndTime - new Date()) / 1000));
    }

    // Create the request
    const request = await ResumeRequest.create({
      exam_id: attempt.exam_id,
      attempt_id,
      std_id,
      requester_type: "student",
      requester_name: `${student.std_fname} ${student.std_lname}`.trim(),
      requester_email: student.std_email,
      time_remaining_seconds: time_remaining_seconds || null,
      server_time_remaining: serverTimeRemaining,
      original_started_at: attempt.started_at,
      interrupted_at: new Date(),
      expires_at: new Date(Date.now() + REQUEST_EXPIRY_MS),
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.get("User-Agent"),
    });

    // Notify teachers via socket
    socketService.notifyNewResumeRequest(attempt.exam_id, {
      request_id: request.request_id,
      uuid: request.uuid,
      exam_id: attempt.exam_id,
      exam_title: attempt.exam.title,
      subject_name: attempt.exam.subject?.sbj_name,
      requester_type: "student",
      requester_name: request.requester_name,
      requester_email: request.requester_email,
      time_remaining_seconds: request.time_remaining_seconds,
      server_time_remaining: serverTimeRemaining,
      expires_at: request.expires_at,
      created_at: request.createdAt,
    });

    res.json({
      success: true,
      message: "Resume request created",
      data: {
        request_id: request.request_id,
        uuid: request.uuid,
        expires_at: request.expires_at,
      },
    });
  } catch (error) {
    console.error("Error creating resume request (student):", error);
    res.status(500).json({
      success: false,
      message: "Failed to create resume request",
    });
  }
};

/**
 * Create a resume request (guest)
 * POST /api/public/exam/resume-request
 */
const createResumeRequestGuest = async (req, res) => {
  try {
    const { attempt_id, session_token, time_remaining_seconds } = req.body;

    // Find the attempt
    const attempt = await ExamAttempt.findByPk(attempt_id, {
      include: [
        {
          model: Exam,
          as: "exam",
          include: [{ model: Subject, as: "subject" }],
        },
        { model: GuestParticipant, as: "guest" },
      ],
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Attempt not found",
      });
    }

    // Verify session token
    if (!attempt.guest || attempt.guest.session_token !== session_token) {
      return res.status(403).json({
        success: false,
        message: "Invalid session token",
      });
    }

    // Must be in_progress
    if (attempt.status !== "in_progress") {
      return res.status(400).json({
        success: false,
        message: "Attempt is not in progress",
      });
    }

    // Check for existing pending request
    const existingRequest = await ResumeRequest.findOne({
      where: {
        attempt_id,
        status: "pending",
      },
    });

    if (existingRequest) {
      return res.json({
        success: true,
        message: "Resume request already pending",
        data: { request: existingRequest },
      });
    }

    // Calculate server-side time remaining
    let serverTimeRemaining = null;
    if (attempt.exam.has_time_limit) {
      const examEndTime = new Date(attempt.started_at);
      examEndTime.setMinutes(examEndTime.getMinutes() + attempt.exam.time_limit_minutes);
      serverTimeRemaining = Math.max(0, Math.floor((examEndTime - new Date()) / 1000));
    }

    // Create the request
    const request = await ResumeRequest.create({
      exam_id: attempt.exam_id,
      attempt_id,
      guest_id: attempt.guest_id,
      requester_type: "guest",
      requester_name: attempt.guest.full_name,
      requester_email: attempt.guest.email,
      time_remaining_seconds: time_remaining_seconds || null,
      server_time_remaining: serverTimeRemaining,
      original_started_at: attempt.started_at,
      interrupted_at: new Date(),
      expires_at: new Date(Date.now() + REQUEST_EXPIRY_MS),
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.get("User-Agent"),
    });

    // Notify teachers via socket
    socketService.notifyNewResumeRequest(attempt.exam_id, {
      request_id: request.request_id,
      uuid: request.uuid,
      exam_id: attempt.exam_id,
      exam_title: attempt.exam.title,
      subject_name: attempt.exam.subject?.sbj_name,
      requester_type: "guest",
      requester_name: request.requester_name,
      requester_email: request.requester_email,
      time_remaining_seconds: request.time_remaining_seconds,
      server_time_remaining: serverTimeRemaining,
      expires_at: request.expires_at,
      created_at: request.createdAt,
    });

    res.json({
      success: true,
      message: "Resume request created",
      data: {
        request_id: request.request_id,
        uuid: request.uuid,
        expires_at: request.expires_at,
      },
    });
  } catch (error) {
    console.error("Error creating resume request (guest):", error);
    res.status(500).json({
      success: false,
      message: "Failed to create resume request",
    });
  }
};

/**
 * Get pending resume requests for teacher
 * GET /api/exam/resume-requests/pending
 */
const getPendingRequests = async (req, res) => {
  try {
    const emp_id = req.employee.emp_id;
    const emp_role = req.employee.emp_role;

    // Build exam filter based on role
    let examWhere = {};
    if (emp_role !== "admin") {
      // Teachers see requests for exams they created
      examWhere.created_by = emp_id;
    }

    // First, expire old requests
    await ResumeRequest.update(
      { status: "expired" },
      {
        where: {
          status: "pending",
          expires_at: { [Op.lt]: new Date() },
        },
      }
    );

    // Get pending requests
    const requests = await ResumeRequest.findAll({
      where: { status: "pending" },
      include: [
        {
          model: Exam,
          as: "exam",
          where: examWhere,
          include: [{ model: Subject, as: "subject" }],
        },
        { model: Student, as: "student" },
        { model: GuestParticipant, as: "guest" },
        { model: ExamAttempt, as: "attempt" },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: requests.map((r) => ({
        request_id: r.request_id,
        uuid: r.uuid,
        exam_id: r.exam_id,
        attempt_id: r.attempt_id,
        exam_title: r.exam?.title,
        subject_name: r.exam?.subject?.sbj_name,
        requester_type: r.requester_type,
        requester_name: r.requester_name,
        requester_email: r.requester_email,
        time_remaining_seconds: r.time_remaining_seconds,
        server_time_remaining: r.server_time_remaining,
        original_started_at: r.original_started_at,
        interrupted_at: r.interrupted_at,
        expires_at: r.expires_at,
        created_at: r.createdAt,
        questions_answered: r.attempt?.questions_answered,
        total_questions: r.exam?.total_questions,
      })),
      count: requests.length,
    });
  } catch (error) {
    console.error("Error fetching pending resume requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch resume requests",
    });
  }
};

/**
 * Approve a resume request
 * POST /api/exam/resume-requests/:id/approve
 */
const approveRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const emp_id = req.employee.emp_id;

    const request = await ResumeRequest.findByPk(requestId, {
      include: [
        { model: Exam, as: "exam" },
        { model: ExamAttempt, as: "attempt" },
      ],
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Check if already handled
    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request already ${request.status}`,
      });
    }

    // Check if expired
    if (new Date() > new Date(request.expires_at)) {
      await request.update({ status: "expired" });
      return res.status(400).json({
        success: false,
        message: "Request has expired",
      });
    }

    // Calculate authoritative time remaining from server
    let approvedTimeRemaining = null;
    if (request.exam.has_time_limit) {
      const examEndTime = new Date(request.original_started_at);
      examEndTime.setMinutes(examEndTime.getMinutes() + request.exam.time_limit_minutes);
      approvedTimeRemaining = Math.max(0, Math.floor((examEndTime - new Date()) / 1000));

      // If no time left, we can't approve
      if (approvedTimeRemaining <= 0) {
        await request.update({ status: "expired" });
        socketService.notifyResumeExpired(request.request_id);
        return res.status(400).json({
          success: false,
          message: "Exam time has completely expired. Cannot resume.",
        });
      }
    }

    // Update request
    await request.update({
      status: "approved",
      responded_by: emp_id,
      responded_at: new Date(),
    });

    // Update attempt to clear any seal
    await request.attempt.update({
      is_sealed: false,
      sealed_at: null,
      // Keep sealed_responses for audit
    });

    // Notify the waiting user via socket
    socketService.notifyResumeApproved(request.request_id, {
      approved: true,
      time_remaining_seconds: approvedTimeRemaining,
      attempt_id: request.attempt_id,
      message: "Your resume request has been approved! Resuming exam...",
    });

    const employee = await Employee.findByPk(emp_id, {
      attributes: ["emp_fname", "emp_lname"],
    });

    res.json({
      success: true,
      message: "Resume request approved",
      data: {
        request_id: requestId,
        approved_time_remaining: approvedTimeRemaining,
        approved_by: `${employee?.emp_fname} ${employee?.emp_lname}`.trim(),
      },
    });
  } catch (error) {
    console.error("Error approving resume request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve request",
    });
  }
};

/**
 * Decline a resume request
 * POST /api/exam/resume-requests/:id/decline
 */
const declineRequest = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const { reason } = req.body;
    const emp_id = req.employee.emp_id;

    const request = await ResumeRequest.findByPk(requestId);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    if (request.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Request already ${request.status}`,
      });
    }

    // Update request
    await request.update({
      status: "declined",
      responded_by: emp_id,
      responded_at: new Date(),
      decline_reason: reason || "Request declined by instructor",
    });

    // Notify the waiting user via socket
    socketService.notifyResumeDeclined(request.request_id, {
      declined: true,
      reason: reason || "Your resume request was declined by the instructor.",
      message: "Your resume request has been declined.",
    });

    res.json({
      success: true,
      message: "Resume request declined",
    });
  } catch (error) {
    console.error("Error declining resume request:", error);
    res.status(500).json({
      success: false,
      message: "Failed to decline request",
    });
  }
};

/**
 * Check resume request status (student)
 * GET /api/student/exam/resume-request/:id/status
 */
const getRequestStatusStudent = async (req, res) => {
  try {
    const { id: requestId } = req.params;
    const std_id = req.student.std_id;

    const request = await ResumeRequest.findByPk(requestId, {
      include: [{ model: ExamAttempt, as: "attempt" }],
    });

    if (!request || request.std_id !== std_id) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Check for auto-expiry
    if (request.status === "pending" && new Date() > new Date(request.expires_at)) {
      await request.update({ status: "expired" });
      request.status = "expired";
    }

    // Calculate time remaining if approved
    let time_remaining = null;
    if (request.status === "approved" && request.attempt?.exam) {
      const exam = await Exam.findByPk(request.exam_id);
      if (exam?.has_time_limit) {
        const examEndTime = new Date(request.original_started_at);
        examEndTime.setMinutes(examEndTime.getMinutes() + exam.time_limit_minutes);
        time_remaining = Math.max(0, Math.floor((examEndTime - new Date()) / 1000));
      }
    }

    res.json({
      success: true,
      data: {
        request_id: request.request_id,
        status: request.status,
        time_remaining_seconds: time_remaining,
        decline_reason: request.decline_reason,
        responded_at: request.responded_at,
        expires_at: request.expires_at,
      },
    });
  } catch (error) {
    console.error("Error fetching request status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch request status",
    });
  }
};

/**
 * Check resume request status (guest)
 * GET /api/public/exam/resume-request/:uuid
 */
const getRequestStatusGuest = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { session_token } = req.query;

    const request = await ResumeRequest.findOne({
      where: { uuid },
      include: [
        { model: ExamAttempt, as: "attempt" },
        { model: GuestParticipant, as: "guest" },
      ],
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Verify session token
    if (!request.guest || request.guest.session_token !== session_token) {
      return res.status(403).json({
        success: false,
        message: "Invalid session token",
      });
    }

    // Check for auto-expiry
    if (request.status === "pending" && new Date() > new Date(request.expires_at)) {
      await request.update({ status: "expired" });
      request.status = "expired";
    }

    // Calculate time remaining if approved
    let time_remaining = null;
    if (request.status === "approved") {
      const exam = await Exam.findByPk(request.exam_id);
      if (exam?.has_time_limit) {
        const examEndTime = new Date(request.original_started_at);
        examEndTime.setMinutes(examEndTime.getMinutes() + exam.time_limit_minutes);
        time_remaining = Math.max(0, Math.floor((examEndTime - new Date()) / 1000));
      }
    }

    res.json({
      success: true,
      data: {
        request_id: request.request_id,
        uuid: request.uuid,
        status: request.status,
        time_remaining_seconds: time_remaining,
        decline_reason: request.decline_reason,
        responded_at: request.responded_at,
        expires_at: request.expires_at,
      },
    });
  } catch (error) {
    console.error("Error fetching request status (guest):", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch request status",
    });
  }
};

/**
 * Get count of pending resume requests for teacher dashboard badge
 * GET /api/exam/resume-requests/count
 */
const getPendingCount = async (req, res) => {
  try {
    const emp_id = req.employee.emp_id;
    const emp_role = req.employee.emp_role;

    // Expire old requests first
    await ResumeRequest.update(
      { status: "expired" },
      {
        where: {
          status: "pending",
          expires_at: { [Op.lt]: new Date() },
        },
      }
    );

    let examWhere = {};
    if (emp_role !== "admin") {
      examWhere.created_by = emp_id;
    }

    const count = await ResumeRequest.count({
      where: { status: "pending" },
      include: [
        {
          model: Exam,
          as: "exam",
          where: examWhere,
        },
      ],
    });

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Error fetching pending count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch count",
    });
  }
};

module.exports = {
  createResumeRequestStudent,
  createResumeRequestGuest,
  getPendingRequests,
  approveRequest,
  declineRequest,
  getRequestStatusStudent,
  getRequestStatusGuest,
  getPendingCount,
};
