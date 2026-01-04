import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Upload, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Material, materialAPI, CreateMaterialData } from "@/lib/api";
import { toast } from "sonner";
import { LocationMap } from "@/components/LocationMap";

interface EditMaterialModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const categories = ["Chemicals", "Glassware", "Electronics", "Metals", "Plastics", "Bio Materials", "Other"];

export const EditMaterialModal = ({ material, isOpen, onClose, onSuccess }: EditMaterialModalProps) => {
  const [formData, setFormData] = useState<Partial<CreateMaterialData>>({
    title: "",
    category: "",
    description: "",
    quantity: "",
    price: 0,
    priceUnit: "per_unit",
    images: [],
    latitude: 0,
    longitude: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [locationMode, setLocationMode] = useState<"auto" | "manual">("auto");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [locationDetected, setLocationDetected] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreview, setImagePreview] = useState<string[]>([]);

  // Initialize form with material data when modal opens
  useEffect(() => {
    if (material && isOpen) {
      const [lng, lat] = material.location?.coordinates || [0, 0];
      setFormData({
        title: material.title,
        category: material.category,
        description: material.description || "",
        quantity: material.quantity,
        price: material.price || 0,
        priceUnit: material.priceUnit || "per_unit",
        images: [],
        latitude: lat,
        longitude: lng,
      });
      setSelectedCategory(material.category);
      setManualLatitude(lat.toString());
      setManualLongitude(lng.toString());
      setLocationDetected(true);
      
      // Set existing images as preview
      if (material.images && material.images.length > 0) {
        const existingPreviews = material.images.map((img) => 
          typeof img === 'string' ? img : img.url
        );
        setImagePreview(existingPreviews);
      }
    }
  }, [material, isOpen]);

  // Get user location on mount (auto mode)
  useEffect(() => {
    if (locationMode === "auto" && navigator.geolocation && isOpen) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (
            lat === 0 && lng === 0 ||
            lat < -90 || lat > 90 ||
            lng < -180 || lng > 180 ||
            isNaN(lat) || isNaN(lng)
          ) {
            setLocationDetected(false);
            return;
          }

          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));
          setLocationDetected(true);
        },
        () => {
          setLocationDetected(false);
        }
      );
    }
  }, [locationMode, isOpen]);

  // Update formData when manual coordinates change
  useEffect(() => {
    if (locationMode === "manual" && manualLatitude && manualLongitude) {
      const lat = parseFloat(manualLatitude);
      const lng = parseFloat(manualLongitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng,
        }));
      }
    }
  }, [locationMode, manualLatitude, manualLongitude]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    if (selectedImages.length + fileArray.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    const validFiles: File[] = [];
    const previews: string[] = [];

    fileArray.forEach((file) => {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB`);
        return;
      }

      validFiles.push(file);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          previews.push(e.target.result as string);
          if (previews.length === validFiles.length) {
            setImagePreview([...imagePreview, ...previews]);
          }
        }
      };
      reader.readAsDataURL(file);
    });

    setSelectedImages([...selectedImages, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setImagePreview(imagePreview.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!material) return;
    
    if (!formData.title || !selectedCategory || !formData.quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    let finalLatitude = formData.latitude || 0;
    let finalLongitude = formData.longitude || 0;

    if (locationMode === "manual") {
      const lat = parseFloat(manualLatitude);
      const lng = parseFloat(manualLongitude);
      
      if (!manualLatitude || !manualLongitude) {
        toast.error("Please enter both latitude and longitude");
        return;
      }
      
      if (isNaN(lat) || isNaN(lng)) {
        toast.error("Please enter valid numeric coordinates");
        return;
      }
      
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast.error("Invalid coordinate ranges");
        return;
      }
      
      finalLatitude = lat;
      finalLongitude = lng;
    } else {
      if (!locationDetected || finalLatitude === 0 && finalLongitude === 0) {
        toast.error("Location not detected. Please switch to manual entry");
        return;
      }
    }

    try {
      setSubmitting(true);
      const data: Partial<CreateMaterialData> = {
        ...formData,
        category: selectedCategory,
        latitude: finalLatitude,
        longitude: finalLongitude,
        images: selectedImages.length > 0 ? selectedImages : undefined,
      };
      
      await materialAPI.update(material.id, data);
      toast.success("Material updated successfully!");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating material:", error);
      toast.error(error.message || "Failed to update material");
    } finally {
      setSubmitting(false);
    }
  };

  if (!material) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="glass-card rounded-2xl p-6 w-full max-w-2xl relative my-8">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <h2 className="font-display font-bold text-2xl mb-6">Edit Material</h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Material Name *</Label>
                  <Input 
                    id="edit-title"
                    placeholder="e.g., Laboratory Glass Beakers" 
                    className="h-12"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-xl border text-sm transition-all ${
                          selectedCategory === cat
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-primary hover:bg-primary/5"
                        }`}
                        disabled={submitting}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input 
                    id="edit-description"
                    placeholder="Optional description..." 
                    className="h-12"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={submitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-quantity">Quantity *</Label>
                  <Input 
                    id="edit-quantity"
                    placeholder="e.g., 10 kg, 5 pieces" 
                    className="h-12"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-price">Price (₹) *</Label>
                    <Input 
                      id="edit-price"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00" 
                      className="h-12"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      required
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-priceUnit">Price Unit *</Label>
                    <select
                      id="edit-priceUnit"
                      className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formData.priceUnit}
                      onChange={(e) => setFormData({ ...formData, priceUnit: e.target.value as any })}
                      required
                      disabled={submitting}
                    >
                      <option value="per_unit">Per Unit</option>
                      <option value="per_kg">Per Kg</option>
                      <option value="per_box">Per Box</option>
                      <option value="per_set">Per Set</option>
                      <option value="total">Total</option>
                    </select>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="space-y-2">
                  <Label>Add More Images (Max 5 total, 5MB each)</Label>
                  <div className="relative">
                    <input
                      type="file"
                      id="edit-image-upload"
                      multiple
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={submitting || imagePreview.length >= 5}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Drag and drop images, or{" "}
                        <span className="text-primary font-medium">browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {imagePreview.length}/5 images
                      </p>
                    </div>
                  </div>
                  
                  {/* Image Previews */}
                  {imagePreview.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {imagePreview.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border border-border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute top-1 right-1 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            disabled={submitting}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Pickup Location *</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={locationMode === "auto" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLocationMode("auto")}
                        disabled={submitting}
                      >
                        Auto-detect
                      </Button>
                      <Button
                        type="button"
                        variant={locationMode === "manual" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLocationMode("manual")}
                        disabled={submitting}
                      >
                        Manual Entry
                      </Button>
                    </div>
                  </div>

                  {locationMode === "auto" ? (
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input 
                        placeholder={
                          locationDetected && formData.latitude && formData.longitude
                            ? `Location: ${formData.latitude.toFixed(4)}, ${formData.longitude.toFixed(4)}`
                            : "Auto-detecting location..."
                        } 
                        className="pl-10 h-12"
                        disabled
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="edit-latitude" className="text-xs">Latitude</Label>
                        <Input
                          id="edit-latitude"
                          type="number"
                          step="any"
                          placeholder="e.g., 40.7128"
                          value={manualLatitude}
                          onChange={(e) => setManualLatitude(e.target.value)}
                          disabled={submitting}
                          className="h-12"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="edit-longitude" className="text-xs">Longitude</Label>
                        <Input
                          id="edit-longitude"
                          type="number"
                          step="any"
                          placeholder="e.g., -74.0060"
                          value={manualLongitude}
                          onChange={(e) => setManualLongitude(e.target.value)}
                          disabled={submitting}
                          className="h-12"
                        />
                      </div>
                    </div>
                  )}

                  <LocationMap
                    latitude={locationMode === "auto" ? (formData.latitude || 0) : (manualLatitude ? parseFloat(manualLatitude) : 0)}
                    longitude={locationMode === "auto" ? (formData.longitude || 0) : (manualLongitude ? parseFloat(manualLongitude) : 0)}
                    onLocationChange={(lat, lng) => {
                      if (locationMode === "auto") {
                        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                        setLocationDetected(true);
                      } else {
                        setManualLatitude(lat.toString());
                        setManualLongitude(lng.toString());
                      }
                    }}
                    height="300px"
                    interactive={true}
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="flex-1"
                    onClick={onClose}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="hero" 
                    className="flex-1"
                    type="submit"
                    disabled={submitting || !selectedCategory}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Material"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

