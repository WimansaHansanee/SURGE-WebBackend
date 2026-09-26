const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose()''

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


//Initialize the sqlite3 database
const db = sqlite3.Database('./sensorData.db');
db.serialize(()=>{
  //Create a table in the database
  db.run("CREATE TABLE IF NOT EXISTS history (time TEXT, s1 REAL, s2 REAL, s3 REAL, s4 REAL)");
})

// Test endpoint matching your IoT HTTP POST payload. Arduino POSTs data here.
app.post('/api/sensor-data', (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  console.log('\n--- Incoming Sensor Data Received ---');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('-------------------------------------\n');

  // Save the incoming data from Arduino
  if (req.body && req.body.readings) {
    latestSensorData = req.body;
    const time = new Date().toLocaleDateString();
    const r = latestSensorData.readings;

    //Insert data in to the database
    db.run("INSERT INTO history (time, s1, s2, s3, s4) VALUES (?, ?, ?, ?, ?)", 
    [time, r[0].distance_cm, r[1].distance_cm, r[2].distance_cm, r[3].distance_cm]);
  }
  // Respond with HTTP 200 OK
  res.status(200).json({
    status: 'success',
    message: 'Data successfully received by backend and added to the database'
  });
});

  // React frontend GETs data from here
app.get('/api/sensor-data', (req, res) => {
  // Fetch the last 20 readings for the chart
  db.all("SELECT * FROM history ORDER BY rowid DESC LIMIT 20", (err, rows) => {
    if (err) return res.status(500).send(err);
    // Reverse to chronological order (left to right)
    res.status(200).json(rows.reverse());
  });
  res.status(200).json({
    latest : latestSensorData,
    history_data : rows.reverse()
  });
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