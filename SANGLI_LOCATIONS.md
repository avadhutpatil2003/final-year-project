# 📍 Sangli Area Test Locations

## Updated Test Data

### Sangli Route (8 Points)

| # | Location | Latitude | Longitude | Time |
|---|----------|----------|-----------|------|
| 1 | Sangli City | 16.8524 | 74.5815 | 1 hour ago |
| 2 | Miraj Road | 16.8600 | 74.5900 | 50 min ago |
| 3 | Vishrambag | 16.8700 | 74.6000 | 40 min ago |
| 4 | Market Yard | 16.8800 | 74.6100 | 30 min ago |
| 5 | MIDC Area | 16.8900 | 74.6200 | 20 min ago |
| 6 | Industrial Area | 16.9000 | 74.6300 | 10 min ago |
| 7 | Outskirts | 16.9100 | 74.6400 | 5 min ago |
| 8 | Near Sangli | 16.9200 | 74.6500 | Now |

## Map Display

### Center Point:
- **Sangli City**: 16.8524° N, 74.5815° E
- **Zoom Level**: Auto-adjusts to fit all 8 points

### Route Coverage:
- Starts from Sangli City center
- Moves through main areas
- Covers approximately 8-10 km radius
- Shows typical supervisor movement pattern

## How to Use

### Step 1: Clear Old Data (Optional)
If you have old Mumbai data in Firebase:
1. Go to Firebase Console
2. Navigate to: `supervisors/[email]/location/[today's date]/points`
3. Delete all documents
4. Or wait for new data to overwrite

### Step 2: Add New Sangli Data
1. Dashboard वर जा
2. Supervisor select करा
3. "Add Test Data" button click करा
4. 8 Sangli locations add होतील

### Step 3: Verify on Map
Map वर दिसायला हवे:
- ✅ 8 markers in Sangli area
- ✅ Numbered 1-8
- ✅ Blue path connecting them
- ✅ Centered on Sangli region

## Sangli District Info

### Major Areas Covered:
- **Sangli City** - Main city center
- **Miraj** - Twin city
- **Vishrambag** - Commercial area
- **Market Yard** - Agricultural market
- **MIDC** - Industrial zone

### Coordinates Reference:
```
Sangli City Center: 16.8524, 74.5815
Miraj: 16.7833, 74.6500
Islampur: 16.8333, 74.2000
Tasgaon: 17.0333, 74.6000
```

## Firebase Structure

```
supervisors/
  [supervisor-email]/
    location/
      2025-11-17/  (today's date)
        points/
          [auto-id-1]/
            latitude: 16.8524
            longitude: 74.5815
            address: "Sangli City, Maharashtra"
            timestamp: [1 hour ago]
          [auto-id-2]/
            latitude: 16.8600
            longitude: 74.5900
            address: "Miraj Road, Sangli"
            timestamp: [50 min ago]
          ... (8 total)
```

## Verification

### Check Firebase:
1. Open Firebase Console
2. Go to Firestore Database
3. Navigate to path above
4. Should see 8 documents with Sangli coordinates

### Check Map:
1. Map should center on Sangli
2. All 8 markers visible
3. Path line connects them
4. Click markers to see Sangli addresses

## Real Supervisor Tracking

### For Actual Field Work:
When supervisor's mobile app sends real location:
```javascript
{
  latitude: [GPS from mobile],
  longitude: [GPS from mobile],
  timestamp: [current time],
  address: [actual location in Sangli]
}
```

### Expected Pattern:
- Morning: Start from office/home
- Day: Visit multiple sites in Sangli
- Evening: Return to base
- All points automatically plotted on map

## Other Maharashtra Cities

### If you need different locations:

**Kolhapur** (nearby):
```javascript
latitude: 16.7050
longitude: 74.2433
```

**Satara**:
```javascript
latitude: 17.6805
longitude: 74.0183
```

**Pune**:
```javascript
latitude: 18.5204
longitude: 73.8567
```

## Troubleshooting

### Old Mumbai data still showing?
- Clear browser cache
- Delete old Firebase data
- Add new Sangli data
- Refresh page

### Map not centering on Sangli?
- Map auto-zooms to fit all points
- If only 1-2 points, may need manual zoom
- Check if all 8 points added successfully

### Wrong coordinates?
- Verify Firebase data
- Check latitude/longitude values
- Sangli should be around 16.85°N, 74.58°E

---

**Test data आता Sangli area साठी updated आहे!** 🎯

Dashboard वर "Add Test Data" click करा आणि Sangli locations पहा!
