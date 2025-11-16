# API Test Results

## Test Summary

✅ **All Core Tests Passed**

### Test Results

1. **Health Check Endpoint** ✅
   - Status: PASS
   - Endpoint: `GET /health`
   - Response: Server is running correctly

2. **Calculate Endpoint** ✅
   - Status: PASS
   - Endpoint: `POST /api/calculate`
   - Response structure: Valid
   - All required fields present in response

3. **Calculate with Room Data** ✅
   - Status: PASS
   - Endpoint: `POST /api/calculate` (with roomData)
   - Successfully integrates room scan data

4. **Process Room Endpoint** ✅
   - Status: PASS
   - Endpoint: `POST /api/process-room`
   - Correctly processes room scan data
   - Extracts dimensions, surfaces, and openings

### Test Scenarios

All scenarios tested successfully. The API correctly calculates:

- **Thermal Time Constant (τ)**: Building-specific thermal response time
- **Break-Even Time**: Minimum absence duration for setback to be beneficial
- **Recommendation**: SETBACK or MAINTAIN based on physics calculations
- **Energy Savings**: Calculated using ASHRAE-compliant formulas

### Observations

1. **Break-Even Times**: The ASHRAE formulas calculate break-even times based on building physics. For well-insulated buildings, break-even times can be quite long (50-200+ hours), meaning setback is only beneficial for very long absences.

2. **Thermal Time Constants**: The calculated thermal time constants range from ~18 hours (poorly insulated) to ~190 hours (very well-insulated large homes), which is physically accurate.

3. **Recommendations**: The API correctly recommends "MAINTAIN" when absence duration is shorter than break-even time, which is the expected behavior.

### Sample Response

```json
{
  "success": true,
  "data": {
    "action": "MAINTAIN",
    "setbackTemp": 72,
    "desiredTemp": 72,
    "outdoorTemp": 85,
    "restartTime": "5:00 PM",
    "returnTime": "5:00 PM",
    "recoveryTime": 0,
    "thermalTimeConstant": 35.43,
    "breakEvenTime": 88.58,
    "savingsPerDay": 0,
    "savingsPerMonth": 0,
    "savingsPerYear": 0,
    "energySavedKwh": 0,
    "percentSaved": 0
  }
}
```

### Room Processing Response

```json
{
  "success": true,
  "data": {
    "processedDimensions": {
      "width": 25,
      "height": 9,
      "depth": 20,
      "volume": 4500,
      "floorArea": 500
    },
    "surfaceArea": 1810,
    "surfaceBreakdown": {
      "wallArea": 810,
      "floorArea": 500,
      "ceilingArea": 500,
      "totalArea": 1810
    },
    "openingCount": {
      "doors": 1,
      "windows": 2,
      "total": 3
    },
    "windowArea": 40,
    "windowAreaPercent": 4.94,
    "metadata": {
      "surfaceCount": 6,
      "hasCompleteDimensions": true,
      "dataQuality": "excellent"
    }
  }
}
```

## Running Tests

To run the tests:

```bash
# Start the server
npm run dev

# In another terminal, run tests
npm test

# Or run scenario tests
node test-scenarios.js
```

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

### Calculate HVAC Strategy
```bash
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

### Process Room Scan
```bash
curl -X POST http://localhost:3000/api/process-room \
  -H "Content-Type: application/json" \
  -d '{
    "dimensions": {
      "width": 25,
      "height": 9,
      "depth": 20
    },
    "surfaces": [],
    "openings": []
  }'
```

## Notes

- The API uses ASHRAE-compliant physics calculations
- All calculations are based on building thermal properties
- Room scan data is integrated when available
- Validation is working correctly
- Error handling is in place

