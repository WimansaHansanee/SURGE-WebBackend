const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

function validateSensorPayload(payload) {
  if (!payload || !Array.isArray(payload.readings)) {
    return null;
  }

  const readings = payload.readings.slice(0, 4).map((reading) => {
    if (!reading || typeof reading.distance_cm !== 'number' || !Number.isFinite(reading.distance_cm)) {
      return null;
    }
    return Number(reading.distance_cm);
  });

  if (readings.length !== 4 || readings.some((value) => value === null)) {
    return null;
  }

  return readings;
}

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

  const readings = validateSensorPayload(req.body);
  if (!readings) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid sensor payload. Expected 4 numeric readings in readings[].'
    });
  }

  const time = new Date().toLocaleTimeString();
  const deviceId = typeof req.body.device_id === 'string' && req.body.device_id.trim()
    ? req.body.device_id.trim()
    : 'unknown';

  db.run(
    "INSERT INTO history (time, device_id, s1, s2, s3, s4) VALUES (?, ?, ?, ?, ?, ?)",
    [time, deviceId, readings[0], readings[1], readings[2], readings[3]],
    (err) => {
      if (err) {
        console.error('Failed to save sensor data:', err.message);
        return res.status(500).json({
          status: 'error',
          message: 'Failed to save sensor data to the database',
          error: err.message
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Data successfully received by backend and added to the database'
      });
    }
  );
});

function getDeviceFilter(req) {
  const device = typeof req.query.device === 'string' ? req.query.device.trim() : '';
  return device || null;
}

// React frontend GETs the MOST RECENT single reading (feeds the live cards)
app.get('/api/sensor-data', (req, res) => {
  const device = getDeviceFilter(req);
  const query = device
    ? 'SELECT * FROM history WHERE device_id = ? ORDER BY rowid DESC LIMIT 1'
    : 'SELECT * FROM history ORDER BY rowid DESC LIMIT 1';
  const params = device ? [device] : [];

  db.get(query, params, (err, row) => {
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
  const device = getDeviceFilter(req);
  const query = device
    ? 'SELECT * FROM history WHERE device_id = ? ORDER BY rowid DESC LIMIT 20'
    : 'SELECT * FROM history ORDER BY rowid DESC LIMIT 20';
  const params = device ? [device] : [];

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).send(err);
    // Reverse to chronological order (left to right on the chart)
    res.status(200).json((rows || []).reverse());
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