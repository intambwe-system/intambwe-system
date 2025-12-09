import api from '../api/api'; // Axios instance with JWT interceptor

class StudentService {
  // ---------------------------
  // CREATE STUDENT
  // ---------------------------
  async createStudent(data) {
    try {
      const response = await api.post('/student', data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to create student';
      throw new Error(msg);
    }
  }

  // ---------------------------
  // GET ALL STUDENTS (Filters + Pagination)
  // ---------------------------
  async getAllStudents(filters = {}) {
    try {
      const response = await api.get('/student', { params: filters });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load students';
      throw new Error(msg);
    }
  }

  // ---------------------------
  // SEARCH STUDENTS (?query=)
  // ---------------------------
  async searchStudents(query) {
    try {
      const response = await api.get('/student/search', {
        params: { query },
      });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to search students';
      throw new Error(msg);
    }
  }

  // ---------------------------
  // GET STUDENT BY ID
  // ---------------------------
  async getStudentById(id) {
    try {
      const response = await api.get(`/student/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load student';
      throw new Error(msg);
    }
  }

  // ---------------------------
  // GET STUDENTS BY CLASS
  // ---------------------------
  async getStudentsByClass(class_id) {
    try {
      const response = await api.get(`/student/class/${class_id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load class students';
      throw new Error(msg);
    }
  }

  // ---------------------------
  // GET STUDENT STATISTICS
  // ---------------------------
  async getStudentStats() {
    try {
      const response = await api.get('/student/stats');
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch student statistics';
      throw new Error(msg);
    }
  }

  // ---------------------------
  // UPDATE STUDENT (PUT)
  // ---------------------------
  async updateStudent(id, data) {
    try {
      const response = await api.put(`/student/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update student';
      throw new Error(msg);
    }
  }

  // ---------------------------
  // PATCH STUDENT (Partial update)
  // ---------------------------
  async patchStudent(id, data) {
    try {
      const response = await api.patch(`/student/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update student';
      throw new Error(msg);
    }
  }

  // ---------------------------
  // DELETE STUDENT
  // ---------------------------
  async deleteStudent(id) {
    try {
      const response = await api.delete(`/student/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to delete student';
      throw new Error(msg);
    }
  }
}

const studentService = new StudentService();
export default studentService;

// Optional named exports
export const {
  createStudent,
  getAllStudents,
  searchStudents,
  getStudentById,
  getStudentsByClass,
  getStudentStats,
  updateStudent,
  patchStudent,
  deleteStudent,
} = studentService;
