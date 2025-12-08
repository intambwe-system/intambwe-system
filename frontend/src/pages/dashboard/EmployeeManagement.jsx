import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Search, Edit, Trash2, Eye, ChevronDown, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, XCircle, X, AlertCircle, Briefcase, RefreshCw,
  Filter, Grid3X3, List, Settings, Minimize2, Mail, Phone, User, Building2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Combobox } from '@headlessui/react';
import employeeService from '../../services/employeeService'; // Adjust path
import departmentService from '../../services/departmentService'; // Adjust path

const EmployeeManagementDashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('emp_name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [operationStatus, setOperationStatus] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [deptQuery, setDeptQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const [formData, setFormData] = useState({
    emp_name: '',
    emp_role: 'teacher',
    emp_gender: 'Male',
    emp_email: '',
    emp_phoneNumber: '',
    dpt_id: ''
  });
  const [formError, setFormError] = useState('');

  // Load employees and departments
  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, []);


  const loadData = async ()=>{
    await loadEmployees();
   await loadDepartments();
  }

  // Re-filter and sort when needed
  useEffect(() => {
    handleFilterAndSort();
  }, [searchTerm, sortBy, sortOrder, allEmployees]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await employeeService.getAllEmployees();
      setAllEmployees(data.data || data); // adjust based on API response structure
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load employees');
      setAllEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const data = await departmentService.getAllDepartments();
      setDepartments(data.data || data);
    } catch (err) {
      console.error('Failed to load departments:', err.message);
    }
  };

  const showOperationStatus = (type, message, duration = 3000) => {
    setOperationStatus({ type, message });
    setTimeout(() => setOperationStatus(null), duration);
  };

  const handleFilterAndSort = () => {
    let filtered = [...allEmployees];

    if (searchTerm.trim()) {
      filtered = filtered.filter(emp =>
        emp?.emp_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp?.emp_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp?.emp_role?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      const aValue = a[sortBy] || '';
      const bValue = b[sortBy] || '';
      const aStr = aValue.toString().toLowerCase();
      const bStr = bValue.toString().toLowerCase();
      return sortOrder === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    setEmployees(filtered);
    setCurrentPage(1);
  };

  const totalEmployees = allEmployees.length;
  const teachers = allEmployees.filter(e => e.emp_role === 'teacher').length;
  const admins = allEmployees.filter(e => e.emp_role === 'admin').length;
  const stockManagers = allEmployees.filter(e => e.emp_role === 'stock_manager').length;

  const filteredDepartments = useMemo(() => {
    return departments.filter(dept =>
      dept.dpt_name?.toLowerCase().includes(deptQuery.toLowerCase())
    );
  }, [departments, deptQuery]);

  const handleAddEmployee = () => {
    setFormData({
      emp_name: '',
      emp_role: 'teacher',
      emp_gender: 'Male',
      emp_email: '',
      emp_phoneNumber: '',
      dpt_id: ''
    });
    setSelectedDepartment(null);
    setFormError('');
    setShowAddModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.emp_name || !formData.emp_email || !selectedDepartment) {
      setFormError('Name, email, and department are required');
      return;
    }

    try {
      setOperationLoading(true);
      const payload = {
        ...formData,
        dpt_id: selectedDepartment.dpt_id
      };
      await employeeService.createEmployee(payload);
      await loadEmployees(); // Refresh list
      setShowAddModal(false);
      showOperationStatus('success', `${formData.emp_name} created successfully!`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    const dept = departments.find(d => d.dpt_id === employee.dpt_id);
    setSelectedDepartment(dept || null);
    setFormData({
      emp_name: employee.emp_name || '',
      emp_role: employee.emp_role || 'teacher',
      emp_gender: employee.emp_gender || 'Male',
      emp_email: employee.emp_email || '',
      emp_phoneNumber: employee.emp_phoneNumber || '',
      dpt_id: employee.dpt_id || ''
    });
    setFormError('');
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.emp_name || !formData.emp_email || !selectedDepartment) {
      setFormError('Name, email, and department are required');
      return;
    }

    try {
      setOperationLoading(true);
      const payload = {
        ...formData,
        dpt_id: selectedDepartment.dpt_id
      };
      await employeeService.updateEmployee(selectedEmployee.emp_id, payload);
      await loadEmployees();
      setShowUpdateModal(false);
      setSelectedEmployee(null);
      showOperationStatus('success', `${formData.emp_name} updated successfully!`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteEmployee = async (employee) => {
    try {
      setOperationLoading(true);
      await employeeService.deleteEmployee(employee.emp_id);
      await loadEmployees();
      setDeleteConfirm(null);
      showOperationStatus('success', `${employee.emp_name} deleted successfully!`);
    } catch (err) {
      showOperationStatus('error', err.message || 'Failed to delete employee');
    } finally {
      setOperationLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      teacher: 'bg-blue-100 text-blue-800',
      admin: 'bg-purple-100 text-purple-800',
      stock_manager: 'bg-green-100 text-green-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const totalPages = Math.ceil(employees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = employees.slice(startIndex, endIndex);

  // Reusable Department Combobox Component
  const DepartmentSelect = ({ value, onChange }) => (
    <Combobox value={value} onChange={onChange} nullable>
      <div className="relative">
        <Combobox.Label className="block text-sm font-medium text-gray-700 mb-1">
          Department *
        </Combobox.Label>
        <Combobox.Input
          className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          displayValue={(dept) => dept?.dpt_name || ''}
          onChange={(e) => setDeptQuery(e.target.value)}
          placeholder="Search department..."
        />
        <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2 mt-6">
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </Combobox.Button>
        <AnimatePresence>
          {filteredDepartments.length > 0 && (
            <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
              {filteredDepartments.map((dept) => (
                <Combobox.Option
                  key={dept.dpt_id}
                  value={dept}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-primary-600 text-white' : 'text-gray-900'}`
                  }
                >
                  {({ selected, active }) => (
                    <>
                      <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                        {dept.dpt_name}
                      </span>
                      {selected && (
                        <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-primary-600'}`}>
                          <CheckCircle className="w-5 h-5" />
                        </span>
                      )}
                    </>
                  )}
                </Combobox.Option>
              ))}
            </Combobox.Options>
          )}
        </AnimatePresence>
      </div>
    </Combobox>
  );

  const renderTableView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold">ID</th>
              <th
                className="text-left py-3 px-4 text-gray-600 font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  setSortBy('emp_name');
                  setSortOrder(sortBy === 'emp_name' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
                }}
              >
                <div className="flex items-center space-x-1">
                  <span>Name</span>
                  <ChevronDown className={`w-4 h-4 ${sortBy === 'emp_name' ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>
              </th>
              <th
                className="text-left py-3 px-4 text-gray-600 font-semibold cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  setSortBy('emp_role');
                  setSortOrder(sortBy === 'emp_role' ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
                }}
              >
                <div className="flex items-center space-x-1">
                  <span>Role</span>
                  <ChevronDown className={`w-4 h-4 ${sortBy === 'emp_role' ? 'text-primary-600' : 'text-gray-400'}`} />
                </div>
              </th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden lg:table-cell">Gender</th>
              <th className="text-left py-3 px-4 text-gray-600 font-semibold hidden md:table-cell">Contact</th>
              <th className="text-right py-3 px-4 text-gray-600 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {currentEmployees.map((employee) => (
              <motion.tr
                key={employee.emp_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="hover:bg-gray-50"
              >
                <td className="py-3 px-4 text-gray-900">#{employee.emp_id}</td>
                <td className="py-3 px-4 font-medium text-gray-900">{employee.emp_name}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(employee.emp_role)}`}>
                    {employee.emp_role.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-600 hidden lg:table-cell">{employee.emp_gender}</td>
                <td className="py-3 px-4 hidden md:table-cell">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {employee.emp_email}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-900">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {employee.emp_phoneNumber}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center justify-end space-x-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleViewEmployee(employee)}
                      className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => handleEditEmployee(employee)}
                      className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => setDeleteConfirm(employee)}
                      className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {currentEmployees.map((employee) => (
        <motion.div
          key={employee.emp_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow border border-gray-100 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-900 text-sm truncate">{employee.emp_name}</div>
              <div className="text-gray-500 text-xs truncate">{employee.emp_email}</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(employee.emp_role)}`}>
                {employee.emp_role.replace('_', ' ')}
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => handleViewEmployee(employee)}
                className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => handleEditEmployee(employee)}
                className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
              </motion.button>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setDeleteConfirm(employee)}
              className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="bg-white rounded-lg shadow border border-gray-100 divide-y divide-gray-100">
      {currentEmployees.map((employee) => (
        <motion.div
          key={employee.emp_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-4 py-4 hover:bg-gray-50"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-gray-900 text-sm truncate">{employee.emp_name}</div>
                <div className="text-gray-500 text-xs truncate">{employee.emp_email}</div>
              </div>
            </div>
            <div className="hidden md:grid grid-cols-3 gap-4 text-sm text-gray-600 flex-1 max-w-xl px-4">
              <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(employee.emp_role)}`}>
                {employee.emp_role.replace('_', ' ')}
              </span>
              <span>{employee.emp_gender}</span>
              <span>{employee.emp_phoneNumber}</span>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => handleViewEmployee(employee)}
                className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => handleEditEmployee(employee)}
                className="text-gray-500 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50 transition-colors"
              >
                <Edit className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                onClick={() => setDeleteConfirm(employee)}
                className="text-gray-500 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  const renderPagination = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between bg-white px-4 py-3 border-t border-gray-100 rounded-b-lg shadow">
        <div className="text-sm text-gray-600">
          Showing {startIndex + 1}-{Math.min(endIndex, employees.length)} of {employees.length}
        </div>
        <div className="flex items-center space-x-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          {pages.map((page) => (
            <motion.button
              key={page}
              whileHover={{ scale: 1.05 }}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-1.5 text-sm rounded ${
                currentPage === page
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 bg-white border border-gray-200 hover:bg-primary-50'
              }`}
            >
              {page}
            </motion.button>
          ))}
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <div className="sticky top-0 bg-white shadow-md z-10">
        <div className="primary mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="text-gray-600 hover:text-primary-600 p-2 rounded-full hover:bg-primary-50"
              >
                <Minimize2 className="w-5 h-5" />
              </motion.button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Employee Management</h1>
                <p className="text-sm text-gray-500">Manage your organization's employees with ease</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={loadData}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-primary-600 border border-gray-200 rounded hover:bg-primary-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm">Refresh</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleAddEmployee}
                disabled={operationLoading}
                className="flex items-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Employee</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="primary mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: 'Total Employees', count: totalEmployees, color: 'primary-600', icon: Users },
            { title: 'Teachers', count: teachers, color: 'blue-600', icon: Briefcase },
            { title: 'Admins', count: admins, color: 'purple-600', icon: User },
            { title: 'Stock Managers', count: stockManagers, color: 'green-600', icon: Briefcase },
          ].map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-lg shadow border border-gray-100 p-4"
            >
              <div className="flex items-center space-x-3">
                <div className={`p-3 bg-${stat.color.replace('600', '50')} rounded-full flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-xl font-semibold text-gray-900">{stat.count}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64 pl-10 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {/* <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded transition-colors ${
                  showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-gray-200 text-gray-600 hover:bg-primary-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filter</span>
              </motion.button> */}
            </div>
            <div className="flex items-center space-x-3">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                className="text-sm border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="emp_name-asc">Name (A-Z)</option>
                <option value="emp_name-desc">Name (Z-A)</option>
                <option value="emp_role-asc">Role (A-Z)</option>
                <option value="emp_role-desc">Role (Z-A)</option>
                <option value="emp_email-asc">Email (A-Z)</option>
                <option value="emp_email-desc">Email (Z-A)</option>
              </select>
              <div className="flex items-center border border-gray-200 rounded">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setViewMode('table')}
                  className={`p-2 text-sm transition-colors ${
                    viewMode === 'table' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  <List className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setViewMode('grid')}
                  className={`p-2 text-sm transition-colors ${
                    viewMode === 'grid' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setViewMode('list')}
                  className={`p-2 text-sm transition-colors ${
                    viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:text-primary-600'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm"
          >
            {error}
          </motion.div>
        )}

        {loading ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center text-gray-600">
            <div className="inline-flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm">Loading employees...</span>
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-100 p-8 text-center">
            <p className="text-lg font-semibold text-gray-900">
              {searchTerm ? 'No Employees Found' : 'No Employees Available'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Add a new employee to get started.'}
            </p>
          </div>
        ) : (
          <div>
            {viewMode === 'table' && renderTableView()}
            {viewMode === 'grid' && renderGridView()}
            {viewMode === 'list' && renderListView()}
            {renderPagination()}
          </div>
        )}

        <AnimatePresence>
          {operationStatus && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50"
            >
              <div
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-lg text-sm ${
                  operationStatus.type === 'success'
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : operationStatus.type === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-800'
                    : 'bg-primary-50 border border-primary-200 text-primary-800'
                }`}
              >
                {operationStatus.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                {operationStatus.type === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
                {operationStatus.type === 'info' && <AlertCircle className="w-5 h-5 text-primary-600" />}
                <span className="font-medium">{operationStatus.message}</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setOperationStatus(null)}
                  className="hover:opacity-70"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {operationLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 flex items-center justify-center z-40"
            >
              <div className="bg-white rounded-lg p-4 shadow-xl">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-700 text-sm font-medium">Processing...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete Employee</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-gray-700">
                    Are you sure you want to delete <span className="font-semibold">{deleteConfirm.emp_name}</span>?
                  </p>
                </div>
                <div className="flex items-center justify-end space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleDeleteEmployee(deleteConfirm)}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

     <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Employee</h3>
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                  {formError}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="emp_name"
                    value={formData.emp_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    name="emp_role"
                    value={formData.emp_role}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                    <option value="stock_manager">Stock Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select
                    name="emp_gender"
                    value={formData.emp_gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="emp_email"
                    value={formData.emp_email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="emp_phoneNumber"
                    value={formData.emp_phoneNumber}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <DepartmentSelect
                  value={selectedDepartment}
                  onChange={setSelectedDepartment}
                />

                <div className="flex justify-end space-x-3 pt-4">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.05 }}
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedDepartment(null);
                      setFormError('');
                    }}
                    className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.05 }}
                    disabled={operationLoading}
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                  >
                    {operationLoading ? 'Creating...' : 'Create Employee'}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
        <AnimatePresence>
          {showUpdateModal && selectedEmployee && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Employee</h3>
                {formError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm mb-4">
                    {formError}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="emp_name"
                      value={formData.emp_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="Enter employee name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                    <select
                      name="emp_role"
                      value={formData.emp_role}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                      <option value="stock_manager">Stock Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      name="emp_gender"
                      value={formData.emp_gender}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      name="emp_email"
                      value={formData.emp_email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="employee@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="emp_phoneNumber"
                      value={formData.emp_phoneNumber}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="+250788123456"
                    />
                  </div>
                 
                <DepartmentSelect
                  value={selectedDepartment}
                  onChange={setSelectedDepartment}
                />

                  <div className="flex justify-end space-x-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => {
                        setShowUpdateModal(false);
                        setSelectedEmployee(null);
                        setFormData({
                          emp_name: '',
                          emp_role: 'teacher',
                          emp_gender: 'Male',
                          emp_email: '',
                          emp_phoneNumber: '',
                          emp_password: '',
                          dpt_id: ''
                        });
                        setFormError('');
                      }}
                      className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={handleUpdateSubmit}
                      disabled={operationLoading}
                      className="px-4 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                      {operationLoading ? 'Updating...' : 'Update Employee'}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showViewModal && selectedEmployee && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Employee Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                    <p className="text-sm text-gray-900">#{selectedEmployee.emp_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <p className="text-sm text-gray-900">{selectedEmployee.emp_name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedEmployee.emp_role)}`}>
                      {selectedEmployee.emp_role.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <p className="text-sm text-gray-900">{selectedEmployee.emp_gender || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-sm text-gray-900">{selectedEmployee.emp_email || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <p className="text-sm text-gray-900">{selectedEmployee.emp_phoneNumber || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department ID</label>
                    <p className="text-sm text-gray-900">{selectedEmployee.department.name || '-'}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => {
                      setShowViewModal(false);
                      setSelectedEmployee(null);
                    }}
                    className="px-4 py-2 text-sm border border-gray-200 rounded hover:bg-gray-50 text-gray-600"
                  >
                    Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default EmployeeManagementDashboard;