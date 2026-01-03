# Leaflet + OpenStreetMap Integration

This document explains how Leaflet and OpenStreetMap are integrated into the UpCycle Connect frontend for location selection and map preview.

## 📦 Dependencies

- **leaflet**: Core Leaflet library for interactive maps
- **react-leaflet**: React bindings for Leaflet
- **@types/leaflet**: TypeScript types for Leaflet

## 🗺️ Components

### LocationMap Component

**Location:** `client/src/components/LocationMap.tsx`

A reusable interactive map component that:
- Displays OpenStreetMap tiles
- Allows users to click on the map to select location
- Shows a marker at the selected location
- Updates coordinates when user clicks
- Centers map on selected location

**Props:**
```typescript
interface LocationMapProps {
  latitude: number;           // Current latitude
  longitude: number;          // Current longitude
  onLocationChange: (lat: number, lng: number) => void;  // Callback when location changes
  height?: string;           // Map height (default: '400px')
  interactive?: boolean;     // Allow map clicks (default: true)
}
```

## 🎯 Usage in Add Material Form

The map is integrated into the Provider Dashboard's "Add Material" form:

1. **Auto-detect Mode:**
   - User clicks "Auto-detect" button
   - Browser geolocation API gets user's location
   - Map centers on user's location
   - Marker shows current location
   - User can click map to change location

2. **Manual Entry Mode:**
   - User enters latitude/longitude manually
   - Map updates to show entered coordinates
   - Marker appears at entered location
   - User can click map to adjust location

3. **Map Interaction:**
   - Click anywhere on map to set location
   - Map centers on clicked location
   - Marker moves to clicked location
   - Coordinates update automatically

## 🔧 Features

### OpenStreetMap Tiles
- Uses OpenStreetMap tile server (free, no API key required)
- Attribution automatically included
- No usage limits

### Interactive Map
- Click to select location
- Drag to pan
- Scroll to zoom
- Marker shows selected location
- Instructions overlay for user guidance

### Location Updates
- Real-time coordinate updates
- Toast notifications on location change
- Form data automatically updated
- Map centers on new location

## 📍 Coordinate Handling

### GeoJSON Format
Coordinates are stored as `[longitude, latitude]` following GeoJSON standard:
- Leaflet uses `[latitude, longitude]` for display
- Backend stores `[longitude, latitude]` in MongoDB
- Conversion handled automatically

### Validation
- Latitude: -90 to 90
- Longitude: -180 to 180
- Invalid coordinates show default location
- Map validates before updating

## 🎨 Styling

### Custom Marker
- Green marker for selected location
- Custom pin icon with rotation
- Shadow for depth
- Responsive sizing

### Map Container
- Rounded corners
- Border styling
- Responsive height
- Proper z-index handling

## 🚀 Integration Flow

```
User opens Add Material form
    ↓
Map loads with default/current location
    ↓
User clicks "Auto-detect" OR enters coordinates manually
    ↓
Map centers on location
    ↓
Marker appears at location
    ↓
User can click map to change location
    ↓
Coordinates update in form
    ↓
Form submission includes coordinates
```

## 🔄 State Management

The map component receives coordinates as props and updates them via callback:

```typescript
<LocationMap
  latitude={formData.latitude}
  longitude={formData.longitude}
  onLocationChange={(lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
  }}
/>
```

## 📱 Responsive Design

- Map adapts to container width
- Height configurable (default 400px)
- Touch-friendly on mobile
- Works on all screen sizes

## 🐛 Troubleshooting

### Map not showing
- Check if Leaflet CSS is imported
- Verify coordinates are valid
- Check browser console for errors

### Marker not appearing
- Verify coordinates are not 0,0
- Check if location is within valid ranges
- Ensure map has loaded

### Map not updating
- Check if coordinates prop changed
- Verify onLocationChange callback
- Check React key for re-rendering

## 📚 Resources

- [Leaflet Documentation](https://leafletjs.com/)
- [React-Leaflet Documentation](https://react-leaflet.js.org/)
- [OpenStreetMap](https://www.openstreetmap.org/)

