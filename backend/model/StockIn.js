// models/Stock.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Stock = sequelize.define('Stock', {
  stock_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  stock_inId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'StockIn',
      key: 'stock_inId'
    }
  },
  item_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  number: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  sn_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 0
    }
  },
  gr_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  received_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  issued_nonprofit: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  issued_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  euro_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'Stock',
  timestamps: true,
  indexes: [
    {
      name: 'idx_stock_item',
      fields: ['item_id']
    },
    {
      name: 'idx_stock_sn',
      fields: ['sn_id']
    },
    {
      name: 'idx_stock_issued',
      fields: ['issued_nonprofit']
    },
    {
      name: 'idx_stock_received_date',
      fields: ['received_date']
    }
  ],
  hooks: {
    beforeSave: (stock) => {
      // Auto-calculate total_price
      if (stock.quantity && stock.unit_price) {
        stock.total_price = stock.quantity * stock.unit_price;
      }
    }
  }
});

module.exports = Stock;