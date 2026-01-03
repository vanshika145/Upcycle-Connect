import { useEffect, useState, lazy, Suspense } from 'react';
import { MapPin } from 'lucide-react';

// Dynamically import the map component to ensure client-side only rendering
const MapComponent = lazy(() => import('./LocationMapInternal'));

interface LocationMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
  height?: string;
  interactive?: boolean;
}

export const LocationMap = ({
  latitude,
  longitude,
  onLocationChange,
  height = '400px',
  interactive = true,
}: LocationMapProps) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div
        className="w-full rounded-xl bg-muted/50 border border-border flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-center">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div
          className="w-full rounded-xl bg-muted/50 border border-border flex items-center justify-center"
          style={{ height }}
        >
          <div className="text-center">
            <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      }
    >
      <MapComponent
        latitude={latitude}
        longitude={longitude}
        onLocationChange={onLocationChange}
        height={height}
        interactive={interactive}
      />
    </Suspense>
  );
};
