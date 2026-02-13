import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import studentAuthService from '../services/studentAuthService';

const StudentAuthContext = createContext(null);

export const useStudentAuth = () => {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within StudentAuthProvider');
  }
  return context;
};

export const StudentAuthProvider = ({ children }) => {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load profile
  const loadProfile = useCallback(async () => {
    try {
      const data = await studentAuthService.getProfile();
      if (data.success) {
        setStudent(data.data);
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to load student profile:', error);
      return false;
    }
  }, []);

  // Login
  const login = useCallback(async (credentials) => {
    try {
      const data = await studentAuthService.login(credentials);
      if (data.success) {
        // Check if password change is required (first login)
        if (data.requirePasswordChange) {
          return {
            success: true,
            requirePasswordChange: true,
            studentData: data.data,
            message: data.message
          };
        }
        setStudent(data.data.student);
        setIsAuthenticated(true);
        return { success: true, requirePasswordChange: false, data };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, []);

  // First login with temporary password
  const firstLogin = useCallback(async (data) => {
    try {
      const response = await studentAuthService.firstLogin(data);
      if (response.success) {
        setStudent(response.data.student);
        setIsAuthenticated(true);
        return { success: true, data: response };
      }
      return { success: false, message: response.message || 'First login failed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, []);

  // Google Login
  const googleLogin = useCallback(async (credential) => {
    try {
      const data = await studentAuthService.googleLogin(credential);
      if (data.success) {
        setStudent(data.data.student);
        setIsAuthenticated(true);
        return { success: true, data };
      }
      return { success: false, message: data.message || 'Google login failed' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await studentAuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setStudent(null);
      setIsAuthenticated(false);
    }
  }, []);

  // Change Password
  const changePassword = useCallback(async (passwordData) => {
    try {
      const data = await studentAuthService.changePassword(passwordData);
      return { success: data.success, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, []);

  // Request Password Reset
  const requestPasswordReset = useCallback(async (email) => {
    try {
      const data = await studentAuthService.requestPasswordReset(email);
      return { success: data.success, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, []);

  // Reset Password
  const resetPassword = useCallback(async (resetToken, newPassword) => {
    try {
      const data = await studentAuthService.resetPassword(resetToken, newPassword);
      return { success: data.success, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }, []);

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        await loadProfile();
      } catch (error) {
        console.log('No valid student session found');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [loadProfile]);

  const value = {
    student,
    loading,
    isAuthenticated,
    login,
    firstLogin,
    googleLogin,
    logout,
    changePassword,
    requestPasswordReset,
    resetPassword,
    loadProfile,
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
};
