const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Enable CORS so the React app (port 5173) can talk to Express (port 3000)
app.use(cors());
// Middleware to parse incoming JSON payloads
app.use(express.json());

// In-memory variable to store the latest sensor readings
let latestSensorData = {
  device_id: "river_node_uno_test",
  readings: [
    { sensor_id: 1, distance_cm: 0 },
    { sensor_id: 2, distance_cm: 0 },
    { sensor_id: 3, distance_cm: 0 },
    { sensor_id: 4, distance_cm: 0 }
  ]
};


// Test endpoint matching your IoT HTTP POST payload. Arduino POSTs data here.
app.post('/api/sensor-data', (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  console.log('\n--- Incoming Sensor Data Received ---');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('-------------------------------------\n');

  // Save the incoming data from Arduino
  if (req.body && req.body.readings) {
    latestSensorData = req.body;
  }

  // Respond with HTTP 200 OK
  res.status(200).json({
    status: 'success',
    message: 'Data successfully received by backend'
  });
});

  // React frontend GETs data from here
app.get('/api/sensor-data', (req, res) => {
  res.status(200).json(latestSensorData);
});

// Simple root route to verify the server is running in browser
app.get('/', (req, res) => {
  res.send('Flood Warning API Test Server is Active!');
});

// Start listening on port 3000
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n===========================================`);
  console.log(`Test Express server running on port ${PORT}`);
  console.log(`Listening for ESP module POST requests...`);
  console.log(`===========================================\n`);
});