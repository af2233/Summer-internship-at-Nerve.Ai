const express = require('express');
const fs = require('fs');
const path = require('path');

const sequelize = require('./sequelize');
const Entity = require('./models/Entity');
const Charger = require('./models/Charger');

const app = express();
const port = 3000;

app.use(express.static('public'));

app.get('/api/entities', async (req, res) => {
  try {
    const entities = await Entity.findAll();
    res.json(entities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

app.get('/api/charger', async (req, res) => {
  try {
    const charger = await Charger.findAll();
    res.json(charger);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch charger' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
