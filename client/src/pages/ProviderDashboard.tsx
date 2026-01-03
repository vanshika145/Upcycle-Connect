import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Recycle, Plus, Package, ClipboardList, BarChart3, 
  LogOut, Bell, TrendingUp, Leaf, Upload, MapPin,
  Clock, CheckCircle, XCircle, ChevronRight, Calendar, Users, Loader2
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { materialAPI, Material, CreateMaterialData, requestAPI, MaterialRequest, impactAPI, analyticsAPI } from "@/lib/api";
import { toast } from "sonner";
import { LocationMap } from "@/components/LocationMap";
import NotificationBell from "@/components/NotificationBell";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const navItems = [
  { icon: Plus, label: "Add Material", id: "add" },
  { icon: Package, label: "My Listings", id: "listings" },
  { icon: ClipboardList, label: "Requests", id: "requests" },
  { icon: BarChart3, label: "Analytics", id: "analytics" },
];

const categories = ["Chemicals", "Glassware", "Electronics", "Metals", "Plastics", "Other"];

// Impact Summary Header Component
const ImpactSummaryHeader = () => {
  const { user } = useAuth();
  const [impactData, setImpactData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImpact = async () => {
      try {
        const data = await impactAPI.getProviderSummary();
        setImpactData(data);
      } catch (error: any) {
        console.error("Error fetching impact data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      fetchImpact();
    }
  }, [user]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
    >
      {[
        { 
          icon: TrendingUp, 
          label: "Waste Diverted", 
          value: loading ? 0 : Math.round(impactData?.totalWasteDiverted || 0), 
          suffix: " kg", 
          color: "text-eco-green" 
        },
        { 
          icon: Leaf, 
          label: "CO₂ Saved", 
          value: loading ? 0 : Math.round(impactData?.totalCO2Saved || 0), 
          suffix: " kg", 
          color: "text-eco-teal" 
        },
        { 
          icon: Users, 
          label: "People Helped", 
          value: loading ? 0 : (impactData?.peopleHelped || 0), 
          suffix: "", 
          color: "text-eco-blue" 
        },
      ].map((stat) => (
        <div
          key={stat.label}
          className="glass-card rounded-2xl p-6 flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <stat.icon className={`w-6 h-6 ${stat.color}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="font-display font-bold text-2xl">
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : (
                <AnimatedCounter end={stat.value} suffix={stat.suffix} duration={1.5} />
              )}
            </p>
          </div>
        </div>
      ))}
    </motion.div>
  );
};

