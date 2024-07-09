const fs = require('fs');

const sequelize = require('./sequelize');
const Entity = require('./models/Entity');


function calculateDistance(entity1, entity2) {
  const dx = entity1.x - entity2.x;
  const dy = entity1.y - entity2.y;
  return Math.sqrt(dx * dx + dy * dy);
}


function generateSparseMatrix(entities, connectivityThreshold) {
  const N = entities.length;
  const matrix = Array.from({ length: N }, () => Array(N).fill(Infinity));

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i !== j && Math.random() < connectivityThreshold) {
        matrix[i][j] = calculateDistance(entities[i], entities[j]).toFixed(5);
      }
    }
  }

  // function to fix the matrix, if a node doesn't have connections
  for (let obj = 0; obj < N; ++obj) {
    let flag = false;
    for (let i = 0; i < N; i++) {
      if (matrix[obj][i] != 'Infinity') {
        flag = true;
        break;
      }
    }
    for (let i = 0; i < N; i++) {
      if (matrix[i][obj] != 'Infinity') {
        flag = true;
        break;
      }
    }
    if (flag == false) {
      const randind = Math.floor(Math.random() * N);
      matrix[obj][randind] = calculateDistance(entities[obj], entities[randind]).toFixed(5);
      matrix[randind][obj] = calculateDistance(entities[randind], entities[obj]).toFixed(5);
    }
  }
  return matrix;
}


async function create_matrix() {
  const connectivityThreshold = 0.01; // chance of being connected

  try {
    await sequelize.sync();

    // Fetch data from the database
    const allEntities = await Entity.findAll();

    // Generate the sparse distance matrix for all entities
    const matrix = generateSparseMatrix(allEntities, connectivityThreshold);

    // Write matrix to txt file
    const matrixString = matrix.map(row => row.join(' ')).join('\n');
    fs.writeFileSync('matrix.txt', matrixString);
    console.log('Distance matrix written to matrix.txt');

  } catch (error) {
    console.error('Error processing data:', error);
  } finally {
    await sequelize.close();
  }
}


create_matrix();
