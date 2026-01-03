import { useEffect, useState, lazy, Suspense } from 'react';
import { MapPin, Package, Loader2 } from 'lucide-react';
import { Material } from '@/lib/api';
import { materialAPI } from '@/lib/api';

// Dynamically import the map component to ensure client-side only rendering
const MapComponent = lazy(() => import('./MaterialMapInternal'));

interface MaterialMapProps {
  userLocation: { latitude: number; longitude: number } | null;
  onMaterialClick: (material: Material) => void;
}

export const MaterialMap = ({ userLocation, onMaterialClick }: MaterialMapProps) => {
  const [isClient, setIsClient] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch nearby materials when user location is available
  useEffect(() => {
    const fetchNearbyMaterials = async () => {
      if (!userLocation || !isClient) return;

      setLoading(true);
      setError(null);

      try {
        const response = await materialAPI.getNearby(
          userLocation.latitude,
          userLocation.longitude,
          50 // 50km radius
        );
        setMaterials(response.materials || []);
      } catch (err: any) {
        console.error('Error fetching nearby materials:', err);
        setError(err.message || 'Failed to load nearby materials');
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyMaterials();
  }, [userLocation, isClient]);

  if (!isClient) {
    return (
      <div className="w-full h-[600px] rounded-xl bg-muted/50 border border-border flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="w-full h-[600px] rounded-xl bg-muted/50 border border-border flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Enable location access to see nearby materials
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-[600px] rounded-xl bg-muted/50 border border-border flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" />
          <p className="text-sm text-muted-foreground">Loading nearby materials...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[600px] rounded-xl bg-muted/50 border border-border flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="w-full h-[600px] rounded-xl bg-muted/50 border border-border flex items-center justify-center">
          <div className="text-center">
            <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      }
    >
      <MapComponent
        userLocation={userLocation}
        materials={materials}
        onMaterialClick={onMaterialClick}
      />
    </Suspense>
  );
};

