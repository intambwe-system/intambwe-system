// routes/stockIn.js
const express = require('express');
const router = express.Router();
const stockInController = require('../controllers/stockIn/stockInController');
const { authenticateToken, authorizeRoles } = require('../middleware/employeeAuth');

// CREATE - Only admin and stock_manager can create stock in records
router.post(
  '/',
  authenticateToken,
  authorizeRoles('admin', 'stock_manager'),
  stockInController.createStockIn
);

// READ - All authenticated users can view
router.get(
  '/',
  authenticateToken,
  stockInController.getAllStockIn
);

// SEARCH - Search before /:id to avoid conflicts
router.get(
  '/search',
  authenticateToken,
  stockInController.searchStockIn
);

// SUMMARY - Statistics
router.get(
  '/summary',
  authenticateToken,
  stockInController.getStockInSummary
);

// READ by ID
router.get(
  '/:id',
  authenticateToken,
  stockInController.getStockInById
);

// UPDATE - Only admin and stock_manager can update
router.put(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'stock_manager'),
  stockInController.updateStockIn
);

router.patch(
  '/:id',
  authenticateToken,
  authorizeRoles('admin', 'stock_manager'),
  stockInController.updateStockIn
);

// UPDATE STATUS - Only admin and stock_manager can update status
router.patch(
  '/:id/status',
  authenticateToken,
  authorizeRoles('admin', 'stock_manager'),
  stockInController.updateStockInStatus
);

// DELETE - Only admin can delete
router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles('admin'),
  stockInController.deleteStockIn
);

module.exports = router;