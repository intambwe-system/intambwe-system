const express = require("express");
const router = express.Router();
const tradeController = require("../../controllers/trade/tradeControllers");

router.post("/", tradeController.createTrade);
router.get("/", tradeController.getTrades);
router.get("/:id", tradeController.getTradeById);
router.put("/:id", tradeController.updateTrade);
router.delete("/:id", tradeController.deleteTrade);

module.exports = router;
