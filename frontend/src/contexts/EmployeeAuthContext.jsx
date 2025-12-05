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

    // Store tokens in localStorage
    const setTokens = useCallback((accessToken, refreshToken) => {
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    }, []);

    const clearTokens = useCallback(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }, []);

    const getStoredTokens = useCallback(() => {
        return {
            accessToken: localStorage.getItem('accessToken'),
            refreshToken: localStorage.getItem('refreshToken'),
        };
    }, []);

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

    // Handle token refresh
    const handleRefreshToken = useCallback(async () => {
        const { refreshToken } = getStoredTokens();
        if (!refreshToken) {
            throw new Error('No refresh token available');
        }

        try {
            const data = await employeeAuthService.refreshToken(refreshToken);
            if (data.success && data.accessToken) {
                setTokens(data.accessToken, data.refreshToken || refreshToken);
                return data.accessToken;
            }
            throw new Error('Token refresh failed');
        } catch (error) {
            console.error('Token refresh error:', error);
            clearTokens();
            setEmployee(null);
            setIsAuthenticated(false);
            throw error;
        }
    }, [getStoredTokens, setTokens, clearTokens]);

    // Login
    const login = useCallback(async (credentials) => {
        try {

            
            const data = await employeeAuthService.login({emp_password:credentials.password,emp_email:credentials.email});
            console.warn(data);
            
            if (data.success) {
                setTokens(data.data.accessToken, data.data.refreshToken);
                setEmployee(data.data.employee);
                setIsAuthenticated(true);
                return { success: true, data };
            }
            return { success: false, message: data.message || 'Login failed' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }, [setTokens]);

    // Google Login
    const googleLogin = useCallback(async (credential) => {
        try {
            const data = await employeeAuthService.googleLogin(credential);
            if (data.success) {
                setTokens(data.data.accessToken, data.data.refreshToken);
                setEmployee(data.employee);
                setIsAuthenticated(true);
                return { success: true, data };
            }
            return { success: false, message: data.message || 'Google login failed' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }, [setTokens]);

    // Logout
    const logout = useCallback(async () => {
        try {
            await employeeAuthService.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            clearTokens();
            setEmployee(null);
            setIsAuthenticated(false);
        }
    }, [clearTokens]);

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
            const { accessToken } = getStoredTokens();

            if (accessToken) {
                try {
                    // Verify token is still valid
                    const verifyData = await employeeAuthService.verifyToken();
                    if (verifyData.success) {
                       
                        
                        await loadProfile();
                    } else {
                        // Try to refresh if verification fails
                        try {
                            await handleRefreshToken();
                            await loadProfile();
                        } catch (error) {
                            clearTokens();
                        }
                    }
                } catch (error) {
                    clearTokens();
                }
            }

            setLoading(false);
        };

        initAuth();
    }, [getStoredTokens, loadProfile, handleRefreshToken, clearTokens]);

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
        refreshToken: handleRefreshToken,
        loadProfile,
    };

    return (
        <EmployeeAuthContext.Provider value={value}>
            {children}
        </EmployeeAuthContext.Provider>
    );
};