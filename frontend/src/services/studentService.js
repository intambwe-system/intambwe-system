import api from '../api/api'; // Assuming your api instance is correctly imported

class StudentService {
  
  // -----------------------
  // CREATE STUDENT (POST /student)
  // -----------------------
  async createStudent(data) {
    try {
      // POST to /student
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

  // -----------------------
  // GET ALL STUDENTS (GET /student)
  // -----------------------
  async getAllStudents() {
    try {
      // GET from /student
      const response = await api.get('/student');
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load students';
      throw new Error(msg);
    }
  }

  // -----------------------
  // GET STUDENT BY ID (GET /student/:id)
  // -----------------------
  async getStudentById(id) {
    try {
      const response = await api.get(`/student/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load student details';
      throw new Error(msg);
    }
  }

  // -----------------------
  // SEARCH STUDENTS (GET /student/search)
  // -----------------------
  async searchStudents(query) {
    try {
      // Assumes the search term is passed as a query parameter (e.g., /student/search?q=query)
      const response = await api.get(`/student/search?q=${query}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to search students';
      throw new Error(msg);
    }
  }

  // -----------------------
  // GET STUDENT STATS (GET /student/stats)
  // -----------------------
  async getStudentStats() {
    try {
      const response = await api.get('/student/stats');
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load student statistics';
      throw new Error(msg);
    }
  }
  
  // -----------------------
  // GET STUDENTS BY CLASS (GET /student/class/:class_id)
  // -----------------------
  async getStudentsByClass(classId) {
    try {
      const response = await api.get(`/student/class/${classId}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load students by class';
      throw new Error(msg);
    }
  }

  // -----------------------
  // UPDATE STUDENT (PUT /student/:id)
  // -----------------------
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

  // -----------------------
  // PARTIAL UPDATE (PATCH /student/:id)
  // -----------------------
  async patchStudent(id, data) {
    try {
      const response = await api.patch(`/student/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to partially update student';
      throw new Error(msg);
    }
  }

  // -----------------------
  // DELETE STUDENT (DELETE /student/:id)
  // -----------------------
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

// Optional named exports for destructuring access
export const {
  createStudent,
  getAllStudents,
  getStudentById,
  searchStudents,
  getStudentStats,
  getStudentsByClass,
  updateStudent,
  patchStudent,
  deleteStudent,
} = studentService;