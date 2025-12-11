import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Import your services
import attendanceService from '../../services/attendanceService';
import classService from '../../services/classService';

const AttendanceDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [selectedClass, setSelectedClass] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState('');
  
  // Data states
  const [classes, setClasses] = useState([]);
  const [overviewStats, setOverviewStats] = useState({
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    totalRecords: 0,
    attendanceRate: 0
  });
  
  const [dateGroupedData, setDateGroupedData] = useState([]);
  const [classGroupedData, setClassGroupedData] = useState([]);
  const [statusGroupedData, setStatusGroupedData] = useState([]);
  const [methodGroupedData, setMethodGroupedData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  
  // Chart colors
  const COLORS = {
    present: '#10b981',
    absent: '#ef4444',
    late: '#f59e0b',
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    tertiary: '#ec4899'
  };
  
  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch all data when filters change
  useEffect(() => {
    if (startDate && endDate) {
      fetchAllData();
    }
  }, [selectedClass, startDate, endDate, selectedStatus]);

  const fetchClasses = async () => {
    try {
      const response = await classService.getAllClasses();
      const classData = response.data || response;
      setClasses(classData);
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const filters = {
        startDate,
        endDate,
        ...(selectedClass && { class_id: selectedClass }),
        ...(selectedStatus && { status: selectedStatus })
      };

      // Fetch all grouped data in parallel
      const [
        dateGrouped,
        classGrouped,
        statusGrouped,
        methodGrouped,
        allRecords
      ] = await Promise.all([
        attendanceService.groupByDate(filters),
        attendanceService.groupByClass(filters),
        attendanceService.groupByStatus(filters),
        attendanceService.groupByMethod(filters),
        attendanceService.getAttendance(filters)
      ]);

      // Process date grouped data
      const dateData = dateGrouped.data || dateGrouped || [];
      setDateGroupedData(dateData);

      // Process class grouped data
      const classData = classGrouped.data || classGrouped || [];
      setClassGroupedData(classData);

      // Process status grouped data
      const statusData = statusGrouped.data || statusGrouped || [];
      setStatusGroupedData(statusData);

      // Process method grouped data
      const methodData = methodGrouped.data || methodGrouped || [];
      setMethodGroupedData(methodData);

      

      // Calculate overview statistics
      const records = allRecords.data || allRecords || [];
      const totalRecords = records.length;
      const totalPresent = records.filter(r => r.status === 'present').length;
      const totalAbsent = records.filter(r => r.status === 'absent').length;
      const totalLate = records.filter(r => r.status === 'late').length;
      const attendanceRate = totalRecords > 0 
        ? ((totalPresent + totalLate) / totalRecords * 100).toFixed(1)
        : 0;

      setOverviewStats({
        totalPresent,
        totalAbsent,
        totalLate,
        totalRecords,
        attendanceRate
      });

      // Prepare trend data for line chart
      const trendDataProcessed = dateData.map(item => ({
        date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        present: item.present || 0,
        absent: item.absent || 0,
        late: item.late || 0,
        total: item.total || 0,
        rate: item.total > 0 ? ((item.present + item.late) / item.total * 100).toFixed(1) : 0
      }));
      setTrendData(trendDataProcessed);

    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
  };

  const exportToCSV = () => {
    // Create CSV content
    let csv = 'Date,Class,Student,Status,Time In,Time Out,Method\n';
    
    // This would need the full attendance records
    // For now, just show an alert
    alert('Export functionality - Connect to full attendance records endpoint');
  };

  // Stats card component
  const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 text-${color}-600`}>{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <Icon className={`text-${color}-600`} size={24} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Attendance Dashboard</h1>
            <p className="text-gray-600 mt-1">Track and analyze attendance records</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-800">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Classes</option>
                {classes.map(cls => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center mb-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading dashboard data...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                title="Total Records"
                value={overviewStats.totalRecords}
                icon={Users}
                color="blue"
                subtext={`${startDate} to ${endDate}`}
              />
              <StatCard
                title="Present"
                value={overviewStats.totalPresent}
                icon={CheckCircle}
                color="green"
                subtext={`${((overviewStats.totalPresent / overviewStats.totalRecords) * 100 || 0).toFixed(1)}% of total`}
              />
              <StatCard
                title="Absent"
                value={overviewStats.totalAbsent}
                icon={XCircle}
                color="red"
                subtext={`${((overviewStats.totalAbsent / overviewStats.totalRecords) * 100 || 0).toFixed(1)}% of total`}
              />
              <StatCard
                title="Attendance Rate"
                value={`${overviewStats.attendanceRate}%`}
                icon={TrendingUp}
                color="purple"
                subtext="Present + Late"
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Attendance Trend */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <BarChart3 size={20} />
                    Attendance Trend
                  </h2>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="present" stroke={COLORS.present} strokeWidth={2} name="Present" />
                    <Line type="monotone" dataKey="late" stroke={COLORS.late} strokeWidth={2} name="Late" />
                    <Line type="monotone" dataKey="absent" stroke={COLORS.absent} strokeWidth={2} name="Absent" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Status Distribution */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <PieChart size={20} />
                    Status Distribution
                  </h2>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={[
                        { name: 'Present', value: overviewStats.totalPresent },
                        { name: 'Late', value: overviewStats.totalLate },
                        { name: 'Absent', value: overviewStats.totalAbsent }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill={COLORS.present} />
                      <Cell fill={COLORS.late} />
                      <Cell fill={COLORS.absent} />
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Attendance by Class */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Attendance by Class
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={classGroupedData.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="class_name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" fill={COLORS.present} name="Present" />
                    <Bar dataKey="late" fill={COLORS.late} name="Late" />
                    <Bar dataKey="absent" fill={COLORS.absent} name="Absent" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Attendance by Method */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock size={20} />
                  Recording Methods
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={methodGroupedData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ method, total }) => `${method}: ${total}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="total"
                      nameKey="method"
                    >
                      {methodGroupedData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date-wise Summary */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar size={20} />
                  Daily Summary
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Present</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Late</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Absent</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dateGroupedData.slice(0, 10).map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-800">
                            {new Date(item.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="text-center py-2 px-3 text-green-600 font-medium">
                            {item.present || 0}
                          </td>
                          <td className="text-center py-2 px-3 text-amber-600 font-medium">
                            {item.late || 0}
                          </td>
                          <td className="text-center py-2 px-3 text-red-600 font-medium">
                            {item.absent || 0}
                          </td>
                          <td className="text-center py-2 px-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {item.total > 0 ? ((item.present + item.late) / item.total * 100).toFixed(1) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {dateGroupedData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No data available for selected filters
                    </div>
                  )}
                </div>
              </div>

              {/* Class-wise Summary */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Users size={20} />
                  Class Summary
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-semibold text-gray-700">Class</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Present</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Late</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Absent</th>
                        <th className="text-center py-2 px-3 font-semibold text-gray-700">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classGroupedData.slice(0, 10).map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-800 font-medium">
                            {item.class_name || `Class ${item.class_id}`}
                          </td>
                          <td className="text-center py-2 px-3 text-green-600 font-medium">
                            {item.present || 0}
                          </td>
                          <td className="text-center py-2 px-3 text-amber-600 font-medium">
                            {item.late || 0}
                          </td>
                          <td className="text-center py-2 px-3 text-red-600 font-medium">
                            {item.absent || 0}
                          </td>
                          <td className="text-center py-2 px-3">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {item.total > 0 ? ((item.present + item.late) / item.total * 100).toFixed(1) : 0}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {classGroupedData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No data available for selected filters
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceDashboard;