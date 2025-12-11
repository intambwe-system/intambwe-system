import React, { useState, useEffect } from 'react';
import { Search, CheckCircle, XCircle, Clock, Save, AlertCircle, Filter } from 'lucide-react';

// Import your services (adjust paths as needed)
import studentService from '../../services/studentService';
import classService from '../../services/classService';
import attendanceService from '../../services/attendanceService';
import { useEmployeeAuth } from '../../contexts/EmployeeAuthContext';

const AttendanceMarkingPage = () => {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isViewMode, setIsViewMode] = useState(false);
  const [attendanceExists, setAttendanceExists] = useState(false);
  const {employee} = useEmployeeAuth()
  
  // Get current date and time
const getCurrentDate = () => {
  return new Intl.DateTimeFormat('en-CA', { // 'en-CA' gives YYYY-MM-DD format
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

const getCurrentTime = () => {
  return new Intl.DateTimeFormat('en-GB', { // 'en-GB' gives 24-hour format
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date());
};


  // Initialize state from URL params or localStorage
  const getInitialState = () => {
    const params = new URLSearchParams(window.location.search);
    const stored = localStorage.getItem('attendanceFilters');
    const storedData = stored ? JSON.parse(stored) : {};
    
    return {
      selectedClassId: params.get('classId') || employee?.class_id || storedData.selectedClassId || '',
      attendanceDate: params.get('date') || storedData.attendanceDate || getCurrentDate(),
      attendanceTime: params.get('timeIn') || storedData.attendanceTime || getCurrentTime(),
      timeOut: params.get('timeOut') || storedData.timeOut || '',
      searchTerm: params.get('search') || storedData.searchTerm || '',
      statusFilter: params.get('status') || storedData.statusFilter || 'all'
    };
  };

  const initialState = getInitialState();
  const [selectedClassId, setSelectedClassId] = useState(initialState.selectedClassId);
  const [attendanceDate, setAttendanceDate] = useState(initialState.attendanceDate);
  const [attendanceTime, setAttendanceTime] = useState(initialState.attendanceTime);
  const [timeOut, setTimeOut] = useState(initialState.timeOut);
  const [searchTerm, setSearchTerm] = useState(initialState.searchTerm);
  const [statusFilter, setStatusFilter] = useState(initialState.statusFilter);

  // Update URL and localStorage whenever filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedClassId) params.set('classId', selectedClassId);
    if (attendanceDate) params.set('date', attendanceDate);
    if (attendanceTime) params.set('timeIn', attendanceTime);
    if (timeOut) params.set('timeOut', timeOut);
    if (searchTerm) params.set('search', searchTerm);
    if (statusFilter !== 'all') params.set('status', statusFilter);

    // Update URL without reloading
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);

    // Save to localStorage
    localStorage.setItem('attendanceFilters', JSON.stringify({
      selectedClassId,
      attendanceDate,
      attendanceTime,
      timeOut,
      searchTerm,
      statusFilter
    }));
  }, [selectedClassId, attendanceDate, attendanceTime, timeOut, searchTerm, statusFilter]);

  // Check if selected date is in the past (not today)
  const isDateInPast = () => {
    const today = getCurrentDate();
    return attendanceDate < today;
  };

  // Check if selected date is today
  const isDateToday = () => {
    const today = getCurrentDate();
    return attendanceDate === today;
  };

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses();
  }, []);

  // Fetch attendance when class or date changes
  useEffect(() => {
    if (selectedClassId && attendanceDate) {
      fetchStudentsWithAttendance(selectedClassId, attendanceDate);
    }
  }, [selectedClassId, attendanceDate]);
  
  const fetchClasses = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await classService.getAllClasses();
      const classData = response.data || response;
      setClasses(classData);
    } catch (err) {
      setError(err.message || 'Failed to load classes');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch students and their attendance for the selected date
  const fetchStudentsWithAttendance = async (classId, date) => {
    if (!classId || !date) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    setAttendanceExists(false);
    
    try {
      // Step 1: Fetch ALL students in the class
      const studentsResponse = await studentService.getStudentsByClass(classId);
      const studentsData = studentsResponse.data || studentsResponse;
      
      // Step 2: Fetch attendance records for this class and date
      let attendanceData = [];
      try {
        const attendanceResponse = await attendanceService.getAttendance({class_id:classId,start_date:date , end_date:date});
        attendanceData = attendanceResponse.data || attendanceResponse || [];
      } catch (attendanceErr) {
        console.warn('error',attendanceErr);
        
        // No attendance found - continue with empty array
        attendanceData = [{shit:''}];
      }
      console.warn('serge ',attendanceData,studentsData);

     
      
      // Step 3: Check if any attendance exists for this date
      const hasAttendanceRecords = attendanceData && attendanceData.length > 0;
      setAttendanceExists(hasAttendanceRecords);
      
      // Step 4: Map students and check if each has existing attendance
      const studentsWithAttendance = studentsData.map(student => {
        // Find if this student has attendance record for this date
        const existingAttendance = attendanceData.find(att => att.student_id === student.std_id);
        
        if (existingAttendance) {
          // Student has existing attendance - mark as recorded
          return {
            ...student,
            status: existingAttendance.status || 'present',
            recorded: true, // Mark as recorded since attendance exists
            time_in: existingAttendance.time_in || '',
            time_out: existingAttendance.time_out || '',
            attendance_id: existingAttendance.id // Use 'id' from Attendance model
          };
        } else {
          // Student has no attendance record - mark as not recorded
          return {
            ...student,
            status: 'present',
            recorded: false, // Not recorded yet
            time_in: '',
            time_out: ''
          };
        }
      });
      
      setStudents(studentsWithAttendance);
      
      // Step 5: Determine if it's view mode or edit mode
      if (isDateInPast()) {
        // Past date
        setIsViewMode(true);
        if (!hasAttendanceRecords) {
          setError(`No attendance records found for ${date}`);
        }
      } else {
        // Today or future - allow editing
        setIsViewMode(false);
      }
      
    } catch (err) {
      setError(err.message || 'Failed to load students');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle class selection
  const handleClassChange = (e) => {
    const classId = e.target.value;
    setSelectedClassId(classId);
    if (!classId) {
      setStudents([]);
      setIsViewMode(false);
      setAttendanceExists(false);
    }
  };

  // Handle date change
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setAttendanceDate(newDate);
  };

  // Update student status
  const updateStudentStatus = (studentId, status) => {
    if (isViewMode) return; // Don't allow updates in view mode
    
    setStudents(prevStudents =>
      prevStudents.map(student =>
        student.std_id === studentId
          ? { ...student, status }
          : student
      )
    );
  };

  // Mark all as present
  const markAllPresent = () => {
    if (isViewMode) return;
    
    setStudents(prevStudents =>
      prevStudents.map(student => ({ ...student, status: 'present' }))
    );
  };

  // Mark all as absent
  const markAllAbsent = () => {
    if (isViewMode) return;
    
    setStudents(prevStudents =>
      prevStudents.map(student => ({ ...student, status: 'absent' }))
    );
  };

  // Submit attendance
  const submitAttendance = async () => {
    if (!selectedClassId) {
      setError('Please select a class first');
      return;
    }

    if (!attendanceDate || !attendanceTime) {
      setError('Please select date and time in');
      return;
    }

    if (isViewMode) {
      setError('Cannot update attendance for past dates');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const attendanceRecords = students.map(student => ({
        student_id: student.std_id,
        class_id: parseInt(selectedClassId),
        date: attendanceDate,
        time_in: attendanceTime,
        time_out: timeOut || null,
        status: student.status,
        method: 'manual'
      }));

      // Submit all records
      const promises = attendanceRecords.map(async (record) =>
        await attendanceService.recordAttendance(record)
      );

      await Promise.all(promises);

      // Refresh the data to show recorded status
      await fetchStudentsWithAttendance(selectedClassId, attendanceDate);

      setSuccess(`Attendance recorded successfully for ${students.length} students!`);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to submit attendance');
    } finally {
      setSaving(false);
    }
  };

  // Update existing attendance
  const updateAttendance = async () => {
    if (!selectedClassId) {
      setError('Please select a class first');
      return;
    }

    if (isViewMode) {
      setError('Cannot update attendance for past dates');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updatePromises = students
        .filter(student => student.recorded && student.attendance_id)
        .map(async (student) => {
          const updateData = {
            status: student.status,
            time_in: attendanceTime,
            time_out: timeOut || null
          };
          return await attendanceService.updateAttendance(student.attendance_id, updateData);
        });
      
      // Also handle students that don't have attendance yet (recorded: false)
      const newAttendanceRecords = students
        .filter(student => !student.recorded)
        .map(student => ({
          student_id: student.std_id,
          class_id: parseInt(selectedClassId),
          date: attendanceDate,
          time_in: attendanceTime,
          time_out: timeOut || null,
          status: student.status,
          method: 'manual'
        }));
      
      const createPromises = newAttendanceRecords.map(async (record) =>
        await attendanceService.recordAttendance(record)
      );

      await Promise.all(updatePromises);
      await Promise.all(createPromises);

      // Refresh the data
      await fetchStudentsWithAttendance(selectedClassId, attendanceDate);

      setSuccess(`Attendance updated successfully!`);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  // Filter students by search term and status filter
  const filteredStudents = students.filter(student => {
    // Search filter
    const fullName = `${student.std_fname} ${student.std_mname || ''} ${student.std_lname}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
           student.std_email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Get status button classes
  const getStatusButtonClass = (currentStatus, buttonStatus) => {
    const baseClass = "px-4 py-2 rounded-lg font-medium transition-all duration-200 ";
    const isActive = currentStatus === buttonStatus;
    const disabledClass = isViewMode ? "cursor-not-allowed opacity-60 " : "";
    
    switch (buttonStatus) {
      case 'present':
        return baseClass + disabledClass + (isActive 
          ? 'bg-primary-600 text-white shadow-lg' 
          : 'bg-gray-100 text-gray-600 hover:bg-primary-100');
      case 'late':
        return baseClass + disabledClass + (isActive 
          ? 'bg-amber-600 text-white shadow-lg' 
          : 'bg-gray-100 text-gray-600 hover:bg-amber-100');
      case 'absent':
        return baseClass + disabledClass + (isActive 
          ? 'bg-purple-500 text-white shadow-lg' 
          : 'bg-gray-100 text-gray-600 hover:bg-purple-100');
      default:
        return baseClass + disabledClass;
    }
  };

  // Get status filter button class
  const getFilterButtonClass = (filterValue) => {
    const isActive = statusFilter === filterValue;
    return `px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
      isActive 
        ? 'bg-blue-600 text-white shadow-lg' 
        : 'bg-gray-100 text-gray-600 hover:bg-blue-100'
    }`;
  };

  // Get status counts
  const getStatusCounts = () => {
    return {
      total: students.length,
      present: students.filter(s => s.status === 'present').length,
      late: students.filter(s => s.status === 'late').length,
      absent: students.filter(s => s.status === 'absent').length
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              {isViewMode ? 'View Attendance' : 'Mark Attendance'}
            </h1>
            {isViewMode && (
              <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
                View Only Mode
              </span>
            )}
          </div>
          
          {/* Class Selection and Date/Time */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Class
              </label>
              <select
                value={selectedClassId}
                onChange={handleClassChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Select a Class --</option>
                {classes.map(cls => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={attendanceDate}
                max={getCurrentDate()}
                onChange={handleDateChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time In
              </label>
              <input
                type="time"
                value={attendanceTime}
                onChange={(e) => setAttendanceTime(e.target.value)}
                disabled={isViewMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Out
              </label>
              <input
                type="time"
                value={timeOut}
                onChange={(e) => setTimeOut(e.target.value)}
                disabled={isViewMode}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Quick Actions */}
          {students.length > 0 && !isViewMode && (
            <div className="flex flex-wrap gap-3">
              <button
                onClick={markAllPresent}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors duration-200 flex items-center gap-2"
              >
                <CheckCircle size={18} />
                Mark All Present
              </button>
              <button
                onClick={markAllAbsent}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors duration-200 flex items-center gap-2"
              >
                <XCircle size={18} />
                Mark All Absent
              </button>
            </div>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
            <CheckCircle size={20} />
            {success}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading students...</p>
          </div>
        )}

        {/* Students List */}
        {!loading && students.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            {/* Status Summary */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Total Students</div>
                <div className="text-2xl font-bold text-blue-600">{statusCounts.total}</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Present</div>
                <div className="text-2xl font-bold text-green-600">{statusCounts.present}</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Late</div>
                <div className="text-2xl font-bold text-amber-600">{statusCounts.late}</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Absent</div>
                <div className="text-2xl font-bold text-red-600">{statusCounts.absent}</div>
              </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search students by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Filter size={20} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
                <button
                  onClick={() => setStatusFilter('all')}
                  className={getFilterButtonClass('all')}
                >
                  All ({statusCounts.total})
                </button>
                <button
                  onClick={() => setStatusFilter('present')}
                  className={getFilterButtonClass('present')}
                >
                  Present ({statusCounts.present})
                </button>
                <button
                  onClick={() => setStatusFilter('late')}
                  className={getFilterButtonClass('late')}
                >
                  Late ({statusCounts.late})
                </button>
                <button
                  onClick={() => setStatusFilter('absent')}
                  className={getFilterButtonClass('absent')}
                >
                  Absent ({statusCounts.absent})
                </button>
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">#</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Student Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Attendance Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Time In</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Time Out</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <tr key={student.std_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4 text-gray-600">{index + 1}</td>
                      <td className="py-4 px-4">
                        <div className="font-medium text-gray-800">
                          {student.std_fname} {student.std_mname} {student.std_lname}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-600">{student.std_email}</td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => updateStudentStatus(student.std_id, 'present')}
                            className={getStatusButtonClass(student.status, 'present')}
                            disabled={isViewMode}
                          >
                            <CheckCircle size={16} className="inline mr-1" />
                            Present
                          </button>
                          <button
                            onClick={() => updateStudentStatus(student.std_id, 'late')}
                            className={getStatusButtonClass(student.status, 'late')}
                            disabled={isViewMode}
                          >
                            <Clock size={16} className="inline mr-1" />
                            Late
                          </button>
                          <button
                            onClick={() => updateStudentStatus(student.std_id, 'absent')}
                            className={getStatusButtonClass(student.status, 'absent')}
                            disabled={isViewMode}
                          >
                            <XCircle size={16} className="inline mr-1" />
                            Absent
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600">
                        {student.time_in || attendanceTime || '-'}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-600">
                        {student.time_out || timeOut || '-'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {student.recorded ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                            <CheckCircle size={14} />
                            Recorded
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredStudents.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No students found matching your filters.
              </div>
            )}

            {/* Submit/Update Button */}
            {!isViewMode && (
              <div className="mt-6 flex justify-end">
                {attendanceExists && students.some(s => s.recorded) ? (
                  <button
                    onClick={updateAttendance}
                    disabled={saving}
                    className="px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 font-medium"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        Update Attendance
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={submitAttendance}
                    disabled={saving || students.every(s => s.recorded)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 font-medium"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        Submit Attendance
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!loading && selectedClassId && students.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">No students found in this class.</p>
          </div>
        )}



        {!selectedClassId && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 text-lg">Please select a class to view or mark attendance.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceMarkingPage;