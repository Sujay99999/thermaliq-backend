# THERMSOL.ai Backend API

Backend API server for THERMSOL.ai HVAC optimization calculations. This server provides physics-based calculations for optimal HVAC temperature setback strategies.

## Features

- ✅ Express.js REST API
- ✅ CORS enabled for React Native app
- ✅ HVAC calculation endpoints
- ✅ Room scan data processing
- ✅ Error handling middleware
- ✅ Request logging
- ✅ Environment variable support

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## Helper Scripts

### Get Your Local IP Address
Useful for connecting from physical devices:
```bash
npm run get-ip
```

### Test Backend Connection
Test if the backend is accessible:
```bash
# Test localhost
npm run test-connection

# Test specific IP (for physical devices)
npm run test-connection -- 192.168.1.100
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server status and timestamp.

### Calculate HVAC Strategy
```
POST /api/calculate
```

**Request Body:**
```json
{
  "formData": {
    "zipCode": "02134",
    "outdoorTemp": 85,
    "desiredTemp": 72,
    "absenceDuration": 8,
    "floorArea": 2000,
    "insulationQuality": "average",
    "constructionType": "wood_frame",
    "constructionEra": "2000_2010",
    "utilityRate": 0.12,
    "absenceStartTime": "8:00 AM",
    "absenceEndTime": "5:00 PM"
  },
  "roomData": {
    "dimensions": {
      "width": 20,
      "height": 10,
      "depth": 15
    },
    "surfaces": [],
    "openings": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "action": "SETBACK",
    "setbackTemp": 78,
    "desiredTemp": 72,
    "outdoorTemp": 85,
    "restartTime": "4:15 PM",
    "returnTime": "5:00 PM",
    "recoveryTime": 45,
    "thermalTimeConstant": 3.5,
    "breakEvenTime": 8.8,
    "savingsPerDay": 1.80,
    "savingsPerMonth": 39.60,
    "savingsPerYear": 468,
    "energySavedKwh": 1.8,
    "percentSaved": 13.3
  }
}
```

### Process Room Scan
```
POST /api/process-room
```

**Request Body:**
```json
{
  "dimensions": {
    "width": 20,
    "height": 10,
    "depth": 15
  },
  "surfaces": [],
  "openings": [],
  "rawData": {}
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processedDimensions": {
      "width": 20,
      "height": 10,
      "depth": 15,
      "volume": 3000,
      "floorArea": 300
    },
    "surfaceArea": 0,
    "openingCount": {
      "doors": 0,
      "windows": 0,
      "total": 0
    },
    "metadata": {
      "surfaceCount": 0,
      "hasCompleteDimensions": true,
      "processedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

## Project Structure

```
thermaliq-backend/
├── server.js                 # Main server file
├── routes/                   # API routes
│   ├── calculate.js         # HVAC calculation route
│   └── room.js              # Room processing route
├── controllers/             # Request handlers
│   ├── calculateController.js
│   └── roomController.js
├── services/                # Business logic
│   ├── hvacCalculationService.js  # HVAC calculation formulas
│   └── roomProcessingService.js   # Room data processing
├── .env                     # Environment variables (not in git)
├── .env.example            # Example environment file
├── .gitignore
├── package.json
└── README.md
```

## Connecting from React Native App

1. Update the API URL in your React Native app (`src/services/api.js`):
```javascript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:3000/api'  // Use your computer's local IP
  : 'https://your-production-api.com/api';
```

2. Find your local IP address:
   - **macOS/Linux**: Run `ifconfig | grep "inet "` or `ipconfig getifaddr en0`
   - **Windows**: Run `ipconfig` and look for IPv4 Address

3. Make sure your phone and computer are on the same network.

4. Start the backend server:
```bash
npm run dev
```

## Next Steps

The calculation formulas in `services/hvacCalculationService.js` are currently placeholders. Replace them with the actual physics formulas when provided.

Key functions to implement:
- `calculateThermalTimeConstant()` - Calculate building thermal time constant (τ)
- `calculateBreakEvenTime()` - Calculate minimum absence duration for savings
- `calculateOptimalSetbackTemp()` - Calculate optimal setback temperature
- `calculateRecoveryTime()` - Calculate time to reach desired temperature
- `calculateRestartTime()` - Calculate when to restart HVAC
- `calculateEnergySavings()` - Calculate energy and cost savings

## Development

- The server uses `nodemon` for auto-reload during development
- All routes are logged to the console
- Error handling middleware catches and formats errors
- CORS is enabled for all origins (restrict in production)

## Testing

You can test the API using curl or Postman:

```bash
# Health check
curl http://localhost:3000/health

# Calculate HVAC strategy
curl -X POST http://localhost:3000/api/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "formData": {
      "outdoorTemp": 85,
      "desiredTemp": 72,
      "absenceDuration": 8,
      "floorArea": 2000
    }
  }'
```

## License

ISC

