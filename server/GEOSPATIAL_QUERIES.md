# Geospatial Queries & Location-Based Material Discovery

This document explains how location-based material discovery works in UpCycle Connect using MongoDB geospatial queries and Leaflet/OpenStreetMap.

## 🌍 Location Data Format

### GeoJSON Point Format

All materials store location data in MongoDB using the GeoJSON Point format:

```javascript
location: {
  type: {
    type: String,
    enum: ["Point"],
    default: "Point"
  },
  coordinates: [longitude, latitude]  // ⚠️ IMPORTANT: [lng, lat] order
}
```

**Critical:** Coordinates must be stored as `[longitude, latitude]` (not `[latitude, longitude]`). This follows the GeoJSON standard.

### Database Index

The Material model includes a 2dsphere index for efficient geospatial queries:

```javascript
materialSchema.index({ location: '2dsphere' });
```

This index enables fast location-based searches using MongoDB's `$near` operator.

## 📡 Nearby Materials API

### Endpoint

```
GET /api/materials/nearby
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lat` | number | Yes | - | Latitude of search center |
| `lng` | number | Yes | - | Longitude of search center |
| `radius` | number | No | 10 | Search radius in kilometers (0-1000) |
| `category` | string | No | - | Filter by category (optional) |

### Request Example

```bash
GET /api/materials/nearby?lat=40.7128&lng=-74.0060&radius=5&category=Glassware
```

### Response Format

```json
{
  "materials": [
    {
      "id": "507f1f77bcf86cd799439011",
      "title": "Laboratory Glass Beakers",
      "category": "Glassware",
      "description": "Set of 10 beakers",
      "quantity": "10 pieces",
      "images": [
        {
          "url": "https://res.cloudinary.com/.../image.jpg",
          "publicId": "upcycle-connect/materials/abc123"
        }
      ],
      "providerId": "507f191e810c19729de860ea",
      "provider": {
        "name": "MIT Chemistry Lab",
        "email": "lab@mit.edu",
        "organization": "MIT"
      },
      "location": {
        "type": "Point",
        "coordinates": [-74.0060, 40.7128]
      },
      "distance": 2.3,
      "status": "available",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "searchLocation": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "radius": 5
  }
}
```

### Response Fields

- **materials**: Array of material objects
- **distance**: Distance from search location in kilometers (calculated using Haversine formula)
- **count**: Total number of materials found
- **searchLocation**: The search parameters used

## 🔍 Query Logic

### MongoDB Geospatial Query

The endpoint uses MongoDB's `$near` operator with GeoJSON:

```javascript
{
  status: 'available',
  location: {
    $near: {
      $geometry: {
        type: 'Point',
        coordinates: [longitude, latitude]  // [lng, lat]
      },
      $maxDistance: radius * 1000  // Convert km to meters
    }
  }
}
```

### Filtering

1. **Status Filter**: Only returns materials with `status: 'available'`
2. **Category Filter**: Optional category filter if provided
3. **Distance Filter**: Only materials within the specified radius
4. **Result Limit**: Maximum 100 results to prevent excessive data

## ✅ Validation

### Coordinate Validation

- **Latitude**: Must be between -90 and 90
- **Longitude**: Must be between -180 and 180
- **Radius**: Must be between 0 and 1000 kilometers

### Error Responses

**Missing Coordinates:**
```json
{
  "message": "Latitude (lat) and longitude (lng) are required"
}
```

**Invalid Latitude:**
```json
{
  "message": "Invalid latitude. Must be between -90 and 90"
}
```

**Invalid Longitude:**
```json
{
  "message": "Invalid longitude. Must be between -180 and 180"
}
```

**Invalid Radius:**
```json
{
  "message": "Invalid radius. Must be between 0 and 1000 kilometers"
}
```

## 🗺️ Frontend Integration (Leaflet)

### How Leaflet Sends Coordinates

When using Leaflet with OpenStreetMap, coordinates are captured as:

```javascript
// Leaflet map click event
map.on('click', (e) => {
  const lat = e.latlng.lat;  // Latitude
  const lng = e.latlng.lng;  // Longitude
  
  // Send to backend
  fetch(`/api/materials/nearby?lat=${lat}&lng=${lng}&radius=10`)
});
```

