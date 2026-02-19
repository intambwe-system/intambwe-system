const jwt = require("jsonwebtoken");
const { Student, Employee, GuestParticipant } = require("../model");

/**
 * Socket.IO authentication middleware
 * Verifies JWT tokens for students/employees or session tokens for guests
 * Attaches user info to socket.user
 */
const authenticateSocket = async (socket, next) => {
  try {
    // Check for JWT token (students/employees)
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");

    // Check for session token (guests)
    const sessionToken = socket.handshake.auth?.sessionToken;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.std_id) {
          // Student authentication
          const student = await Student.findByPk(decoded.std_id, {
            attributes: ["std_id", "std_fname", "std_lname", "std_email", "class_id"],
          });

          if (student) {
            socket.user = {
              type: "student",
              id: student.std_id,
              name: `${student.std_fname} ${student.std_lname}`.trim(),
              email: student.std_email,
              class_id: student.class_id,
            };
          }
        } else if (decoded.emp_id) {
          // Employee authentication
          const employee = await Employee.findByPk(decoded.emp_id, {
            attributes: ["emp_id", "emp_fname", "emp_lname", "emp_email", "emp_role", "dpt_id"],
          });

          if (employee) {
            socket.user = {
              type: "employee",
              id: employee.emp_id,
              name: `${employee.emp_fname} ${employee.emp_lname}`.trim(),
              email: employee.emp_email,
              role: employee.emp_role,
              dpt_id: employee.dpt_id,
            };
          }
        }
      } catch (jwtError) {
        console.log("Socket JWT verification failed:", jwtError.message);
        // Continue without authentication - will be marked as anonymous
      }
    } else if (sessionToken) {
      // Guest authentication via session token
      try {
        const guest = await GuestParticipant.findOne({
          where: { session_token: sessionToken },
          attributes: ["guest_id", "full_name", "email", "phone"],
        });

        if (guest) {
          socket.user = {
            type: "guest",
            id: guest.guest_id,
            name: guest.full_name,
            email: guest.email,
            phone: guest.phone,
          };
        }
      } catch (guestError) {
        console.log("Socket guest lookup failed:", guestError.message);
      }
    }

    // If no user was authenticated, mark as anonymous
    if (!socket.user) {
      socket.user = { type: "anonymous" };
    }

    // Always allow connection, but with appropriate user context
    next();
  } catch (err) {
    console.error("Socket authentication error:", err);
    // Still allow connection but mark as anonymous
    socket.user = { type: "anonymous" };
    next();
  }
};

/**
 * Middleware to require authentication for specific events
 * Use: socket.use(requireAuth(['student', 'employee']))
 */
const createAuthGuard = (allowedTypes) => {
  return (socket, next) => {
    if (!socket.user || socket.user.type === "anonymous") {
      return next(new Error("Authentication required"));
    }

    if (!allowedTypes.includes(socket.user.type)) {
      return next(new Error(`Access denied for user type: ${socket.user.type}`));
    }

    next();
  };
};

/**
 * Helper to check if socket user is a teacher or admin
 */
const isTeacherOrAdmin = (socket) => {
  return (
    socket.user &&
    socket.user.type === "employee" &&
    ["admin", "teacher"].includes(socket.user.role)
  );
};

/**
 * Helper to check if socket user is a student
 */
const isStudent = (socket) => {
  return socket.user && socket.user.type === "student";
};

/**
 * Helper to check if socket user is a guest
 */
const isGuest = (socket) => {
  return socket.user && socket.user.type === "guest";
};

module.exports = {
  authenticateSocket,
  createAuthGuard,
  isTeacherOrAdmin,
  isStudent,
  isGuest,
};
