import api from '../api/api';

class SubjectService {
  async createSubject(data) {
    try {
      const response = await api.post('/subject', data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to create subject';
      throw new Error(msg);
    }
  }

  async getAllSubjects(params = {}) {
    try {
      const response = await api.get('/subject', { params });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load subjects';
      throw new Error(msg);
    }
  }

  async getSubjectById(id) {
    try {
      const response = await api.get(`/subject/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load subject details';
      throw new Error(msg);
    }
  }

  async updateSubject(id, data) {
    try {
      const response = await api.put(`/subject/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update subject';
      throw new Error(msg);
    }
  }

  async deleteSubject(id) {
    try {
      const response = await api.delete(`/subject/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to delete subject';
      throw new Error(msg);
    }
  }
}

const subjectService = new SubjectService();
export default subjectService;
