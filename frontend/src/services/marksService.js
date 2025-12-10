import api from "../api/api";

class MarksService {
  // Get students of a subject
  async getStudentsBySubject(sbj_id) {
    try {
      const response = await api.get(`/marks/subject/${sbj_id}/students`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  // Add marks (assessment/exam)
  async addMarks(data) {
    try {
      const response = await api.post("/marks/subject/add", data);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  // Get all marks of a subject
  async getMarksBySubject(sbj_id) {
    try {
      const response = await api.get(`/marks/subject/${sbj_id}/marks`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  // Update subject weight
  async updateSubjectWeight(sbj_id, weight) {
    try {
      const response = await api.put(`/marks/subject/${sbj_id}/weight`, weight);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message);
    }
  }
}

const marksService = new MarksService();
export default marksService;
