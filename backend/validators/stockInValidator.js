// validators/stockInValidator.js
const stockInValidator = {
  // Validate phone/contact number
  isValidContact(contact) {
    if (!contact) return true; // Optional field
    const contactRegex = /^[0-9+\-\s()]{10,20}$/;
    return contactRegex.test(contact);
  },

  // Validate status
  isValidStatus(status) {
    const validStatuses = ['pending', 'received', 'cancelled'];
    return validStatuses.includes(status);
  },

  // Validate date
  isValidDate(date) {
    const parsedDate = new Date(date);
    return parsedDate instanceof Date && !isNaN(parsedDate);
  },

  // Validate integer
  isValidInteger(value) {
    return Number.isInteger(parseInt(value)) && parseInt(value) > 0;
  },

  // Validate stock in data
  validateStockInData(data, isUpdate = false) {
    const errors = [];

    // reference_number validation
    if (!isUpdate || data.reference_number !== undefined) {
      if (!data.reference_number || data.reference_number.trim().length === 0) {
        errors.push('Reference number is required');
      } else if (data.reference_number.length > 100) {
        errors.push('Reference number must not exceed 100 characters');
      }
    }

    // supplier_name validation
    if (!isUpdate || data.supplier_name !== undefined) {
      if (!data.supplier_name || data.supplier_name.trim().length === 0) {
        errors.push('Supplier name is required');
      } else if (data.supplier_name.length > 100) {
        errors.push('Supplier name must not exceed 100 characters');
      }
    }

    // supplier_contact validation (optional)
    if (data.supplier_contact !== undefined && data.supplier_contact !== null && data.supplier_contact !== '') {
      if (!this.isValidContact(data.supplier_contact)) {
        errors.push('Invalid supplier contact format');
      } else if (data.supplier_contact.length > 50) {
        errors.push('Supplier contact must not exceed 50 characters');
      }
    }

    // received_by validation (employee ID)
    if (!isUpdate || data.received_by !== undefined) {
      if (!data.received_by) {
        errors.push('Received by (Employee ID) is required');
      } else if (!this.isValidInteger(data.received_by)) {
        errors.push('Invalid Employee ID');
      }
    }

    // received_date validation
    if (!isUpdate || data.received_date !== undefined) {
      if (!data.received_date) {
        errors.push('Received date is required');
      } else if (!this.isValidDate(data.received_date)) {
        errors.push('Invalid received date format');
      }
    }

    // notes validation (optional)
    if (data.notes !== undefined && data.notes !== null && data.notes !== '') {
      if (data.notes.length > 1000) {
        errors.push('Notes must not exceed 1000 characters');
      }
    }

    // status validation
    if (data.status !== undefined) {
      if (!this.isValidStatus(data.status)) {
        errors.push('Invalid status. Must be: pending, received, or cancelled');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Validate status update data
  validateStatusUpdate(data) {
    const errors = [];

    if (!data.status) {
      errors.push('Status is required');
    } else if (!this.isValidStatus(data.status)) {
      errors.push('Invalid status. Must be: pending, received, or cancelled');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

module.exports = stockInValidator;