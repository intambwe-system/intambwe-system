import api from '../api/api'; // Axios instance with JWT interceptor

class EmployeeAuthService {
  // LOGIN
  async login(credentials) {
    try {
      const response = await api.post('/employee/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.log(error);
      
      const msg =
        error.response?.data?.message || error.message || 'Login failed';
      throw new Error(msg);
    }
  }

  // GOOGLE LOGIN
  async googleLogin(credential) {
    try {
      const response = await api.post('/employee/auth/google', { credential });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message || error.message || 'Google login failed';
      throw new Error(msg);
    }
  }

  // REFRESH TOKEN
  async refreshToken(refreshToken) {
    try {
      const response = await api.post('/employee/auth/refresh-token', { refreshToken });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message || error.message || 'Token refresh failed';
      throw new Error(msg);
    }
  }

  // LOGOUT
  async logout() {
    try {
      const response = await api.post('/employee/auth/logout');
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message || error.message || 'Logout failed';
      throw new Error(msg);
    }
  }

  // GET PROFILE
  async getProfile() {
    try {
      const response = await api.get('/employee/auth/profile');
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load profile';
      throw new Error(msg);
    }
  }

  // UPDATE EMPLOYEE PROFILE
  async updateProfile(empId, data) {
    try {
      const response = await api.put(`/employee/${empId}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message || error.message || 'Failed to update profile';
      throw new Error(msg);
    }
  }

  // CHANGE PASSWORD
  async changePassword(data) {
    try {
      const response = await api.post('/employee/auth/change-password', data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to change password';
      throw new Error(msg);
    }
  }

  // FORGOT PASSWORD
  async forgotPassword(email) {
    try {
      const response = await api.post('/employee/auth/forgot-password', { emp_email: email });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to send reset request';
      throw new Error(msg);
    }
  }

  // RESET PASSWORD
  async resetPassword(resetToken, newPassword) {
    try {
      const response = await api.post('/employee/auth/reset-password', {
        resetToken,
        newPassword,
      });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to reset password';
      throw new Error(msg);
    }
  }

  // VERIFY TOKEN
  async verifyToken() {
    try {
      const response = await api.get('/employee/auth/verify-token');
      return response.data;
    } catch (error) {
      return { success: false, message: 'Invalid token' };
    }
  }
}

const employeeAuthService = new EmployeeAuthService();
export default employeeAuthService;

// Optional named exports
export const {
  login,
  googleLogin,
  refreshToken,
  logout,
  getProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyToken,
} = employeeAuthService;
