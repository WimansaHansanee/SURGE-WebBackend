const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to parse incoming JSON payloads
app.use(express.json());

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Test endpoint matching your IoT HTTP POST payload
app.post('/api/sensor-data', (req, res) => {
  console.log('\n--- Incoming Sensor Data Received ---');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('-------------------------------------\n');

  // Respond with HTTP 200 OK
  res.status(200).json({
    status: 'success',
    message: 'Data successfully received by backend'
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