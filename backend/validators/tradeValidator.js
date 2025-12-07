const tradeValidator = {
  validateTradeData(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate || data.trade_name !== undefined) {
      if (!data.trade_name || data.trade_name.trim().length === 0) {
        errors.push("trade_name is required");
      }
    }

    if (!isUpdate || data.trade_description !== undefined) {
      if (
        data.trade_description &&
        typeof data.trade_description !== "string"
      ) {
        errors.push("trade_description must be a string");
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

module.exports = tradeValidator;
