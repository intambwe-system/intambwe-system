// validators/employeeValidator.js
const employeeValidator = {
  // Email validation
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Phone number validation
  isValidPhone(phone) {
    if (!phone) return true; // Optional field
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    return phoneRegex.test(phone);
  },

  // Role validation
  isValidRole(role) {
    const validRoles = ['teacher', 'admin', 'stock_manager'];
    return validRoles.includes(role);
  },

  // Gender validation
  isValidGender(gender) {
    if (!gender) return true; // Optional field
    const validGenders = ['Male', 'Female', 'Other'];
    return validGenders.includes(gender);
  },

  // Password strength validation
  isValidPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(password);
  },

  // Validate employee data
  validateEmployeeData(data, isUpdate = false) {
    const errors = [];

    // Name validation
    if (!isUpdate || data.emp_name !== undefined) {
      if (!data.emp_name || data.emp_name.trim().length === 0) {
        errors.push('Employee name is required');
      } else if (data.emp_name.length > 100) {
        errors.push('Employee name must not exceed 100 characters');
      }
    }

    // Role validation
    if (!isUpdate || data.emp_role !== undefined) {
      if (!data.emp_role) {
        errors.push('Employee role is required');
      } else if (!this.isValidRole(data.emp_role)) {
        errors.push('Invalid role. Must be: teacher, admin, or stock_manager');
      }
    }

    // Email validation
    if (!isUpdate || data.emp_email !== undefined) {
      if (!data.emp_email) {
        errors.push('Email is required');
      } else if (!this.isValidEmail(data.emp_email)) {
        errors.push('Invalid email format');
      } else if (data.emp_email.length > 100) {
        errors.push('Email must not exceed 100 characters');
      }
    }


    // Gender validation
    if (data.emp_gender && !this.isValidGender(data.emp_gender)) {
      errors.push('Invalid gender. Must be: Male, Female, or Other');
    }

    // Phone validation
    if (data.emp_phoneNumber && !this.isValidPhone(data.emp_phoneNumber)) {
      errors.push('Invalid phone number format');
    }

    // Department ID validation
    if (data.dpt_id !== undefined && data.dpt_id !== null) {
      if (!Number.isInteger(data.dpt_id) || data.dpt_id <= 0) {
        errors.push('Invalid department ID');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

module.exports = employeeValidator;
