import { motion } from 'framer-motion';
import { Package, MapPin, Star } from 'lucide-react';
import { Material } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface MaterialCardProps {
  material: Material;
  userLocation: { latitude: number; longitude: number } | null;
  onClick?: () => void;
}

export const MaterialCard = ({ material, userLocation, onClick }: MaterialCardProps) => {
  const hasImages = material.images && material.images.length > 0;
  const isAvailable = material.status === 'available';

  // Format price
  const formatPrice = () => {
    const price = material.price ?? 0;
    if (price === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full bg-eco-green/10 text-eco-green text-xs font-medium">
          Free / Donation
        </span>
      );
    }

    const priceUnit = material.priceUnit || 'total';
    const unit = priceUnit === 'total' ? '' :
                 priceUnit === 'per_unit' ? '/unit' :
                 priceUnit === 'per_kg' ? '/kg' :
                 priceUnit === 'per_box' ? '/box' :
                 priceUnit === 'per_set' ? '/set' : '';

    return (
      <span className="font-semibold text-primary">
        ₹{price.toFixed(2)}{unit}
      </span>
    );
  };

  // Calculate distance if available
  const getDistance = () => {
    if (material.distance !== undefined) {
      return `${material.distance.toFixed(1)} km`;
    }
    if (userLocation && material.location?.coordinates) {
      const [lng, lat] = material.location.coordinates;
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        lat,
        lng
      );
      return `${distance.toFixed(1)} km`;
    }
    return null;
  };

  // Haversine formula for distance calculation
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const distance = getDistance();
  const providerRating = material.provider?.averageRating || 0;
  const totalReviews = material.provider?.totalReviews || 0;
  const isTrustedProvider = providerRating >= 4;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="glass-card rounded-2xl overflow-hidden group cursor-pointer"
      onClick={onClick}
    >
      {/* Image */}
      <div className="relative h-40 bg-muted flex items-center justify-center overflow-hidden">
        {hasImages ? (
          <img
            src={material.images[0].url}
            alt={material.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="w-16 h-16 text-muted-foreground" />
        )}
        {!isAvailable && (
          <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-muted text-sm font-medium">
              Currently Unavailable
            </span>
          </div>
        )}
        {isTrustedProvider && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 rounded-full bg-primary/90 text-white text-xs font-medium flex items-center gap-1">
              <Star className="w-3 h-3 fill-white" />
              Trusted Provider
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            {material.category}
          </span>
          {providerRating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xs font-medium">{providerRating.toFixed(1)}</span>
              {totalReviews > 0 && (
                <span className="text-xs text-muted-foreground">({totalReviews})</span>
              )}
            </div>
          )}
        </div>

        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
          {material.title}
        </h3>

        {material.provider && (
          <p className="text-sm text-muted-foreground mb-2">
            {material.provider.organization || material.provider.name}
          </p>
        )}

        {material.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {material.description}
          </p>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Price:</span>
            {formatPrice()}
          </div>
          <span className="text-xs text-muted-foreground">
            Qty: {material.quantity}
          </span>
        </div>

        <div className="flex items-center justify-between">
          {distance && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{distance}</span>
            </div>
          )}
          <Button
            variant="hero"
            size="sm"
            disabled={!isAvailable}
            onClick={(e) => {
              e.stopPropagation();
              onClick?.();
            }}
          >
            View Details
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

