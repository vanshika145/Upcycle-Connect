import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Popup as LeafletPopup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Material } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Package, MapPin } from 'lucide-react';

// Fix for default marker icons in React-Leaflet
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

// Custom marker icon for materials
const createMaterialIcon = (isHovered: boolean = false) => {
  return L.divIcon({
    className: 'custom-material-marker',
    html: `
      <div style="
        width: 36px;
        height: 36px;
        background: ${isHovered ? '#10b981' : '#3b82f6'};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      ">
        <div style="
          color: white;
          font-size: 18px;
        ">📦</div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
};

// Custom marker icon for user location
const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-user-marker',
    html: `
      <div style="
        width: 32px;
        height: 32px;
        background: #10b981;
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

// Component to center map on user location
interface MapCenterProps {
  center: [number, number];
  zoom?: number;
}

const MapCenter = ({ center, zoom = 13 }: MapCenterProps) => {
  const map = useMap();

  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);

  return null;
};

interface MaterialMapInternalProps {
  userLocation: { latitude: number; longitude: number };
  materials: Material[];
  onMaterialClick: (material: Material) => void;
}

const MaterialMapInternal = ({
  userLocation,
  materials,
  onMaterialClick,
}: MaterialMapInternalProps) => {
  const [hoveredMaterialId, setHoveredMaterialId] = useState<string | null>(null);

  const userCenter: [number, number] = [userLocation.latitude, userLocation.longitude];

  // Get material coordinates (MongoDB stores as [lng, lat])
  const getMaterialCoordinates = (material: Material): [number, number] | null => {
    if (!material.location?.coordinates) return null;
    const [lng, lat] = material.location.coordinates;
    return [lat, lng];
  };

  // Format price for display
  const formatPrice = (material: Material): string => {
    const price = material.price ?? 0;
    if (price === 0) return 'Free / Donation';
    
    const priceUnit = material.priceUnit || 'total';
    const unit = priceUnit === 'total' ? '' : 
                 priceUnit === 'per_unit' ? '/unit' :
                 priceUnit === 'per_kg' ? '/kg' :
                 priceUnit === 'per_box' ? '/box' :
                 priceUnit === 'per_set' ? '/set' : '';
    
    return `₹${price.toFixed(2)}${unit}`;
  };

  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden border border-border relative">
      <MapContainer
        center={userCenter}
        zoom={13}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
        className="z-0"
      >
        {/* OpenStreetMap Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Center map on user location */}
        <MapCenter center={userCenter} zoom={13} />

        {/* User location marker */}
        <Marker position={userCenter} icon={createUserIcon()}>
          <Popup>
            <div className="text-center">
              <p className="font-semibold">Your Location</p>
            </div>
          </Popup>
        </Marker>

        {/* Material markers */}
        {materials.map((material) => {
          const coords = getMaterialCoordinates(material);
          if (!coords) return null;

          return (
            <Marker
              key={material.id}
              position={coords}
              icon={createMaterialIcon(hoveredMaterialId === material.id)}
              eventHandlers={{
                mouseover: () => setHoveredMaterialId(material.id),
                mouseout: () => setHoveredMaterialId(null),
              }}
            >
              <Popup>
                <div className="p-2 min-w-[200px]">
                  <div className="flex items-start gap-2 mb-2">
                    <Package className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{material.title}</h3>
                      <p className="text-xs text-muted-foreground mb-2">{material.category}</p>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-primary">
                          {formatPrice(material)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Qty: {material.quantity}
                        </span>
                      </div>
                      <Button
                        variant="hero"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => onMaterialClick(material)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Info overlay */}
      <div className="absolute bottom-4 left-4 right-4 pointer-events-none z-[1000]">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg max-w-xs">
          <p className="text-xs text-muted-foreground">
            {materials.length} {materials.length === 1 ? 'material' : 'materials'} nearby
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaterialMapInternal;

