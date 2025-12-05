import React, { useState, createContext, useContext } from 'react';
import { Menu, X, Home, Users, Package, ShoppingCart, BarChart3, TrendingDown, Archive, FolderTree, BookOpen, GraduationCap, Award, Settings, User, LogOut, ChevronDown, Building2 } from 'lucide-react';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';

// Auth Context

// Page Components
const DashboardHomePage = () => {
    const { employee:user } = useEmployeeAuth();

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Welcome</p>
                            <p className="text-2xl font-bold text-gray-800">{user?.emp_name}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <User className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Role</p>
                            <p className="text-2xl font-bold text-gray-800 capitalize">{user?.role?.replace('_', ' ')}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <Award className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};



export default DashboardHomePage
