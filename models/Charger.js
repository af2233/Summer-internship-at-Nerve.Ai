const { DataTypes } = require('sequelize');

const sequelize = require('../sequelize');


const Charger = sequelize.define('Charger', {
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
  charged_batteries: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  discharged_batteries: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  // freezeTableName: true,
  tableName: 'charger',
  // timestamps: false,
});


module.exports = Charger;