### User Location Detection

```javascript
// Get user's current location
navigator.geolocation.getCurrentPosition((position) => {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  
  // Search nearby materials
  fetch(`/api/materials/nearby?lat=${lat}&lng=${lng}&radius=10`);
});
```

## 📊 Use Cases

### 1. Browse Materials Near User

```javascript
// Get user location and find nearby materials
navigator.geolocation.getCurrentPosition(async (position) => {
  const lat = position.coords.latitude;
  const lng = position.coords.longitude;
  
  const response = await fetch(
    `/api/materials/nearby?lat=${lat}&lng=${lng}&radius=10`
  );
  const data = await response.json();
  // Display materials on map
});
```

### 2. Map View with Animated Pins

```javascript
// Fetch nearby materials and display on Leaflet map
const materials = await getNearbyMaterials(lat, lng, radius);

materials.forEach((material) => {
  const marker = L.marker([
    material.location.coordinates[1],  // lat
    material.location.coordinates[0]   // lng
  ]).addTo(map);
  
  marker.bindPopup(`
    <b>${material.title}</b><br>
    ${material.category}<br>
    ${material.distance}km away
  `);
});
```

### 3. Auto-Matching Seekers with Nearby Providers

```javascript
// When seeker searches, find nearby available materials
const searchMaterials = async (userLat, userLng, category) => {
  const params = new URLSearchParams({
    lat: userLat,
    lng: userLng,
    radius: 25,  // 25km radius
  });
  
  if (category) {
    params.append('category', category);
  }
  
  const response = await fetch(`/api/materials/nearby?${params}`);
  return response.json();
};
```

## 🔧 Distance Calculation

The API calculates distance using the Haversine formula:

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

Distance is returned in kilometers, rounded to 1 decimal place.

## 📝 Material Creation Flow

### Frontend (Leaflet)

1. User clicks on map or uses current location
2. Leaflet provides `lat` and `lng`
3. Frontend sends to backend:

```javascript
const formData = new FormData();
formData.append('title', 'Lab Glass Beakers');
formData.append('category', 'Glassware');
formData.append('latitude', lat);  // From Leaflet
formData.append('longitude', lng); // From Leaflet
// ... other fields
```

### Backend Processing

1. Receives `latitude` and `longitude` from request
2. Converts to GeoJSON format: `[longitude, latitude]`
3. Stores in MongoDB:

```javascript
location: {
  type: 'Point',
  coordinates: [longitude, latitude]  // [lng, lat]
}
```

## 🚀 Performance Considerations

### Index Usage

The 2dsphere index ensures fast geospatial queries:
- Queries are optimized by MongoDB
- Results are sorted by distance automatically
- Index supports efficient range queries

### Query Optimization

- Results limited to 100 materials
- Only available materials are queried
- Provider information is populated efficiently
- Results sorted by creation date (newest first)

### Best Practices

1. **Use appropriate radius**: Start with 10km, increase if needed
2. **Filter by category**: Reduces result set size
3. **Cache results**: Consider caching for frequently searched locations
4. **Limit results**: Already limited to 100, adjust if needed

## 🧪 Testing

### Test Nearby Search

```bash
# Search within 10km of New York City
curl "http://localhost:5000/api/materials/nearby?lat=40.7128&lng=-74.0060&radius=10"

# Search with category filter
curl "http://localhost:5000/api/materials/nearby?lat=40.7128&lng=-74.0060&radius=5&category=Glassware"

# Test validation
curl "http://localhost:5000/api/materials/nearby?lat=91&lng=-74.0060"
# Should return: Invalid latitude error
```

### Expected Results

- Empty array if no materials found
- Sorted by distance (closest first)
- Includes distance in response
- Provider information populated

## 📚 Related Documentation

- [MongoDB Geospatial Queries](https://docs.mongodb.com/manual/geospatial-queries/)
- [GeoJSON Specification](https://geojson.org/)
- [Leaflet Documentation](https://leafletjs.com/)

