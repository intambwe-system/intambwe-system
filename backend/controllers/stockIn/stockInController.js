// controllers/stockIn/stockInController.js
const { StockIn, Stock, Employee } = require('../../model');
const { Op } = require('sequelize');
const stockInValidator = require('../../validators/stockinValidator');
const stockInController = {
  // CREATE - Add new stock in entry
  async createStockIn(req, res) {
    try {
      const stockInData = req.body;

      // Validate input data
      const validation = stockInValidator.validateStockInData(stockInData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
        });
      }

      // Check if employee exists
      if (stockInData.received_by) {
        const employee = await Employee.findByPk(stockInData.received_by);
        if (!employee) {
          return res.status(404).json({
            success: false,
            message: 'Employee not found',
          });
        }
      }

      // Check if reference number already exists
      if (stockInData.reference_number) {
        const existingStockIn = await StockIn.findOne({
          where: { reference_number: stockInData.reference_number },
        });
        if (existingStockIn) {
          return res.status(409).json({
            success: false,
            message: 'Reference number already exists',
          });
        }
      }

      // Create stock in record
      const stockIn = await StockIn.create(stockInData);

      // Fetch stock in with relationships
      const stockInWithRelations = await StockIn.findByPk(stockIn.stock_inId, {
        include: [
          {
            model: Employee,
            as: 'receiver',
            attributes: ['emp_id', 'emp_name', 'emp_email', 'emp_role'],
          },
        ],
      });

      return res.status(201).json({
        success: true,
        message: 'Stock In record created successfully',
        data: stockInWithRelations,
      });
    } catch (error) {
      console.error('Error creating stock in:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },

  // READ - Get all stock in records
  async getAllStockIn(req, res) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search = '', 
        status,
        received_by 
      } = req.query;

      // Build where clause
      const whereClause = {};

      if (search) {
        whereClause[Op.or] = [
          { reference_number: { [Op.like]: `%${search}%` } },
          { supplier_name: { [Op.like]: `%${search}%` } },
        ];
      }

      if (status) {
        whereClause.status = status;
      }

      if (received_by) {
        whereClause.received_by = received_by;
      }

      // Calculate pagination
      const offset = (page - 1) * limit;

      // Fetch stock in records with pagination
      const { count, rows } = await StockIn.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: Employee,
            as: 'receiver',
            attributes: ['emp_id', 'emp_name', 'emp_email', 'emp_role'],
          },
          {
            model: Stock,
            as: 'stockItems',
          },
        ],
        order: [['createdAt', 'DESC']],
      });

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error('Error fetching stock in records:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },

  // READ - Get stock in by ID
  async getStockInById(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock in ID',
        });
      }

      const stockIn = await StockIn.findByPk(id, {
        include: [
          {
            model: Employee,
            as: 'receiver',
            attributes: ['emp_id', 'emp_name', 'emp_email', 'emp_role'],
          },
          {
            model: Stock,
            as: 'stockItems',
          },
        ],
      });

      if (!stockIn) {
        return res.status(404).json({
          success: false,
          message: 'Stock In record not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: stockIn,
      });
    } catch (error) {
      console.error('Error fetching stock in:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },

  // UPDATE - Update stock in
  async updateStockIn(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock in ID',
        });
      }

      // Find stock in
      const stockIn = await StockIn.findByPk(id);
      if (!stockIn) {
        return res.status(404).json({
          success: false,
          message: 'Stock In record not found',
        });
      }

      // Validate update data
      const validation = stockInValidator.validateStockInData(updateData, true);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
        });
      }

      // Check if employee exists (if being updated)
      if (updateData.received_by) {
        const employee = await Employee.findByPk(updateData.received_by);
        if (!employee) {
          return res.status(404).json({
            success: false,
            message: 'Employee not found',
          });
        }
      }

      // Check if reference number is being updated and already exists
      if (updateData.reference_number && 
          updateData.reference_number !== stockIn.reference_number) {
        const existingStockIn = await StockIn.findOne({
          where: { reference_number: updateData.reference_number },
        });
        if (existingStockIn) {
          return res.status(409).json({
            success: false,
            message: 'Reference number already exists',
          });
        }
      }

      // Update stock in
      await stockIn.update(updateData);

      // Fetch updated stock in with relationships
      const updatedStockIn = await StockIn.findByPk(id, {
        include: [
          {
            model: Employee,
            as: 'receiver',
            attributes: ['emp_id', 'emp_name', 'emp_email', 'emp_role'],
          },
          {
            model: Stock,
            as: 'stockItems',
          },
        ],
      });

      return res.status(200).json({
        success: true,
        message: 'Stock In record updated successfully',
        data: updatedStockIn,
      });
    } catch (error) {
      console.error('Error updating stock in:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },

  // DELETE - Delete stock in
  async deleteStockIn(req, res) {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock in ID',
        });
      }

      // Find stock in
      const stockIn = await StockIn.findByPk(id);
      if (!stockIn) {
        return res.status(404).json({
          success: false,
          message: 'Stock In record not found',
        });
      }

      // Check if there are related stock items
      const relatedStocks = await Stock.count({ 
        where: { stock_inId: id } 
      });

      if (relatedStocks > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete Stock In record. It has ${relatedStocks} related stock items.`,
        });
      }

      // Delete stock in
      await stockIn.destroy();

      return res.status(200).json({
        success: true,
        message: 'Stock In record deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting stock in:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },

  // Update stock in status
  async updateStockInStatus(req, res) {
    try {
      const { id } = req.params;
      const statusData = req.body;

      // Validate ID
      if (!id || isNaN(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid stock in ID',
        });
      }

      // Validate status data
      const validation = stockInValidator.validateStatusUpdate(statusData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors,
        });
      }

      const stockIn = await StockIn.findByPk(id);

      if (!stockIn) {
        return res.status(404).json({
          success: false,
          message: 'Stock In record not found',
        });
      }

      await stockIn.update({ status: statusData.status });

      // Fetch updated stock in with relationships
      const updatedStockIn = await StockIn.findByPk(id, {
        include: [
          {
            model: Employee,
            as: 'receiver',
            attributes: ['emp_id', 'emp_name', 'emp_email'],
          },
        ],
      });

      return res.status(200).json({
        success: true,
        message: 'Stock In status updated successfully',
        data: updatedStockIn,
      });
    } catch (error) {
      console.error('Error updating stock in status:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },

  // SEARCH - Search stock in records
  async searchStockIn(req, res) {
    try {
      const { query } = req.query;

      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const stockInRecords = await StockIn.findAll({
        where: {
          [Op.or]: [
            { reference_number: { [Op.like]: `%${query}%` } },
            { supplier_name: { [Op.like]: `%${query}%` } },
            { supplier_contact: { [Op.like]: `%${query}%` } },
          ],
        },
        include: [
          {
            model: Employee,
            as: 'receiver',
            attributes: ['emp_id', 'emp_name', 'emp_email'],
          },
          {
            model: Stock,
            as: 'stockItems',
          },
        ],
        limit: 20,
      });

      return res.status(200).json({
        success: true,
        data: stockInRecords,
        count: stockInRecords.length,
      });
    } catch (error) {
      console.error('Error searching stock in records:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },

  // Get stock in summary/statistics
  async getStockInSummary(req, res) {
    try {
      const totalStockIn = await StockIn.count();
      const pendingStockIn = await StockIn.count({ 
        where: { status: 'pending' } 
      });
      const receivedStockIn = await StockIn.count({ 
        where: { status: 'received' } 
      });
      const cancelledStockIn = await StockIn.count({ 
        where: { status: 'cancelled' } 
      });

      return res.status(200).json({
        success: true,
        data: {
          totalStockIn,
          pendingStockIn,
          receivedStockIn,
          cancelledStockIn,
        },
      });
    } catch (error) {
      console.error('Error fetching stock in summary:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message,
      });
    }
  },
};

module.exports = stockInController;