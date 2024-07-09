const sequelize = require('./sequelize');
const Entity = require('./models/Entity');
const Charger = require('./models/Charger');


async function generateData(N, M, K) {
  const entities = [];

  entities.push({ x: 0, y: 0, isHere: true });  // Starting point

  // Generate N vehicles
  for (let i = 0; i < N; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;
    const min = 7;
    const max = 80;
    const percent = min + Math.floor(Math.random() * (max + 1 - min));
    const isActive = (percent < 50);  // if percent is less then 50 - vehicle is discharged

    entities.push({ x, y, percent, isActive });
  }

  // Generate M charging stations
  for (let i = 0; i < M; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;

    entities.push({ x, y, charged_batteries: 10, discharged_batteries: 0, isActive: true });
  }

  // Generate K nodes
  for (let i = 0; i < K; i++) {
    const x = Math.random() * 100;
    const y = Math.random() * 100;

    entities.push({ x, y });
  }

  const charger = [];
  charger.push({ x: 0, y: 0, charged_batteries: 0, discharged_batteries: 0 });



  try {
    // Sync the model with the database
    await sequelize.sync({ force: true });

    // Insert all generated entities into the database
    await Entity.bulkCreate(entities);
    await Charger.bulkCreate(charger);

    console.log(`${N} vehicles, ${M} charging stations and ${K} nodes inserted successfully. Charger table created`);

  } catch (error) {
    console.error('Error inserting data:', error);
  } finally {
    await sequelize.close();
  }
}


// generateData(150, 10, 95);
generateData(20, 2, 0);
