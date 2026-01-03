import { useState, useEffect, useCallback } from 'react';
import { Search, Sparkles, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { aiSearchAPI, Material } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { MaterialCard } from './MaterialCard';

interface AISearchBarProps {
  userLocation: { latitude: number; longitude: number } | null;
  onMaterialClick?: (material: Material) => void;
}

export const AISearchBar = ({ userLocation, onMaterialClick }: AISearchBarProps) => {
  const [query, setQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    query: string;
    categories: Array<{ name: string; weight: number; reason: string }>;
    materials: Material[];
    count: number;
    aiAnalysis: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length > 0) {
        setSearchQuery(query.trim());
      } else {
        setResults(null);
        setSearchQuery('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform AI search
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery) {
        setResults(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await aiSearchAPI.search(
          searchQuery,
          userLocation?.latitude,
          userLocation?.longitude,
          50
        );
        setResults(response);
      } catch (err: any) {
        console.error('AI search error:', err);
        setError(err.message || 'Failed to search materials');
        setResults(null);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchQuery, userLocation]);

  return (
    <div className="w-full mb-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Describe your project (e.g., 'IoT project', 'robotics prototype')..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 pr-10 h-12 text-base"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}
        {!loading && query && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}

      {/* AI Recommendations */}
      <AnimatePresence>
        {results && results.materials.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4"
          >
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">
                  AI-Inferred Material Needs: "{results.query}"
                </h3>
              </div>
              {/* Category Distribution with Weights */}
              {results.categories && Array.isArray(results.categories) && results.categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {results.categories.map((cat) => {
                    const catName = typeof cat === 'string' ? cat : cat.name;
                    const catWeight = typeof cat === 'object' && cat.weight ? cat.weight : (1 / results.categories.length);
                    const catReason = typeof cat === 'object' && cat.reason ? cat.reason : '';
                    return (
                      <div
                        key={catName}
                        className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                        title={catReason || catName}
                      >
                        {catName} ({(catWeight * 100).toFixed(0)}%)
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.materials.map((material) => (
                <MaterialCard
                  key={material.id}
                  material={material}
                  userLocation={userLocation}
                  onClick={() => onMaterialClick?.(material)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {results && results.materials.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-4 text-center py-8 text-muted-foreground"
          >
            <p>No materials found for "{results.query}"</p>
            <p className="text-sm mt-2">Try a different search term</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

