const http = require('http');
const dotenv = require('dotenv');

// Load environment variables before any other imports that might use them
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const { initMQTT, closeMQTT } = require('./config/mqtt');

const PORT = process.env.PORT || 5000;

// Create HTTP server wrapping the Express app
const server = http.createServer(app);

// Initialize real-time Socket.IO communication
initSocket(server);

// Handle server startup errors (e.g. port conflicts EADDRINUSE)
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`[Server Error] Port ${PORT} is already in use. Please terminate the conflicting process or choose another PORT.`);
  } else {
    console.error(`[Server Error] Failed to start server: ${error.message}`);
  }
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Initialize MQTT broker connection and subscription for ESP32
    initMQTT();

    server.listen(PORT, () => {
      console.log('====================================================');
      console.log(` IoTAP Gas & Fire Detection Backend is Running `);
      console.log(` Server Port       : ${PORT}`);
      console.log(` Health Check      : http://localhost:${PORT}/`);
      console.log(` Detailed Health   : http://localhost:${PORT}/api/health`);
      console.log(` Sensor API        : http://localhost:${PORT}/api/sensors/latest`);
      console.log(` Alerts API        : http://localhost:${PORT}/api/alerts`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error(`[Server Error] Fatal startup error: ${err.message}`);
    process.exit(1);
  }
};

startServer();

// Graceful process shutdown handling
process.on('SIGINT', () => {
  console.log('\n[Process] Gracefully shutting down server...');
  closeMQTT();
  server.close(() => {
    console.log('[Process] HTTP server closed.');
    process.exit(0);
  });
});
