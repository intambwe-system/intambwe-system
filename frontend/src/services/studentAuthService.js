import api from '../api/api';

class StudentAuthService {
  // Login student
  async login(credentials) {
    try {
      const response = await api.post('/student/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }

  // First login with temporary password
  async firstLogin(data) {
    try {
      const response = await api.post('/student/auth/first-login', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'First login failed');
    }
  }

  // Google login
  async googleLogin(credential) {
    try {
      const response = await api.post('/student/auth/google', { credential });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Google login failed');
    }
  }

  // Logout
  async logout() {
    try {
      const response = await api.post('/student/auth/logout');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Logout failed');
    }
  }

  // Get profile
  async getProfile() {
    try {
      const response = await api.get('/student/auth/profile');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to load profile');
    }
  }

  // Verify token
  async verifyToken() {
    try {
      const response = await api.get('/student/auth/verify-token');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Token verification failed');
    }
  }

  // Change password
  async changePassword(data) {
    try {
      const response = await api.post('/student/auth/change-password', data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Password change failed');
    }
  }

  // Request password reset
  async requestPasswordReset(email) {
    try {
      const response = await api.post('/student/auth/request-password-reset', { std_email: email });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Password reset request failed');
    }
  }

  // Reset password with token
  async resetPassword(resetToken, newPassword) {
    try {
      const response = await api.post('/student/auth/reset-password', { resetToken, newPassword });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Password reset failed');
    }
  }
}

const studentAuthService = new StudentAuthService();
export default studentAuthService;
