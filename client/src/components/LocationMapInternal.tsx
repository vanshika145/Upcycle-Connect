import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// Custom marker icon
const createCustomIcon = (isSelected: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: ${isSelected ? '#10b981' : '#3b82f6'};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-size: 16px;
          font-weight: bold;
        ">📍</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// Component to handle map click and update marker
interface MapClickHandlerProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation: [number, number] | null;
}

const MapClickHandler = ({ onLocationSelect, selectedLocation }: MapClickHandlerProps) => {
  const map = useMap();

  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onLocationSelect(lat, lng);
    },
  });

  useEffect(() => {
    // Center map on selected location if available
    if (selectedLocation) {
      map.setView(selectedLocation, map.getZoom());
    }
  }, [map, selectedLocation]);

  return null;
};

// Component to center map on user location or selected location
interface MapCenterProps {
  center: [number, number] | null;
  zoom?: number;
}

const MapCenter = ({ center, zoom = 15 }: MapCenterProps) => {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);

  return null;
};

interface LocationMapInternalProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
  interactive?: boolean;
}

const LocationMapInternal = ({
  latitude,
  longitude,
  onLocationChange,
  height = '400px',
  interactive = true,
}: LocationMapInternalProps) => {
  // Check if coordinates are valid (not 0,0 and within valid ranges)
  const hasValidLocation = 
    latitude !== 0 && 
    longitude !== 0 && 
    latitude >= -90 && 
    latitude <= 90 && 
    longitude >= -180 && 
    longitude <= 180;
  
  const selectedLocation: [number, number] | null = hasValidLocation
    ? [latitude, longitude]
    : null;

  // Default center (use selected location if valid, otherwise default)
  const defaultCenter: [number, number] = selectedLocation || [18.5204, 73.8567]; // Default to Pune, India

  const handleMapClick = (lat: number, lng: number) => {
    if (interactive) {
      onLocationChange(lat, lng);
    }
  };

  return (
    <div className="w-full rounded-xl overflow-hidden border border-border relative" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={selectedLocation ? 15 : 10}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        className="z-0"
      >
        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Center map on selected location when it changes */}
        {selectedLocation && (
          <MapCenter key={`${latitude}-${longitude}`} center={selectedLocation} zoom={15} />
        )}

        {/* Handle map clicks */}
        {interactive && (
          <MapClickHandler
            onLocationSelect={handleMapClick}
            selectedLocation={selectedLocation}
          />
        )}

        {/* Marker for selected location */}
        {selectedLocation && (
          <Marker
            position={selectedLocation}
            icon={createCustomIcon(true)}
          />
        )}
      </MapContainer>

      {/* Instructions overlay */}
      {interactive && (
        <div className="absolute bottom-4 left-4 right-4 pointer-events-none z-[1000]">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg max-w-xs">
            <p className="text-xs text-muted-foreground">
              {selectedLocation
                ? 'Click on the map to change location'
                : 'Click on the map to select pickup location'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationMapInternal;

