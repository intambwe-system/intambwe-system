import api from '../api/api'; // Axios instance with JWT interceptor

class DisciplineMarksService {

  // CREATE discipline marks
  async createDisciplineMarks(data) {
    try {
      const response = await api.post('/discipline-marks', data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to record discipline marks';
      throw new Error(msg);
    }
  }

  // GET ALL discipline marks (with filters)
  async getAllDisciplineMarks(filters = {}) {
    try {
      const response = await api.get('/discipline-marks', {
        params: filters,
      });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load discipline marks';
      throw new Error(msg);
    }
  }

  // GET discipline marks by ID
  async getDisciplineMarksById(id) {
    try {
      const response = await api.get(`/discipline-marks/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load discipline record';
      throw new Error(msg);
    }
  }

  // UPDATE discipline marks (PUT)
  async updateDisciplineMarks(id, data) {
    try {
      const response = await api.put(`/discipline-marks/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update discipline marks';
      throw new Error(msg);
    }
  }

  // PATCH discipline marks (partial update)
  async patchDisciplineMarks(id, data) {
    try {
      const response = await api.patch(`/discipline-marks/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update discipline marks';
      throw new Error(msg);
    }
  }

  // DELETE discipline marks
  async deleteDisciplineMarks(id) {
    try {
      const response = await api.delete(`/discipline-marks/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to delete discipline marks';
      throw new Error(msg);
    }
  }

  
}

const disciplineMarksService = new DisciplineMarksService();
export default disciplineMarksService;

// Optional named exports (same pattern as EmployeeService)
export const {
  createDisciplineMarks,
  getAllDisciplineMarks,
  getDisciplineMarksById,
  updateDisciplineMarks,
  patchDisciplineMarks,
  deleteDisciplineMarks,
} = disciplineMarksService;
