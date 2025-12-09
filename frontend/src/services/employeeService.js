import api from '../api/api'; // Axios instance with JWT interceptor

class EmployeeService {
  // CREATE (Normal employee - protected)
  async createEmployee(data) {
    try {
      const response = await api.post('/employee', data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to create employee';
      throw new Error(msg);
    }
  }



  // GET ALL (with filters & pagination)
  async getAllEmployees(filters = {}) {
    try {
      const response = await api.get('/employee', { params: filters });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load employees';
      throw new Error(msg);
    }
  }

  // SEARCH EMPLOYEES (?query=)
  async searchEmployees(query) {
    try {
      const response = await api.get('/employee/search', {
        params: { query },
      });
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to search employees';
      throw new Error(msg);
    }
  }

  // GET BY ID
  async getEmployeeById(id) {
    try {
      const response = await api.get(`/employee/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to load employee';
      throw new Error(msg);
    }
  }

  // UPDATE (PUT)
  async updateEmployee(id, data) {
    try {
      const response = await api.put(`/employee/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update employee';
      throw new Error(msg);
    }
  }

  // PATCH (Partial update)
  async patchEmployee(id, data) {
    try {
      const response = await api.patch(`/employee/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to update employee';
      throw new Error(msg);
    }
  }

  // DELETE
  async deleteEmployee(id) {
    try {
      const response = await api.delete(`/employee/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        'Failed to delete employee';
      throw new Error(msg);
    }
  }
}

const employeeService = new EmployeeService();
export default employeeService;

// Optional named exports
export const {
  createEmployee,
  createAdminEmployee,
  getAllEmployees,
  searchEmployees,
  getEmployeeById,
  updateEmployee,
  patchEmployee,
  deleteEmployee,
} = employeeService;