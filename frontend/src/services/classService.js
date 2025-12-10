import api from "../api/api"; // Axios instance with JWT interceptor

class ClassService {
  // CREATE
  async createClass(data) {
    try {
      const response = await api.post("/class", data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to create class";
      throw new Error(msg);
    }
  }

  // GET CLASS ASSIGNMENTS (Subject + Teacher + credit + total_max)
  async getClassAssignments(id) {
    try {
      const response = await api.get(`/class/${id}/assignments`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load class subject assignments';
      throw new Error(msg);
    }
  }

  // ASSIGN SUBJECTS TO CLASS (bulk)
  async assignSubjectsToClass(id, data) {
    try {
      const response = await api.post(`/class/${id}/assign-subjects`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to assign subjects to class';
      throw new Error(msg);
    }
  }

  // GET ALL (supports filters)
  async getAllClasses(filters = {}) {
    try {
      const response = await api.get("/class", { params: filters });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to load classes";
      throw new Error(msg);
    }
  }

  // GET BY ID
  async getClassById(id) {
    try {
      const response = await api.get(`/class/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to load class";
      throw new Error(msg);
    }
  }

  // GET CLASS STUDENTS
  async getClassStudents(id) {
    try {
      const response = await api.get(`/class/${id}/students`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to load class students";
      throw new Error(msg);
    }
  }

  // GET CLASS SUBJECTS
  async getClassSubjects(id) {
    try {
      const response = await api.get(`/class/${id}/subjects`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to load class subjects";
      throw new Error(msg);
    }
  }

  // GET CLASS OVERVIEW
  async getClassOverview(id) {
    try {
      const response = await api.get(`/class/${id}/overview`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to load class overview";
      throw new Error(msg);
    }
  }

  // UPDATE (PUT)
  async updateClass(id, data) {
    try {
      const response = await api.put(`/class/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to update class";
      throw new Error(msg);
    }
  }

  // PATCH
  async patchClass(id, data) {
    try {
      const response = await api.patch(`/class/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to update class";
      throw new Error(msg);
    }
  }

  // DELETE
  async deleteClass(id) {
    try {
      const response = await api.delete(`/class/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete class";
      throw new Error(msg);
    }
  }
}

const classService = new ClassService();
export default classService;

// Optional named exports
export const {
  createClass,
  getAllClasses,
  getClassById,
  getClassStudents,
  getClassSubjects,
  getClassOverview,
  getClassAssignments,
  assignSubjectsToClass,
  updateClass,
  patchClass,
  deleteClass,
} = classService;