const ProviderDashboard = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState("listings");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Add Material Form State
  const [formData, setFormData] = useState<CreateMaterialData>({
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
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [providerMonthly, setProviderMonthly] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Get user's initial from name
  const getUserInitial = () => {
    if (!user?.name) return "U";
    return user.name.charAt(0).toUpperCase();
  };

  // Helper function to extract latitude and longitude from Material location
  // MongoDB stores coordinates as [longitude, latitude] (GeoJSON format)
  const getMaterialCoordinates = (material: Material) => {
    if (!material.location || !material.location.coordinates) {
      return { latitude: 0, longitude: 0 };
    }
    // MongoDB GeoJSON: coordinates[0] = longitude, coordinates[1] = latitude
    const [longitude, latitude] = material.location.coordinates;
    return { latitude, longitude };
  };

  // Helper function to format time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  // Fetch materials on component mount and when activeTab changes
  useEffect(() => {
    if (activeTab === "listings" && user) {
      fetchMaterials();
    }
  }, [activeTab, user]);

  // Fetch requests when requests tab is active
  useEffect(() => {
    if (activeTab === "requests" && user) {
      fetchRequests();
    } else if (activeTab === "analytics" && user && user.id) {
      fetchProviderMonthlyData();
    }
  }, [activeTab, user]);

  // Fetch provider-specific monthly analytics
  const fetchProviderMonthlyData = async () => {
    if (!user?.id) return;
    
    try {
      setAnalyticsLoading(true);
      const data = await analyticsAPI.getProviderMonthly(user.id);
      setProviderMonthly(data);
      console.log('✅ Fetched provider monthly data:', data);
    } catch (error: any) {
      console.error("Error fetching provider monthly data:", error);
      toast.error(error.message || "Failed to fetch analytics data");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Listen for real-time request notifications via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleRequestSent = () => {
      console.log('📩 New request received via Socket.IO');
      // Refresh requests if we're on the requests tab
      if (activeTab === "requests") {
        fetchRequests();
      }
      // Show a badge or indicator that there's a new request
    };

    // Listen for material reuse events (when order is received)
    const handleMaterialReused = () => {
      console.log('♻️ Material reused notification received');
      // Refresh analytics data when material is reused
      if (activeTab === "analytics" && user?.id) {
        fetchProviderMonthlyData();
      }
    };

    socket.on('requestSent', handleRequestSent);
    socket.on('materialReused', handleMaterialReused);

    return () => {
      socket.off('requestSent', handleRequestSent);
      socket.off('materialReused', handleMaterialReused);
    };
  }, [socket, activeTab, user]);

  // Get user location on mount (auto mode)
  useEffect(() => {
    if (locationMode === "auto" && navigator.geolocation) {
      // Add timeout and options for better accuracy
      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 10000, // 10 seconds
        maximumAge: 0, // Don't use cached position
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Validate coordinates are not 0,0 and within valid ranges
          if (
            lat === 0 && lng === 0 ||
            lat < -90 || lat > 90 ||
            lng < -180 || lng > 180 ||
            isNaN(lat) || isNaN(lng)
          ) {
            console.error('❌ Invalid geolocation coordinates:', { lat, lng });
            setLocationDetected(false);
            toast.error("Invalid location detected. Please enter location manually.");
            return;
          }

          console.log('✅ Geolocation success:', { lat, lng, accuracy: position.coords.accuracy });
          
          setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));
          setLocationDetected(true);
        },
        (error) => {
          console.error("❌ Geolocation error:", error.code, error.message);
          setLocationDetected(false);
          setFormData(prev => ({
            ...prev,
            latitude: 0,
            longitude: 0,
          }));
          toast.error("Auto-location detection failed. Please enter location manually.");
        },
        geoOptions
      );
    } else if (locationMode === "auto") {
      // Reset if geolocation is not available
      setLocationDetected(false);
      setFormData(prev => ({
        ...prev,
        latitude: 0,
        longitude: 0,
      }));
    }
  }, [locationMode]);

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

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await materialAPI.getMyMaterials();
      
      // Log materials with location data for debugging
      response.materials.forEach((material) => {
        if (material.location && material.location.coordinates) {
          const [lng, lat] = material.location.coordinates;
          console.log(`📍 Material "${material.title}" location:`, {
            raw: material.location.coordinates,
            extracted: { latitude: lat, longitude: lng },
            formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
          });
        } else {
          console.warn(`⚠️ Material "${material.title}" has no location data`);
        }
      });
      
      setMaterials(response.materials);
    } catch (error: any) {
      console.error("Error fetching materials:", error);
      toast.error(error.message || "Failed to fetch materials");
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      setRequestsLoading(true);
      const response = await requestAPI.getProviderRequests();
      setRequests(response.requests);
      console.log(`✅ Fetched ${response.requests.length} requests for provider`);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast.error(error.message || "Failed to fetch requests");
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await requestAPI.updateStatus(requestId, 'approved');
      toast.success("Request approved successfully!");
      // Refresh requests list
      fetchRequests();
      // Refresh materials to update status
      fetchMaterials();
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast.error(error.message || "Failed to approve request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await requestAPI.updateStatus(requestId, 'rejected');
      toast.success("Request rejected");
      // Refresh requests list
      fetchRequests();
      // Refresh materials to update status
      fetchMaterials();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error(error.message || "Failed to reject request");
    }
  };

  const handleDispatchOrder = async (requestId: string) => {
    try {
      await requestAPI.dispatchOrder(requestId);
      toast.success("Order dispatched successfully!");
      // Refresh requests list
      fetchRequests();
    } catch (error: any) {
      console.error("Error dispatching order:", error);
      toast.error(error.message || "Failed to dispatch order");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !selectedCategory || !formData.quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate location
    let finalLatitude = formData.latitude;
    let finalLongitude = formData.longitude;

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
      
      if (lat < -90 || lat > 90) {
        toast.error("Latitude must be between -90 and 90");
        return;
      }
      
      if (lng < -180 || lng > 180) {
        toast.error("Longitude must be between -180 and 180");
        return;
      }
      
      finalLatitude = lat;
      finalLongitude = lng;
    } else {
      // Auto mode: Validate coordinates are valid and detected
      if (!locationDetected) {
        toast.error("Location not detected. Please switch to manual entry or enable location access");
        return;
      }
      
      // Explicitly check for 0,0 coordinates (invalid)
      if (finalLatitude === 0 && finalLongitude === 0) {
        toast.error("Invalid location coordinates (0,0). Please use manual entry or wait for location detection.");
        return;
      }
      
      // Validate coordinate ranges
      if (finalLatitude < -90 || finalLatitude > 90 || finalLongitude < -180 || finalLongitude > 180) {
        toast.error("Invalid coordinate ranges. Please use manual entry.");
        return;
      }
      
      // Validate coordinates are numbers
      if (isNaN(finalLatitude) || isNaN(finalLongitude)) {
        toast.error("Invalid coordinate values. Please use manual entry.");
        return;
      }
      
      console.log('✅ Auto-detected coordinates validated:', { lat: finalLatitude, lng: finalLongitude });
    }

    try {
      setSubmitting(true);
      const data: CreateMaterialData = {
        ...formData,
        category: selectedCategory,
        latitude: finalLatitude,
        longitude: finalLongitude,
        images: selectedImages.length > 0 ? selectedImages : undefined,
      };
      
      await materialAPI.create(data);
      toast.success("Material added successfully!");
      
      // Reset form
      setFormData({
        title: "",
        category: "",
        description: "",
        quantity: "",
        images: [],
        latitude: locationMode === "auto" ? formData.latitude : 0,
        longitude: locationMode === "auto" ? formData.longitude : 0,
      });
      setSelectedCategory("");
      setManualLatitude("");
      setManualLongitude("");
      setSelectedImages([]);
      setImagePreview([]);
      
      // Switch to listings tab and refresh
      setActiveTab("listings");
      fetchMaterials();
    } catch (error: any) {
      console.error("Error creating material:", error);
      
      // Handle compliance errors specifically
      if (error.message && error.message.includes('violates safety and compliance')) {
        toast.error("Compliance Error", {
          description: error.message || "This material violates safety and compliance guidelines. Please contact support if you believe this is an error.",
          duration: 8000,
        });
      } else {
        toast.error(error.message || "Failed to add material");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    // Validate file count
    if (selectedImages.length + fileArray.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    const previews: string[] = [];

    fileArray.forEach((file) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        return;
      }

      // Check file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB`);
        return;
      }

      validFiles.push(file);
      
      // Create preview
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

  // Remove image
  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
    setImagePreview(imagePreview.filter((_, i) => i !== index));
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-card border-r border-border flex flex-col transition-all duration-300`}
      >
        {/* Logo */}
        <Link to="/" className="p-4 flex items-center gap-3 border-b border-border">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
            <Recycle className="w-5 h-5 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-display font-bold text-lg">UpCycle</span>
          )}
        </Link>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id
                  ? "gradient-primary text-white shadow-glow"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </motion.button>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold">
              {getUserInitial()}
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.role === "provider" ? user.organization || "Provider" : user.college || "Seeker"}
                </p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-3 text-muted-foreground"
              onClick={logout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          )}
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6 relative z-10">
          <div className="flex items-center gap-4">
            <h1 className="font-display font-semibold text-xl">
              {navItems.find((item) => item.id === activeTab)?.label || "Dashboard"}
            </h1>
          </div>
          <div className="flex items-center gap-4 relative z-[100]">
            <NotificationBell userId={user?.id} />
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto relative z-0">
          {/* Impact Summary Header - Always visible, outside AnimatePresence */}
          <ImpactSummaryHeader />

          {/* Tab Content - Wrapped in AnimatePresence with mode="wait" */}
          <AnimatePresence mode="wait">
            {activeTab === "add" && (
              <motion.div
                key="add"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto"
              >
                <div className="glass-card rounded-3xl p-8">
                  <h2 className="font-display font-bold text-2xl mb-6">Add New Material</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="title">Material Name *</Label>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="px-2 py-0.5 rounded-full bg-eco-green/10 text-eco-green border border-eco-green/20">
                            Compliance Safe Listing
                          </span>
                        </div>
                      </div>
                      <Input 
                        id="title"
                        placeholder="e.g., Laboratory Glass Beakers" 
                        className="h-12"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        required
                        disabled={submitting}
                      />
                      <p className="text-xs text-muted-foreground">
                        All materials are checked against safety and compliance guidelines before listing.
                      </p>
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
                      <Label htmlFor="description">Description</Label>
                      <Input 
                        id="description"
                        placeholder="Optional description..." 
                        className="h-12"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        disabled={submitting}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity *</Label>
                      <Input 
                        id="quantity"
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
                        <Label htmlFor="price">Price (₹) *</Label>
                        <Input 
                          id="price"
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
                        <Label htmlFor="priceUnit">Price Unit *</Label>
                        <select
                          id="priceUnit"
                          className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                      <Label>Images (Max 5, 5MB each)</Label>
                      <div className="relative">
                        <input
                          type="file"
                          id="image-upload"
                          multiple
                          accept="image/*"
                          onChange={handleImageChange}
                          disabled={submitting || selectedImages.length >= 5}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">
                            Drag and drop images, or{" "}
                            <span className="text-primary font-medium">browse</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {selectedImages.length}/5 images selected
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
                            onClick={() => {
                              setLocationMode("auto");
                              if (navigator.geolocation) {
                                const geoOptions = {
                                  enableHighAccuracy: true,
                                  timeout: 10000,
                                  maximumAge: 0,
                                };
                                
                                navigator.geolocation.getCurrentPosition(
                                  (position) => {
                                    const lat = position.coords.latitude;
                                    const lng = position.coords.longitude;
                                    
                                    // Validate coordinates
                                    if (
                                      lat === 0 && lng === 0 ||
                                      lat < -90 || lat > 90 ||
                                      lng < -180 || lng > 180 ||
                                      isNaN(lat) || isNaN(lng)
                                    ) {
                                      console.error('❌ Invalid geolocation coordinates:', { lat, lng });
                                      setLocationDetected(false);
                                      toast.error("Invalid location detected. Please use manual entry.");
                                      return;
                                    }
                                    
                                    console.log('✅ Manual geolocation trigger success:', { lat, lng, accuracy: position.coords.accuracy });
                                    
                                    setFormData(prev => ({
                                      ...prev,
                                      latitude: lat,
                                      longitude: lng,
                                    }));
                                    setLocationDetected(true);
                                    toast.success(`Location detected: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                                  },
                                  (error) => {
                                    console.error("❌ Geolocation error:", error.code, error.message);
                                    setLocationDetected(false);
                                    setFormData(prev => ({
                                      ...prev,
                                      latitude: 0,
                                      longitude: 0,
                                    }));
                                    toast.error("Auto-detection failed. Please use manual entry.");
                                  },
                                  geoOptions
                                );
                              } else {
                                toast.error("Geolocation not supported. Please use manual entry.");
                              }
                            }}
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
                        <>
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
                          {!locationDetected && (
                            <p className="text-xs text-muted-foreground">
                              Location not detected. Click "Manual Entry" to enter coordinates manually.
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                              <Input
                                id="latitude"
                                type="number"
                                step="any"
                                placeholder="e.g., 40.7128"
                                value={manualLatitude}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setManualLatitude(value);
                                  // Update map in real-time if valid
                                  const lat = parseFloat(value);
                                  const lng = parseFloat(manualLongitude);
                                  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                                    setFormData(prev => ({
                                      ...prev,
                                      latitude: lat,
                                      longitude: lng,
                                    }));
                                  }
                                }}
                                disabled={submitting}
                                className="h-12"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                              <Input
                                id="longitude"
                                type="number"
                                step="any"
                                placeholder="e.g., -74.0060"
                                value={manualLongitude}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setManualLongitude(value);
                                  // Update map in real-time if valid
                                  const lat = parseFloat(manualLatitude);
                                  const lng = parseFloat(value);
                                  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                                    setFormData(prev => ({
                                      ...prev,
                                      latitude: lat,
                                      longitude: lng,
                                    }));
                                  }
                                }}
                                disabled={submitting}
                                className="h-12"
                              />
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/50 border border-border">
                            <p className="text-xs text-muted-foreground mb-1">
                              <strong>How to set location:</strong>
                            </p>
                            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                              <li><strong>Click on the map below</strong> to select location visually</li>
                              <li>Or enter coordinates manually (from Google Maps, latlong.net, etc.)</li>
                              <li>Coordinates will update automatically when you click the map</li>
                            </ul>
                          </div>
                        </div>
                      )}

                      <LocationMap
                        latitude={
                          locationMode === "auto" 
                            ? (formData.latitude || 0)
                            : (manualLatitude ? parseFloat(manualLatitude) : 0)
                        }
                        longitude={
                          locationMode === "auto"
                            ? (formData.longitude || 0)
                            : (manualLongitude ? parseFloat(manualLongitude) : 0)
                        }
                        onLocationChange={(lat, lng) => {
                          if (locationMode === "auto") {
                            setFormData(prev => ({
                              ...prev,
                              latitude: lat,
                              longitude: lng,
                            }));
                            setLocationDetected(true);
                            toast.success(`Location set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                          } else {
                            setManualLatitude(lat.toString());
                            setManualLongitude(lng.toString());
                            toast.success(`Location set: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
                          }
                        }}
                        height="400px"
                        interactive={true}
                      />
                    </div>

                    <Button 
                      variant="hero" 
                      size="lg" 
                      className="w-full"
                      type="submit"
                      disabled={submitting || !selectedCategory}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        "Add Material"
                      )}
                    </Button>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === "listings" && (
              <motion.div
                key="listings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No materials listed yet</p>
                    <Button onClick={() => setActiveTab("add")} variant="hero">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Material
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {materials.map((material, index) => (
                      <motion.div
                        key={material.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -2 }}
                        className="glass-card rounded-2xl p-6 flex items-center gap-6 cursor-pointer group"
                      >
                        <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-2xl">
                          {material.images && material.images.length > 0 ? (
                            <img 
                              src={typeof material.images[0] === 'string' ? material.images[0] : material.images[0].url} 
                              alt={material.title}
                              className="w-full h-full object-cover rounded-xl"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                            {material.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">{material.category}</p>
                          {material.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {material.description}
                            </p>
                          )}
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
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          material.status === "available" 
                            ? "bg-eco-green/10 text-eco-green" 
                            : material.status === "requested"
                            ? "bg-yellow-500/10 text-yellow-600"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {material.status}
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-lg">{material.quantity}</p>
                          <p className="text-xs text-muted-foreground">quantity</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "requests" && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {requestsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No requests yet</p>
                    <p className="text-xs text-muted-foreground">
                      Requests from seekers will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request, index) => {
                      const timeAgo = getTimeAgo(new Date(request.createdAt));
                      
                      return (
                        <motion.div
                          key={request.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="glass-card rounded-2xl p-6"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{request.material?.title || "Material"}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Requested by <span className="text-foreground font-medium">
                                  {request.seeker?.name || "Seeker"}
                                </span>
                                {request.seeker?.college && (
                                  <span className="text-muted-foreground"> • {request.seeker.college}</span>
                                )}
                              </p>
                              {request.message && (
                                <p className="text-sm text-muted-foreground mt-2 italic">
                                  "{request.message}"
                                </p>
                              )}
                              <div className="mt-2 space-y-1">
                                <p className="text-sm">
                                  <span className="text-muted-foreground">Quantity Requested:</span>{" "}
                                  <span className="font-medium">{request.quantity}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {timeAgo} • Category: {request.material?.category}
                                </p>
                                {/* Order Status */}
                                {request.orderStatus && request.orderStatus !== "pending" && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="text-xs text-muted-foreground">Order Status:</span>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                      request.orderStatus === "paid" ? "bg-blue-500/10 text-blue-600" :
                                      request.orderStatus === "dispatched" ? "bg-purple-500/10 text-purple-600" :
                                      request.orderStatus === "received" ? "bg-eco-green/10 text-eco-green" :
                                      "bg-muted text-muted-foreground"
                                    }`}>
                                      {request.orderStatus.charAt(0).toUpperCase() + request.orderStatus.slice(1)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-4">
                              {request.status === "pending" ? (
                                <div className="flex gap-2">
                                  <Button 
                                    variant="hero" 
                                    size="sm"
                                    onClick={() => handleApproveRequest(request.id)}
                                  >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleRejectRequest(request.id)}
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              ) : request.orderStatus === "paid" ? (
                                <Button 
                                  variant="hero" 
                                  size="sm"
                                  onClick={() => handleDispatchOrder(request.id)}
                                >
                                  <Package className="w-4 h-4 mr-1" />
                                  Dispatch Order
                                </Button>
                              ) : request.orderStatus === "dispatched" ? (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600">
                                  Dispatched
                                </span>
                              ) : request.orderStatus === "received" ? (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-eco-green/10 text-eco-green">
                                  Order Received
                                </span>
                              ) : request.status === "approved" ? (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600">
                                  Waiting for Payment
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                  Rejected
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid gap-6"
              >
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : providerMonthly.length > 0 ? (
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="font-semibold mb-4">Month-wise Reused Materials</h3>
                    <div className="h-64">
                      <Bar
                        data={{
                          labels: providerMonthly.map((item) => {
                            // Convert month number to month name
                            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                            return `${monthNames[item.month - 1]} ${item.year}`;
                          }),
                          datasets: [
                            {
                              label: 'Materials Reused',
                              data: providerMonthly.map((item) => item.materialsCount),
                              backgroundColor: 'hsl(var(--primary))',
                              borderRadius: 8,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: false,
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => {
                                  const item = providerMonthly[context.dataIndex];
                                  return [
                                    `Materials: ${item.materialsCount}`,
                                    `Quantity: ${item.totalQuantity.toFixed(1)} kg`,
                                  ];
                                },
                              },
                            },
                          },
                          scales: {
                            y: {
                              beginAtZero: true,
                              ticks: {
                                stepSize: 1,
                                callback: (value) => `${value} materials`,
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="glass-card rounded-2xl p-6 flex items-center justify-center min-h-[300px]">
                    <div className="text-center">
                      <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No analytics data available yet</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Analytics will appear once materials are reused
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Action Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setActiveTab("add")}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full gradient-primary shadow-glow-lg flex items-center justify-center text-white"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
};

export default ProviderDashboard;
