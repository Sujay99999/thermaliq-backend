require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost and common development ports
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8081',
      'http://localhost:19006',
      'http://localhost:19000',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8081',
      'http://127.0.0.1:19006',
      'http://127.0.0.1:19000',
    ];
    
    // Allow all origins in development, restrict in production
    if (process.env.NODE_ENV === 'production') {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Handle preflight requests
app.options('*', cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
const calculateRoutes = require('./routes/calculate');
const roomRoutes = require('./routes/room');
const matterportRoutes = require('./routes/matterport');

app.use('/api/calculate', calculateRoutes);
app.use('/api/process-room', roomRoutes);
app.use('/api/matterport', matterportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'THERMSOL.ai Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'THERMSOL.ai Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      calculate: 'POST /api/calculate',
      processRoom: 'POST /api/process-room',
      matterportMeasurements: 'POST /api/matterport/extract-measurements'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found'
    }
  });
});

// Start server - Listen on all network interfaces (0.0.0.0) to allow connections from mobile devices
// This is critical for physical devices to connect via local network
const HOST = process.env.HOST || '0.0.0.0'; // Listen on all interfaces, not just localhost

app.listen(PORT, HOST, () => {
  console.log(`🚀 THERMSOL.ai Backend Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  
  // Display network interfaces for mobile device connection
  const os = require('os');
  const interfaces = os.networkInterfaces();
  console.log(`\n📱 Network Interfaces (for mobile device connection):`);
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ interface: name, address: iface.address });
        console.log(`   ${iface.address} (${name}) - http://${iface.address}:${PORT}/api`);
      }
    }
  }
  if (addresses.length === 0) {
    console.log(`   ⚠️  No network interfaces found. Make sure you're connected to WiFi/Ethernet.`);
  }
  console.log(``);
});

module.exports = app;

