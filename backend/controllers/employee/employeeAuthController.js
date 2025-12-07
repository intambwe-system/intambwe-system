// controllers/employeeAuthController.js

const { Department, Employee } = require('../../model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { generateEmployeeAccessToken, generateEmployeeRefreshToken } = require('../../middleware/employeeAuth');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const employeeAuthController = {
  // LOGIN - Authenticate employee
 async login(req, res) {
  try {
    const { emp_email, emp_password } = req.body;

    // Validate input
    if (!emp_email || !emp_password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find employee by email
    const employee = await Employee.findOne({
      where: { emp_email },
      include: [{
        model: Department,
        attributes: ['dpt_id', 'dpt_name']
      }]
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'User doesnt exist'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(emp_password, employee.emp_password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Generate access token
    const accessToken = await generateEmployeeAccessToken(employee)

    // Generate refresh token
    const refreshToken =  await generateEmployeeRefreshToken(employee)
    // Set access token cookie
    res.cookie('EmployeeAccessToken', accessToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
    });

    // Set refresh token cookie
    res.cookie('EmployeeRefreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      maxAge: 1000 * 60 * 60 * 24 * 30 // 30 days
    });

    // Prepare employee data (exclude password)
    const employeeData = employee.toJSON();
    delete employeeData.emp_password;

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        employee: employeeData
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

      // Check if employee with this email exists in database
      const employee = await Employee.findOne({
        where: { emp_email: googleEmail },
        include: [{
          model: Department,
          attributes: ['dpt_id', 'dpt_name']
        }]
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'No employee account found with this Google email. Please contact your administrator.',
          googleEmail: googleEmail
        });
      }

      // Generate access token
      const accessToken = jwt.sign(
        {
          emp_id: employee.emp_id,
          emp_email: employee.emp_email,
          emp_role: employee.emp_role,
          dpt_id: employee.dpt_id
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        { emp_id: employee.emp_id },
        JWT_REFRESH_SECRET,
        { expiresIn: JWT_REFRESH_EXPIRES_IN }
      );

      // Prepare employee data (exclude password)
      const employeeData = employee.toJSON();
      delete employeeData.emp_password;

      return res.status(200).json({
        success: true,
        message: 'Google login successful',
        data: {
          employee: employeeData,
          accessToken,
          refreshToken,
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

  // REFRESH TOKEN - Generate new access token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

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

      // Find employee
      const employee = await Employee.findByPk(decoded.emp_id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Generate new access token
      const accessToken = jwt.sign(
        {
          emp_id: employee.emp_id,
          emp_email: employee.emp_email,
          emp_role: employee.emp_role,
          dpt_id: employee.dpt_id
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      console.log(' \n  REFRESHED TOKEN \n');
      
      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: { accessToken }
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

 async logout(req, res) {
  try {
    // Clear access token cookie
    res.clearCookie('EmployeeAccessToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: true
    });

    // Clear refresh token cookie
    res.clearCookie('EmployeeRefreshToken', {
      httpOnly: true,
      sameSite: 'strict',
      secure: true
    });

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

  // GET PROFILE - Get current authenticated employee
  async getProfile(req, res) {
    try {
      // Employee ID comes from auth middleware (req.employee)
      const employee = await Employee.findByPk(req.employee.emp_id, {
        attributes: { exclude: ['emp_password'] },
        include: [{
          model: Department,
          attributes: ['dpt_id', 'dpt_name']
        }]
      });

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      return res.status(200).json({
        success: true,
        data: employee
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

  // CHANGE PASSWORD - Change authenticated employee's password
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

      // Find employee
      const employee = await Employee.findByPk(req.employee.emp_id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, employee.emp_password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await employee.update({ emp_password: hashedPassword });

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

  // FORGOT PASSWORD - Request password reset (placeholder)
  async forgotPassword(req, res) {
    try {
      const { emp_email } = req.body;

      if (!emp_email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }

      // Find employee
      const employee = await Employee.findOne({ where: { emp_email } });
      if (!employee) {
        // Return success even if employee not found (security best practice)
        return res.status(200).json({
          success: true,
          message: 'If the email exists, a password reset link has been sent'
        });
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { emp_id: employee.emp_id },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      // TODO: Send email with reset token
      // For now, return the token (in production, send via email)
      console.log('Password reset token:', resetToken);

      return res.status(200).json({
        success: true,
        message: 'If the email exists, a password reset link has been sent',
        // Remove this in production:
        resetToken: resetToken
      });

    } catch (error) {
      console.error('Error in forgot password:', error);
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

      // Find employee
      const employee = await Employee.findByPk(decoded.emp_id);
      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await employee.update({ emp_password: hashedPassword });

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
      // If this endpoint is reached, the auth middleware has already verified the token
      return res.status(200).json({
        success: true,
        message: 'Token is valid',
        data: req.employee
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

module.exports = employeeAuthController;