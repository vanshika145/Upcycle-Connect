# Coordinate Extraction Fix

## 🐛 Issue

Materials are correctly stored in MongoDB with location data, but coordinates are not displaying properly on the "Add Material" page.

## 🔍 Root Cause

MongoDB stores location coordinates in **GeoJSON format**: `[longitude, latitude]`

Example from MongoDB:
```javascript
location: {
  type: "Point",
  coordinates: [74.755007, 20.905824]  // [longitude, latitude]
}
```

But the frontend form and display components expect coordinates in the order: `[latitude, longitude]`

## ✅ Fixes Implemented

### 1. Helper Function Added
```typescript
// Helper function to extract latitude and longitude from Material location
const getMaterialCoordinates = (material: Material) => {
  if (!material.location || !material.location.coordinates) {
    return { latitude: 0, longitude: 0 };
  }
  // MongoDB GeoJSON: coordinates[0] = longitude, coordinates[1] = latitude
  const [longitude, latitude] = material.location.coordinates;
  return { latitude, longitude };
};
```

### 2. Location Display in Listings
Added location coordinates display in the "My Listings" section:
```typescript
{material.location && material.location.coordinates && (
  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
    <MapPin className="w-3 h-3" />
    {(() => {
      // MongoDB stores coordinates as [longitude, latitude]
      const [lng, lat] = material.location.coordinates;
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    })()}
  </p>
)}
```

### 3. Debug Logging
Added comprehensive logging to track coordinate extraction:
```typescript
response.materials.forEach((material) => {
  if (material.location && material.location.coordinates) {
    const [lng, lat] = material.location.coordinates;
    console.log(`📍 Material "${material.title}" location:`, {
      raw: material.location.coordinates,
      extracted: { latitude: lat, longitude: lng },
      formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    });
  }
});
```

## 📊 Coordinate Format Reference

### MongoDB Storage (GeoJSON)
```javascript
location: {
  type: "Point",
  coordinates: [longitude, latitude]  // [lng, lat]
}
```

### Frontend Display
```typescript
// Extract correctly:
const [longitude, latitude] = material.location.coordinates;
// Use: latitude, longitude (in that order for display)
```

### LocationMap Component
```typescript
<LocationMap
  latitude={latitude}   // First parameter
  longitude={longitude} // Second parameter
/>
```

## 🔧 Usage Examples

### Extracting Coordinates for Display
```typescript
// ✅ CORRECT
const [lng, lat] = material.location.coordinates;
console.log(`Lat: ${lat}, Lng: ${lng}`);

// ❌ WRONG (swapped)
const [lat, lng] = material.location.coordinates; // This would swap them!
```

### Using in LocationMap
```typescript
// ✅ CORRECT
const [lng, lat] = material.location.coordinates;
<LocationMap latitude={lat} longitude={lng} />

// ❌ WRONG
const [lng, lat] = material.location.coordinates;
<LocationMap latitude={lng} longitude={lat} /> // Swapped!
```

## 🧪 Testing

1. **Create a material** with location
2. **Check MongoDB** - verify coordinates are stored as `[lng, lat]`
3. **View in "My Listings"** - verify coordinates display correctly
4. **Check browser console** - verify logging shows correct extraction
5. **Verify map display** - if viewing on map, verify marker is in correct location

## 📝 Notes

- MongoDB GeoJSON standard: `[longitude, latitude]` (x, y order)
- Most mapping libraries expect: `[latitude, longitude]` (lat, lng order)
- Always extract coordinates in the correct order: `const [lng, lat] = coordinates`
- Use `lat` for latitude and `lng` for longitude in display/mapping

## 🚀 Next Steps (Optional)

If you want to add an "Edit Material" feature:

1. Extract coordinates when loading material for editing:
```typescript
const [lng, lat] = material.location.coordinates;
setFormData({
  ...formData,
  latitude: lat,
  longitude: lng,
});
setManualLatitude(lat.toString());
setManualLongitude(lng.toString());
```

2. Pre-populate the map:
```typescript
<LocationMap
  latitude={lat}
  longitude={lng}
  // ... other props
/>
```

