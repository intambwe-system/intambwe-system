// controllers/studentAuthController.js
const {  Student, Class } = require('../../model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Helper functions to generate tokens
const generateStudentAccessToken = (student) => {
  return jwt.sign(
    {
      std_id: student.std_id,
      std_email: student.std_email,
      class_id: student.class_id,
      dpt_id: student.dpt_id
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

const generateStudentRefreshToken = (student) => {
  return jwt.sign(
    { std_id: student.std_id },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
};

// Helper function to set auth cookies
const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('StudentAccessToken', accessToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
  });

  res.cookie('StudentRefreshToken', refreshToken, {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
  });
};

// Helper function to clear auth cookies
const clearAuthCookies = (res) => {
  res.clearCookie('StudentAccessToken', {
    httpOnly: true,
    sameSite: 'strict',
    secure: true
  });

  res.clearCookie('StudentRefreshToken', {
    httpOnly: true,
    sameSite: 'strict',
    secure: true
  });
};

const studentAuthController = {
  // SETUP CREDENTIALS - Generate initial credentials for newly created student
  async setupCredentials(req, res) {
    try {
      const { std_id } = req.params;
      const { std_email } = req.body;

      // Validate student ID
      if (!std_id || isNaN(std_id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid student ID'
        });
      }

      // Find student
      const student = await Student.findByPk(std_id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Check if student already has email
      if (student.std_email && !std_email) {
        return res.status(400).json({
          success: false,
          message: 'Student already has email registered'
        });
      }

      // Update email if provided
      if (std_email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(std_email)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid email format'
          });
        }

        // Check if email already exists
        const existingStudent = await Student.findOne({
          where: { std_email }
        });
        if (existingStudent && existingStudent.std_id !== parseInt(std_id)) {
          return res.status(409).json({
            success: false,
            message: 'Email already exists'
          });
        }

        await student.update({ std_email });
      }

      // Generate temporary password
      const tempPassword = crypto.randomBytes(8).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      // Store hashed password
      await student.update({ std_password: hashedPassword });

      // TODO: Send email with credentials
      // This is where you would integrate with an email service (nodemailer, SendGrid, etc.)
      console.log('Student Credentials:', {
        email: student.std_email,
        temporaryPassword: tempPassword
      });

      return res.status(200).json({
        success: true,
        message: 'Credentials generated successfully. Email sent to student.',
        data: {
          std_id: student.std_id,
          std_email: student.std_email,
          // Remove this in production - only for testing
          temporaryPassword: tempPassword
        }
      });

    } catch (error) {
      console.error('Error setting up credentials:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // FIRST LOGIN - Student sets their own password on first login
  async firstLogin(req, res) {
    try {
      const { std_email, temporaryPassword, newPassword } = req.body;

      // Validate input
      if (!std_email || !temporaryPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email, temporary password, and new password are required'
        });
      }

      // Validate new password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // Find student
      const student = await Student.findOne({
        where: { std_email },
        include: [
          {
            model: Class,
            attributes: ['class_id', 'class_name']
          },
       
        ]
      });

      if (!student) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Verify temporary password
      const isPasswordValid = await bcrypt.compare(temporaryPassword, student.std_password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid temporary password'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password and mark as activated
      await student.update({ 
        std_password: hashedPassword,
        is_first_login: false
      });

      // Generate tokens
      const accessToken = generateStudentAccessToken(student);
      const refreshToken = generateStudentRefreshToken(student);

      // Set cookies
      setAuthCookies(res, accessToken, refreshToken);

      // Prepare student data (exclude password)
      const studentData = student.toJSON();
      delete studentData.std_password;

      return res.status(200).json({
        success: true,
        message: 'Password set successfully. Welcome!',
        data: {
          student: studentData
        }
      });

    } catch (error) {
      console.error('Error during first login:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // LOGIN - Regular student login
  async login(req, res) {
    try {
      const { std_email, std_password } = req.body;
      console.log(req.body);
      

      // Validate input
      if (!std_email || !std_password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find student
      const student = await Student.findOne({
        where: { std_email },
        include: [
          {
            model: Class,
            attributes: ['class_id', 'class_name']
          },
        
        ]
      });

      if (!student) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Check if student has set password
      if (!student.std_password) {
        return res.status(403).json({
          success: false,
          message: 'Please use your temporary password to set up your account'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(std_password, student.std_password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Generate tokens
      const accessToken = generateStudentAccessToken(student);
      const refreshToken = generateStudentRefreshToken(student);

      // Set cookies
      setAuthCookies(res, accessToken, refreshToken);

      // Prepare student data (exclude password)
      const studentData = student.toJSON();
      delete studentData.std_password;

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          student: studentData
        }
      });

    } catch (error) {
      console.error('Error during login:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GOOGLE LOGIN - Authenticate with Google
  async googleLogin(req, res) {
    try {
      const { credential } = req.body;

      if (!credential) {
        return res.status(400).json({
          success: false,
          message: 'Google credential is required'
        });
      }

      // Verify Google token
      let ticket;
      try {
        ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID
        });
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid Google token'
        });
      }

      const payload = ticket.getPayload();
      const googleEmail = payload.email;
      const googleName = payload.name;
      const googlePicture = payload.picture;

      // Check if student with this email exists in database
      const student = await Student.findOne({
        where: { std_email: googleEmail },
        include: [
          {
            model: Class,
            attributes: ['class_id', 'class_name']
          },
         
        ]
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'No student account found with this Google email. Please contact your school administrator.',
          googleEmail: googleEmail
        });
      }

      // Generate tokens
      const accessToken = generateStudentAccessToken(student);
      const refreshToken = generateStudentRefreshToken(student);

      // Set cookies
      setAuthCookies(res, accessToken, refreshToken);

      // Prepare student data (exclude password)
      const studentData = student.toJSON();
      delete studentData.std_password;

      return res.status(200).json({
        success: true,
        message: 'Google login successful',
        data: {
          student: studentData,
          googleInfo: {
            name: googleName,
            picture: googlePicture
          }
        }
      });

    } catch (error) {
      console.error('Error during Google login:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // REFRESH TOKEN - Generate new access token (not needed with auto-refresh middleware)
  async refreshToken(req, res) {
    try {
      const refreshToken = req.cookies?.StudentRefreshToken;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required'
        });
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token'
        });
      }

      // Find student
      const student = await Student.findByPk(decoded.std_id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Generate new access token
      const accessToken = generateStudentAccessToken(student);

      // Update access token cookie
      res.cookie('StudentAccessToken', accessToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: true,
        maxAge: 1000 * 60 * 60 * 24 * 7
      });

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully'
      });

    } catch (error) {
      console.error('Error refreshing token:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // LOGOUT - Clear authentication cookies
  async logout(req, res) {
    try {
      // Clear cookies
      clearAuthCookies(res);

      return res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      console.error('Error during logout:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // GET PROFILE - Get current authenticated student
  async getProfile(req, res) {
    try {
      const student = await Student.findByPk(req.student.std_id, {
        attributes: { exclude: ['std_password'] },
        include: [
          {
            model: Class,
            attributes: ['class_id', 'class_name']
          },
          {
            model: Department,
            attributes: ['dpt_id', 'dpt_name']
          }
        ]
      });

      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: student
      });

    } catch (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // CHANGE PASSWORD - Change authenticated student's password
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;

      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required'
        });
      }

      // Validate new password strength
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // Find student
      const student = await Student.findByPk(req.student.std_id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, student.std_password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await student.update({ std_password: hashedPassword });

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully'
      });

    } catch (error) {
      console.error('Error changing password:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // RESET PASSWORD REQUEST - Request password reset
  async requestPasswordReset(req, res) {
    try {
      const { std_email } = req.body;

      if (!std_email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Find student
      const student = await Student.findOne({ where: { std_email } });
      if (!student) {
        // Return success even if student not found (security best practice)
        return res.status(200).json({
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { std_id: student.std_id },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // TODO: Send email with reset token
      console.log('Password reset token:', resetToken);

      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        // Remove this in production
        resetToken: resetToken
      });

    } catch (error) {
      console.error('Error requesting password reset:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // RESET PASSWORD - Reset password with token
  async resetPassword(req, res) {
    try {
      const { resetToken, newPassword } = req.body;

      if (!resetToken || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Reset token and new password are required'
        });
      }

      // Validate new password
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long'
        });
      }

      // Verify reset token
      let decoded;
      try {
        decoded = jwt.verify(resetToken, JWT_SECRET);
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }

      // Find student
      const student = await Student.findByPk(decoded.std_id);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: 'Student not found'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await student.update({ std_password: hashedPassword });

      return res.status(200).json({
        success: true,
        message: 'Password reset successfully'
      });

    } catch (error) {
      console.error('Error resetting password:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  },

  // VERIFY TOKEN - Check if token is valid
  async verifyToken(req, res) {
    try {
      return res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: req.student
      });

    } catch (error) {
      console.error('Error verifying token:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
};

module.exports = studentAuthController;