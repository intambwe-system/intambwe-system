import React, { useState, createContext, useContext } from 'react';
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { hasAccess } from "./protectors/PrivateEmployeeRoute";
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import { useEmployeeAuth } from '../contexts/EmployeeAuthContext';


// Main App Component
export default function EmployeeDashboardLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { employee:user, logout } = useEmployeeAuth()
    console.warn(
       'sdssd fs', user
    );
    

    const location = useLocation();
    const currentRoute = location.pathname;




    return (
        <>
            <div className="flex h-screen bg-gray-50">
                <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header onMenuClick={() => setSidebarOpen(true)} />

                    <main className="flex-1 overflow-y-auto p-6">
                        {hasAccess(currentRoute, user.emp_role) ? (
                            <Outlet />
                        ) : (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                                <h3 className="text-lg font-semibold text-red-800 mb-2">Access Denied</h3>
                                <p className="text-red-600">You don't have permission to access this page.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* Role Switcher for Testing */}
            <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
                <p className="text-xs font-medium text-gray-600 mb-2">Test Role:</p>
                <select
                    value={user.role}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                    <option value="admin">Admin</option>
                    <option value="stock_manager">Stock Manager</option>
                    <option value="teacher">Teacher</option>
                </select>
            </div>
        </>

    );
}