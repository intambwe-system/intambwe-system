import api from '../api/api'; // Axios instance with JWT interceptor

class AttendanceService {
  // ====================== CREATE / UPSERT ======================
  async recordAttendance(data) {
    try {
      const response = await api.post('/attendance', data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to record attendance';
      throw new Error(msg);
    }
  }

  // ====================== GET ALL (with filters + pagination) ======================
  async getAttendance(filters = {}) {
    try {
      const response = await api.get('/attendance', { params: filters });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load attendance records';
      throw new Error(msg);
    }
  }

  // ====================== GET BY ID ======================
  async getAttendanceById(id) {
    try {
      const response = await api.get(`/attendance/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load attendance record';
      throw new Error(msg);
    }
  }

  // ====================== UPDATE (PUT) ======================
  async updateAttendance(id, data) {
    try {
      const response = await api.put(`/attendance/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update attendance';
      throw new Error(msg);
    }
  }

  // ====================== PATCH (Partial update) ======================
  async patchAttendance(id, data) {
    try {
      const response = await api.patch(`/attendance/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update attendance';
      throw new Error(msg);
    }
  }

  // ====================== DELETE ======================
  async deleteAttendance(id) {
    try {
      const response = await api.delete(`/attendance/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to delete attendance';
      throw new Error(msg);
    }
  }

  // ====================== STUDENT SUMMARY ======================
  async getStudentSummary(student_id, filters = {}) {
    try {
      const response = await api.get(
        `/attendance/student/${student_id}/summary`,
        { params: filters }
      );
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch student summary';
      throw new Error(msg);
    }
  }

  // ====================== GROUPED ROUTES ======================

  async groupByClass(filters = {}) {
    try {
      const response = await api.get('/attendance/group/class', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to fetch attendance grouped by class'
      );
    }
  }

  async groupByDate(filters = {}) {
    try {
      const response = await api.get('/attendance/group/date', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to fetch attendance grouped by date'
      );
    }
  }

  async groupByStudent(filters = {}) {
    try {
      const response = await api.get('/attendance/group/student', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to fetch attendance grouped by student'
      );
    }
  }

  async groupByEmployee(filters = {}) {
    try {
      const response = await api.get('/attendance/group/employee', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to fetch attendance grouped by employee'
      );
    }
  }

  async groupByStatus(filters = {}) {
    try {
      const response = await api.get('/attendance/group/status', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to fetch attendance grouped by status'
      );
    }
  }

  async groupByMethod(filters = {}) {
    try {
      const response = await api.get('/attendance/group/method', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      throw new Error(
        error.response?.data?.message ||
          error.message ||
          'Failed to fetch attendance grouped by method'
      );
    }
  }
}

const attendanceService = new AttendanceService();
export default attendanceService;

// Optional named exports
export const {
  recordAttendance,
  getAttendance,
  getAttendanceById,
  updateAttendance,
  patchAttendance,
  deleteAttendance,
  getStudentSummary,
  groupByClass,
  groupByDate,
  groupByStudent,
  groupByEmployee,
  groupByStatus,
  groupByMethod,
} = attendanceService;
