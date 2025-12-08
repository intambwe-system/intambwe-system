import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Briefcase, Building2, Edit2, Save, X, Eye, EyeOff, Lock, Calendar, Shield, MapPin, Info, Award } from 'lucide-react';
import { useEmployeeAuth } from '../../../contexts/EmployeeAuthContext';
import employeeAuthService from '../../../services/employeeAuthService';

export default function EmployeeProfilePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const { employee, loadProfile } = useEmployeeAuth();

  const [formData, setFormData] = useState({});

  // Synchronize local form with context employee when it becomes available
  useEffect(() => {
    if (employee) {
      setFormData({ ...employee, emp_password: '' });
    }
  }, [employee]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({ ...employee, emp_password: '' });
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({ ...employee });
    setShowPassword(false);
    setErrorMessage('');
  };

  const handleSave = async () => {
    setIsLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.emp_email)) {
        setErrorMessage('Please enter a valid email address');
        setIsLoading(false);
        return;
      }

      // Validate phone number
      if (formData.emp_phoneNumber && formData.emp_phoneNumber.length < 10) {
        setErrorMessage('Please enter a valid phone number');
        setIsLoading(false);
        return;
      }

      // Validate password if provided
      if (formData.emp_password && formData.emp_password.length < 8) {
        setErrorMessage('Password must be at least 8 characters long');
        setIsLoading(false);
        return;
      }

      // Prepare update data (excluding department and role)
      const updateData = {
        emp_name: formData.emp_name,
        emp_gender: formData.emp_gender,
        emp_email: formData.emp_email,
        emp_phoneNumber: formData.emp_phoneNumber,
        address: formData.address
      };

      // Only include password if it was changed
      if (formData.emp_password && formData.emp_password.trim() !== '') {
        updateData.emp_password = formData.emp_password;
      }

      // Replace with actual API call
      // const response = await fetch(`/api/employee/${employee.emp_id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(updateData)
      // });
      
      // if (!response.ok) throw new Error('Failed to update employee');
      // const updatedEmployee = await response.json();

      // Send update to backend
      const resp = await employeeAuthService.updateProfile(employee.emp_id, updateData);

      if (resp && resp.success) {
        // Update local form immediately with returned data
        const updated = resp.data;
        setFormData({ ...updated, emp_password: '' });
        setIsEditing(false);
        setShowPassword(false);
        setSuccessMessage('Profile updated successfully!');

        // Refresh global profile in context
        try {
          await loadProfile();
        } catch (error) {
          // ignore refresh errors (local UI already updated)
          console.debug('Profile refresh skipped:', error.message);
        }

        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(resp?.message || 'Update failed');
      }
      
    } catch (error) {
      setErrorMessage(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleConfig = {
    admin: { badge: 'bg-blue-100 text-blue-700', icon: '👑' },
    teacher: { badge: 'bg-blue-100 text-blue-700', icon: '📚' },
    stock_manager: { badge: 'bg-blue-100 text-blue-700', icon: '📦' }
  };

  const currentRoleConfig = roleConfig[employee.emp_role] || roleConfig.admin;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'personal', label: 'Personal', icon: User },
    { id: 'contact', label: 'Contact', icon: Phone },
    { id: 'work', label: 'Work Info', icon: Building2 },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  const formatDate = (date) => 
    new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-4">
      <div className="max-w-5xl mx-auto">
        
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 px-6 py-4 rounded-r-lg shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <p className="font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <p className="font-medium">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Profile Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-24"></div>
          <div className="px-6 pb-6 -mt-12">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-24 h-24 rounded-xl bg-white shadow-lg flex items-center justify-center text-3xl font-bold text-slate-700 border-4 border-white flex-shrink-0">
                {employee.emp_name.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0 pt-2">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{employee.emp_name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${currentRoleConfig.badge}`}>
                        <Briefcase className="w-3 h-3" />
                        {employee.emp_role.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-slate-500 text-sm">ID: EMP-{String(employee.emp_id).padStart(4, '0')}</span>
                    </div>
                  </div>
                  
                  {!isEditing && activeTab === 'personal' && (
                    <button
                      onClick={handleEdit}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Member Since</div>
                      <div className="text-sm font-medium text-slate-900">{formatDate(employee.created_at)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Department</div>
                      <div className="text-sm font-medium text-slate-900">{employee.department?.dpt_name || employee.department_name || '—'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500">Status</div>
                      <div className="text-sm font-medium text-emerald-600">Active</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-4">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsEditing(false);
                    setErrorMessage('');
                  }}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <InfoCard title="Personal Information" icon={User}>
                <InfoRow label="Full Name" value={employee.emp_name} />
                <InfoRow label="Gender" value={employee.emp_gender} />
                <InfoRow label="Employee ID" value={`EMP-${String(employee.emp_id).padStart(4, '0')}`} />
              </InfoCard>

              <InfoCard title="Contact Information" icon={Phone}>
                <InfoRow label="Email" value={employee.emp_email} icon={<Mail className="w-3.5 h-3.5" />} />
                <InfoRow label="Phone" value={employee.emp_phoneNumber} icon={<Phone className="w-3.5 h-3.5" />} />
                <InfoRow label="Address" value={employee.address} icon={<MapPin className="w-3.5 h-3.5" />} />
              </InfoCard>

              <InfoCard title="Work Information" icon={Building2}>
                <InfoRow label="Role" value={employee.emp_role.replace('_', ' ').toUpperCase()} />
                <InfoRow label="Department" value={employee.department?.dpt_name || employee.department_name || '—'} />
                <InfoRow label="Status" value={<span className="text-emerald-600 font-medium">Active</span>} />
              </InfoCard>

              <InfoCard title="Account Details" icon={Calendar}>
                <InfoRow label="Member Since" value={formatDate(employee.created_at)} />
                <InfoRow label="Last Updated" value="2 days ago" />
              </InfoCard>
            </div>
          )}

          {/* Personal Tab */}
          {activeTab === 'personal' && (
            <InfoCard title="Personal Information" icon={User}>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="emp_name"
                      value={formData.emp_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      required
                    />
                  ) : (
                    <p className="text-slate-900 font-medium px-4 py-3 bg-slate-50 rounded-lg">{employee.emp_name}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Gender
                  </label>
                  {isEditing ? (
                    <select
                      name="emp_gender"
                      value={formData.emp_gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  ) : (
                    <p className="text-slate-900 font-medium px-4 py-3 bg-slate-50 rounded-lg">{employee.emp_gender || 'Not specified'}</p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </InfoCard>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <InfoCard title="Contact Information" icon={Phone}>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="emp_email"
                      value={formData.emp_email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      required
                    />
                  ) : (
                    <p className="text-slate-900 font-medium px-4 py-3 bg-slate-50 rounded-lg">{employee.emp_email}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="emp_phoneNumber"
                      value={formData.emp_phoneNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder="+250788123456"
                    />
                  ) : (
                    <p className="text-slate-900 font-medium px-4 py-3 bg-slate-50 rounded-lg">{employee.emp_phoneNumber || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                      placeholder="Enter full address"
                    />
                  ) : (
                    <p className="text-slate-900 font-medium px-4 py-3 bg-slate-50 rounded-lg">{employee.address || 'Not provided'}</p>
                  )}
                </div>

                {isEditing && (
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </InfoCard>
          )}

          {/* Work Info Tab - Read Only */}
          {activeTab === 'work' && (
            <InfoCard title="Work Information" icon={Building2}>
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Work information is managed by administrators and cannot be edited
                  </p>
                </div>
                <InfoRow label="Role" value={employee.emp_role.replace('_', ' ').toUpperCase()} />
                <InfoRow label="Department" value={employee.department?.dpt_name || employee.department_name || '—'} />
                <InfoRow label="Employee ID" value={`EMP-${String(employee.emp_id).padStart(4, '0')}`} />
                <InfoRow label="Member Since" value={formatDate(employee.created_at)} />
                <InfoRow label="Status" value={<span className="text-emerald-600 font-medium">Active</span>} />
              </div>
            </InfoCard>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <InfoCard title="Security Settings" icon={Lock}>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                    <Lock className="w-4 h-4 text-slate-400" />
                    Change Password
                  </label>
                  {isEditing ? (
                    <>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="emp_password"
                          value={formData.emp_password}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 pr-12 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
                          placeholder="Leave blank to keep current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 ml-1">Minimum 8 characters recommended for strong security</p>
                    </>
                  ) : (
                    <button
                      onClick={handleEdit}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      ••••••••••••
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleSave}
                      disabled={isLoading}
                      className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Save Changes
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                      <X className="w-5 h-5" />
                      Cancel
                    </button>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Security Status</h4>
                  <div className="space-y-2">
                    <InfoRow label="Account Status" value={<span className="text-emerald-600 font-medium">Active</span>} />
                    <InfoRow label="Last Password Change" value="30 days ago" />
                  </div>
                </div>
              </div>
            </InfoCard>
          )}
        </div>
      </div>
    </div>
  );
}

// Reusable Components
const InfoCard = ({ title, icon, children }) => {
  const Icon = icon;
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-blue-600" />
        {title}
      </h3>
      {children}
    </div>
  );
};

const InfoRow = ({ label, value, icon }) => (
  <div className="flex justify-between items-start py-3 border-b border-slate-100 last:border-0">
    <span className="text-sm text-slate-600 font-medium flex items-center gap-2">
      {icon}
      {label}
    </span>
    <span className="text-sm text-slate-900 text-right ml-4">{value ?? '—'}</span>
  </div>
);