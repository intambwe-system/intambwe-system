import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import employeeAuthService from '../services/employeeAuthService';

const EmployeeAuthContext = createContext(null);

export const useEmployeeAuth = () => {
    const context = useContext(EmployeeAuthContext);
    if (!context) {
        throw new Error('useEmployeeAuth must be used within EmployeeAuthProvider');
    }
    return context;
};

export const EmployeeAuthProvider = ({ children }) => {
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Load profile
    const loadProfile = useCallback(async () => {
        try {
            const data = await employeeAuthService.getProfile();
            if (data.success) {
                setEmployee(data.data);
                setIsAuthenticated(true);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load profile:', error);
            return false;
        }
    }, []);

    // Login
    const login = useCallback(async (credentials) => {
        try {
            const data = await employeeAuthService.login({
                emp_password: credentials.password,
                emp_email: credentials.email
            });
            console.warn(data);
            
            if (data.success) {
                setEmployee(data.data.employee);
                setIsAuthenticated(true);
                return { success: true, data };
            }
            return { success: false, message: data.message || 'Login failed' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }, []);

    // Google Login
    const googleLogin = useCallback(async (credential) => {
        try {
            const data = await employeeAuthService.googleLogin(credential);
            if (data.success) {
                setEmployee(data.employee);
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
            await employeeAuthService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setEmployee(null);
            setIsAuthenticated(false);
        }
    }, []);

    // Change Password
    const changePassword = useCallback(async (passwordData) => {
        try {
            const data = await employeeAuthService.changePassword(passwordData);
            return { success: data.success, message: data.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }, []);

    // Forgot Password
    const forgotPassword = useCallback(async (email) => {
        try {
            const data = await employeeAuthService.forgotPassword(email);
            return { success: data.success, message: data.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }, []);

    // Reset Password
    const resetPassword = useCallback(async (resetToken, newPassword) => {
        try {
            const data = await employeeAuthService.resetPassword(resetToken, newPassword);
            return { success: data.success, message: data.message };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }, []);

    // Initialize auth state on mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Try to load profile using cookie-based auth
                // If cookies exist and are valid, this will succeed
                await loadProfile();
            } catch (error) {
                // If profile load fails, user needs to login
                console.log('No valid session found');
            } finally {
                setLoading(false);
            }
        };

        initAuth();
    }, [loadProfile]);

    const value = {
        employee,
        loading,
        isAuthenticated,
        login,
        googleLogin,
        logout,
        changePassword,
        forgotPassword,
        resetPassword,
        loadProfile,
    };

    return (
        <EmployeeAuthContext.Provider value={value}>
            {children}
        </EmployeeAuthContext.Provider>
    );
};