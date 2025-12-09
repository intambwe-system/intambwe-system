import api from "../api/api"; // Axios instance with JWT interceptor

class TradeService {
  // CREATE TRADE
  async createTrade(data) {
    try {
      const response = await api.post("/trade/", data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to create trade";
      throw new Error(msg);
    }
  }

  // GET ALL TRADES
  async getAllTrades() {
    try {
      const response = await api.get("/trade/");
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to load trades";
      throw new Error(msg);
    }
  }

  // GET TRADE BY ID
  async getTradeById(id) {
    try {
      const response = await api.get(`/trade/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to load trade";
      throw new Error(msg);
    }
  }

  // UPDATE TRADE
  async updateTrade(id, data) {
    try {
      const response = await api.put(`/trade/${id}`, data);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to update trade";
      throw new Error(msg);
    }
  }

  // DELETE TRADE
  async deleteTrade(id) {
    try {
      const response = await api.delete(`/trade/${id}`);
      return response.data;
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete trade";
      throw new Error(msg);
    }
  }
}

const tradeService = new TradeService();
export default tradeService;

// Optional named exports
export const {
  createTrade,
  getAllTrades,
  getTradeById,
  updateTrade,
  deleteTrade,
} = tradeService;
