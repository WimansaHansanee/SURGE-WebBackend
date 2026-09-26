const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

// Enable CORS so the React app (port 5173) can talk to Express (port 3000)
app.use(cors());
// Middleware to parse incoming JSON payloads
app.use(express.json());

// Initialize the sqlite3 database
const db = new sqlite3.Database('./sensorData.db');
db.serialize(() => {
  // Create a table in the database (device_id added so we can identify readings)
  db.run(
    "CREATE TABLE IF NOT EXISTS history (time TEXT, device_id TEXT, s1 REAL, s2 REAL, s3 REAL, s4 REAL)"
  );
});

// Arduino/ESP POSTs sensor data here
app.post('/api/sensor-data', (req, res) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  console.log('\n--- Incoming Sensor Data Received ---');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('-------------------------------------\n');

  if (req.body && req.body.readings) {
    const time = new Date().toLocaleTimeString();
    const r = req.body.readings;
    const deviceId = req.body.device_id || 'unknown';

    db.run(
      "INSERT INTO history (time, device_id, s1, s2, s3, s4) VALUES (?, ?, ?, ?, ?, ?)",
      [time, deviceId, r[0].distance_cm, r[1].distance_cm, r[2].distance_cm, r[3].distance_cm]
    );
  }

  res.status(200).json({
    status: 'success',
    message: 'Data successfully received by backend and added to the database'
  });
});

// React frontend GETs the MOST RECENT single reading (feeds the live cards)
app.get('/api/sensor-data', (req, res) => {
  db.get("SELECT * FROM history ORDER BY rowid DESC LIMIT 1", (err, row) => {
    if (err) return res.status(500).send(err);
    if (!row) return res.status(200).json({ device_id: null, readings: null });

    res.status(200).json({
      device_id: row.device_id,
      time: row.time,
      readings: [
        { sensor_id: 1, distance_cm: row.s1 },
        { sensor_id: 2, distance_cm: row.s2 },
        { sensor_id: 3, distance_cm: row.s3 },
        { sensor_id: 4, distance_cm: row.s4 }
      ]
    });
  });
});

// React frontend GETs the last 20 readings (feeds the real-time chart)
app.get('/api/history', (req, res) => {
  db.all("SELECT * FROM history ORDER BY rowid DESC LIMIT 20", (err, rows) => {
    if (err) return res.status(500).send(err);
    // Reverse to chronological order (left to right on the chart)
    res.status(200).json(rows.reverse());
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