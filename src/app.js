const express = require('express');
const cors = require('cors');

const sensorRoutes = require('./routes/sensorRoutes');
const alertRoutes = require('./routes/alertRoutes');

const app = express();

// Standard middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'IoT Gas Leakage and Fire Detection System Backend is operational',
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'IoTAP Smart Gas & Fire Detection Backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount modular API routes
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);

// Fallback 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('[Error Middleware]', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'production' ? {} : err.message,
  });
});

module.exports = app;
