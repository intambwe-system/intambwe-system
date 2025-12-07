import api from '../api/api'; // Axios instance with JWT interceptor

class DepartmentService {
  // CREATE
  async createDepartment(data) {
    try {
      const response = await api.post('/departments', data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to create department';
      throw new Error(msg);
    }
  }

  // GET ALL
  async getAllDepartments() {
    try {
      const response = await api.get('/departments');
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load departments';
      throw new Error(msg);
    }
  }

  // GET BY ID
  async getDepartmentById(id) {
    try {
      const response = await api.get(`/departments/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load department';
      throw new Error(msg);
    }
  }

  // GET OVERVIEW
  async getDepartmentOverview(id) {
    try {
      const response = await api.get(`/departments/${id}/overview`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load department overview';
      throw new Error(msg);
    }
  }

  // UPDATE (PUT)
  async updateDepartment(id, data) {
    try {
      const response = await api.put(`/departments/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update department';
      throw new Error(msg);
    }
  }

  // PATCH
  async patchDepartment(id, data) {
    try {
      const response = await api.patch(`/departments/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update department';
      throw new Error(msg);
    }
  }

  // DELETE
  async deleteDepartment(id) {
    try {
      const response = await api.delete(`/departments/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to delete department';
      throw new Error(msg);
    }
  }
}

const departmentService = new DepartmentService();
export default departmentService;

// Optional named exports
export const {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  getDepartmentOverview,
  updateDepartment,
  patchDepartment,
  deleteDepartment,
} = departmentService;
