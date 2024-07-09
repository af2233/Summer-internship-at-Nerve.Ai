const fs = require('fs').promises;
const path = require('path');
const Op = require('sequelize').Op;
const { PythonShell } = require('python-shell');
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


const updateObject = async (matrix) => {
  try {
    const matrix = await loadMatrix();

    const vehicles = await Entity.findAll({ where: {percent: {[Op.ne]: null, [Op.gt]: 20}, isHere: false} });  // выбираем только самокаты

    const N = vehicles.length;
    if (N === 0) {
      console.log('No active objects found.');
      return;
    }

    const randomIndex = Math.floor(Math.random() * N);
    const selectedObject = vehicles[randomIndex];

    // Случайное изменение координат
    const coords = {x: selectedObject.x, y: selectedObject.y};
    selectedObject.x = Math.random() * 100;
    selectedObject.y = Math.random() * 100;
    const charge_spent = Math.floor(calculateDistance(coords, selectedObject));  // 1% == 1km

    // Понижение уровня заряда
    selectedObject.percent = Math.max(selectedObject.percent - charge_spent, 0);
    selectedObject.active = (selectedObject.percent >= 50);

    await selectedObject.save();

    console.log(`Object with ID ${selectedObject.id} updated successfully.`);

    // Обновление матрицы расстояний для измененного объекта
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

    console.log('Distance matrix updated and saved.');
  } catch (error) {
    console.error('Error updating object:', error);
  }
};





const chargeStation = async () => {
  try {
    const selectedObject = await Entity.findOne({ where: {charged_batteries: 0, discharged_batteries: 10, isActive: false, isHere: false} });

    const N = selectedObject.length;
    if (N === 0) {
      return;
    }

    // Зарядка батарей
    selectedObject.charged_batteries = 10;
    selectedObject.discharged_batteries = 0;
    selectedObject.isActive = true;

    await selectedObject.save();

    console.log(`Station with ID ${selectedObject.id} charged and ready.`);

  } catch (error) {
    console.error('Error updating object:', error);
  }
};








function executeScript() {

  const pythonProcess = spawn('python', ['algorithm.py']);
  pythonProcess.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  pythonProcess.stderr.on('data', (data) => {
    console.log(data.toString());
  });
}



async function startUpdating() {
  setInterval(() => updateObject(), 2000);  // Update every 2 seconds
  setInterval(() => executeScript(), 3000);  // Update every 3 seconds
  setInterval(() => chargeStation(), 60000);  // Updates every minute
}


sequelize.authenticate()
  .then(() => {
    console.log('Connection to database has been established successfully.');
    startUpdating();
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });
