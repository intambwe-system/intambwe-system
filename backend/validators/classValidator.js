const classValidator = {
  validateClassData(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.class_name !== undefined) {
      if (!data.class_name || data.class_name.trim().length === 0) {
        errors.push("class_name is required");
      }
    }

    if (!data.tradeId) errors.push("Trade id is required");

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

module.exports = classValidator;
