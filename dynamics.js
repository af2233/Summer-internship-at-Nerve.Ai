const fs = require('fs').promises;
const path = require('path');
const Op = require('sequelize').Op;
const { spawn } = require('child_process');

const sequelize = require('./sequelize');
const Entity = require('./models/Entity');


const calculateDistance = (obj1, obj2) => {
  return Math.sqrt((obj1.x - obj2.x) ** 2 + (obj1.y - obj2.y) ** 2);
};


const loadMatrix = async () => {
  const filePath = path.join(__dirname, 'matrix.txt');
  const data = await fs.readFile(filePath, 'utf8');
  const lines = data.split('\n');
  const matrix = lines.map(line => line.split(' ').map(Number));
  return matrix;
};


const saveMatrix = async (matrix) => {
  const filePath = path.join(__dirname, 'matrix.txt');
  const data = matrix.map(row => row.join(' ')).join('\n');
  await fs.writeFile(filePath, data, 'utf8');
};


async function updateObject() {
  try {
    const matrix = await loadMatrix();

    const vehicles = await Entity.findAll({ where: {percent: {[Op.ne]: null, [Op.gt]: 20}, isHere: false} });  // choosing only scooters

    const N = vehicles.length;
    if (N === 0) {
      console.log('No active objects found.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * N);
    const selectedObject = vehicles[randomIndex];

    // Random change of coordinates
    const coords = {x: selectedObject.x, y: selectedObject.y};
    selectedObject.x = Math.random() * 100;
    selectedObject.y = Math.random() * 100;
    const charge_spent = Math.floor(calculateDistance(coords, selectedObject));  // 1% == 1km

    // Reducing the charge level
    selectedObject.percent = Math.max(selectedObject.percent - charge_spent, 0);
    selectedObject.isActive = (selectedObject.percent < 50);

    await selectedObject.save();

    console.log(`Object with ID ${selectedObject.id} updated successfully.`);

    // Update the distance matrix for a changed object
    const connectivityThreshold = 0.01;  // chance of being connected
    for (let i = 0; i < N; i++) {
      const obj = vehicles[i];
      if (Math.random() < connectivityThreshold) {
        const distance = calculateDistance(selectedObject, obj);
        matrix[randomIndex][i] = distance;
      } else {
        matrix[randomIndex][i] = 'Infinity';
      }
    }

    await saveMatrix(matrix);

    console.log('Distance matrix updated and saved.\n');
  } catch (error) {
    console.error('Error updating object:', error);
  }
}


async function chargeStation() {
  try {
    const selectedObject = await Entity.findOne({ where: { isActive: false, isHere: false} }); // chosing one inactive charging station

    if (selectedObject.length === 0) {
      return;
    }

    // Charging up batteries
    selectedObject.charged_batteries = 10;
    selectedObject.discharged_batteries = 0;
    selectedObject.isActive = true;

    await selectedObject.save();

    console.log(`Station with ID ${selectedObject.id} charged and ready.\n`);
  } catch (error) {
    console.error('Error updating object:', error);
  }
}


async function executeScript() {

  let pythonProcess;
  const specialOutput = "Program finished.";

  const intervalId = setInterval(() => {
    pythonProcess = spawn('python', ['algorithm.py']);

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`stdout: ${output}`);

      // Check for the special output
      if (output.includes(specialOutput)) {
        clearInterval(intervalId); // Stop the interval
        pythonProcess.kill(); // Terminate the Python process
        console.log('Python process terminated.');
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });


  }, 3000); // Updates every 3 seconds
}



async function startUpdating() {
  setInterval(updateObject, 6000);  // Update every 6 seconds
  setInterval(chargeStation, 60000);  // Updates every minute

  executeScript();

}


sequelize.authenticate()
  .then(() => {
    console.log('Connection to database has been established successfully.');
    startUpdating();
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
