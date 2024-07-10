const { DataTypes } = require('sequelize');

const sequelize = require('../sequelize');


const Entity = sequelize.define('Entity', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  x: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  y: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  percent: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  charged_batteries: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  discharged_batteries: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  isHere: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  // freezeTableName: true,
  tableName: 'entities',
  // timestamps: false,
});


module.exports = Entity;
