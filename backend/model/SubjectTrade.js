const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Join table for many-to-many relation between Subject and Trade
const SubjectTrade = sequelize.define('SubjectTrade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  sbj_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Subject',
      key: 'sbj_id',
    },
    onDelete: 'CASCADE',
  },
  trade_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Trade',
      key: 'trade_id',
    },
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'SubjectTrade',
  timestamps: false,
});

module.exports = SubjectTrade;
