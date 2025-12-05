const tradeValidator = require("../../validators/tradeValidator");
const { Trade, Class } = require("../../model");

exports.createTrade = async (req, res) => {
  try {
    const data = req.body;
    const validation = tradeValidator.validateTradeData(data);

    if (!validation.isValid)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });

    const trade = await Trade.create(req.body);
    return res.status(201).json({
      success: true,
      message: "Trade created successfully",
      data: trade,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getTrades = async (req, res) => {
  try {
    const trades = await Trade.findAll({
      include: { model: Class, as: "classes" },
    });
    return res.status(200).json({
      success: true,
      message: "Trades fetched successfully",
      data: trades,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.getTradeById = async (req, res) => {
  try {
    const trade = await Trade.findByPk(req.params.id, {
      include: { model: Class, as: "classes" },
    });

    if (!trade) return res.status(404).json({ error: "Trade not found" });

    return res.status(200).json({
      success: true,
      message: "Trade fetched successfully!",
      data: trade,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.updateTrade = async (req, res) => {
  try {
    const updateData = req.body;
    const validation = tradeValidator.validateTradeData(updateData);

    if (!validation.isValid)
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.errors,
      });

    const trade = await Trade.findByPk(req.params.id);
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    await trade.update(req.body);

    return res.status(200).json({
      success: true,
      message: "Trade updated successfully!",
      data: trade,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteTrade = async (req, res) => {
  try {
    const trade = await Trade.findByPk(req.params.id);
    if (!trade) return res.status(404).json({ error: "Trade not found" });

    await trade.destroy();

    return res.status(204).json({
      success: true,
      message: "Trade deleted successfully",
      data: null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
