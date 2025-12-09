import api from '../api/api'; // Axios instance (with JWT interceptor)

class DepartmentService {
  // CREATE DEPARTMENT
  async create(data) {
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

  // GET ALL DEPARTMENTS
  async getAll() {
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

  // GET A SINGLE DEPARTMENT
  async getById(id) {
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

  // UPDATE DEPARTMENT
  async update(id, data) {
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

  // DELETE DEPARTMENT
  async delete(id) {
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

  // GET DEPARTMENT OVERVIEW (Counts)
  async getOverview(id) {
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
}

const departmentService = new DepartmentService();
export default departmentService;

// Optional named exports (like in your employee service)
export const {
  create,
  getAll,
  getById,
  update,
  delete: deleteDepartment,
  getOverview,
} = departmentService;
