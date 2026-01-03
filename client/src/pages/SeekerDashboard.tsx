import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Recycle, Search, Package, Map, ClipboardList, BarChart3, 
  LogOut, Filter, MapPin, Heart, ArrowRight, Check, Clock,
  ChevronRight, Sliders, Star, Loader2, CreditCard
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { materialAPI, Material, requestAPI, impactAPI, analyticsAPI } from "@/lib/api";
import { toast } from "sonner";
import { RequestModal } from "@/components/RequestModal";
import { PaymentModal } from "@/components/PaymentModal";
import NotificationBell from "@/components/NotificationBell";
import { AISearchBar } from "@/components/AISearchBar";
import { ReviewModal } from "@/components/ReviewModal";
import { MaterialMap } from "@/components/MaterialMap";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const navItems = [
  { icon: Search, label: "Browse", id: "browse" },
  { icon: Map, label: "Map View", id: "map" },
  { icon: ClipboardList, label: "My Requests", id: "requests" },
  { icon: BarChart3, label: "My Impact", id: "impact" },
];

const categories = ["All", "Chemicals", "Glassware", "Electronics", "Metals", "Plastics", "Bio Materials", "Other"];

const SeekerDashboard = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const { socket } = useSocket();
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRequestForPayment, setSelectedRequestForPayment] = useState<any | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [impactData, setImpactData] = useState<any>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [categoryBreakdown, setCategoryBreakdown] = useState<any[]>([]);
  const [co2Monthly, setCo2Monthly] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showTrustedOnly, setShowTrustedOnly] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedExchangeForReview, setSelectedExchangeForReview] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Get user's initial from name
  const getUserInitial = () => {
    if (!user?.name) return "U";
    return user.name.charAt(0).toUpperCase();
  };

  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation && user) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn("Geolocation error:", error);
          // Use user's stored location from MongoDB if available
          if (user.location && user.location.coordinates) {
            const [lng, lat] = user.location.coordinates;
            setUserLocation({ latitude: lat, longitude: lng });
          }
        }
      );
    } else if (user?.location?.coordinates) {
      // Fallback to user's stored location
      const [lng, lat] = user.location.coordinates;
      setUserLocation({ latitude: lat, longitude: lng });
    }
  }, [user]);

  const fetchMaterials = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use getNearby if location is available, otherwise getAvailable
      let response;
      if (userLocation && userLocation.latitude !== 0 && userLocation.longitude !== 0) {
        response = await materialAPI.getNearby(
          userLocation.latitude,
          userLocation.longitude,
          10, // 10km radius
          selectedCategory === "All" ? undefined : selectedCategory
        );
        console.log(`✅ Fetched ${response.materials.length} nearby materials for seeker`);
      } else {
        response = await materialAPI.getAvailable(
          selectedCategory === "All" ? undefined : selectedCategory,
          userLocation?.latitude,
          userLocation?.longitude
        );
        console.log(`✅ Fetched ${response.materials.length} available materials for seeker`);
      }

      setMaterials(response.materials);
    } catch (error: any) {
      console.error("Error fetching materials:", error);
      toast.error(error.message || "Failed to fetch materials");
      setMaterials([]); // Clear materials on error
    } finally {
      setLoading(false);
    }
  }, [userLocation, selectedCategory]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await requestAPI.getSeekerRequests();
      setRequests(response.requests);
      console.log(`✅ Fetched ${response.requests.length} requests for seeker`);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      toast.error(error.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch impact data
  const fetchImpactData = useCallback(async () => {
    setImpactLoading(true);
    try {
      const data = await impactAPI.getSeekerSummary();
      setImpactData(data);
      console.log('✅ Fetched impact data:', data);
    } catch (error: any) {
      console.error("Error fetching impact data:", error);
      toast.error(error.message || "Failed to fetch impact data");
    } finally {
      setImpactLoading(false);
    }
  }, []);

  // Fetch analytics data for charts
  const fetchAnalyticsData = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      // Fetch category breakdown
      const categoryData = await analyticsAPI.getCategoryBreakdown();
      setCategoryBreakdown(categoryData);
      
      // Fetch CO₂ monthly data
      const co2Data = await analyticsAPI.getCO2Monthly();
      setCo2Monthly(co2Data);
      
      console.log('✅ Fetched analytics data:', { categoryData, co2Data });
    } catch (error: any) {
      console.error("Error fetching analytics data:", error);
      toast.error(error.message || "Failed to fetch analytics data");
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  // Fetch materials when location is available or category changes
  useEffect(() => {
    if (activeTab === "browse") {
      if (userLocation) {
        fetchMaterials();
      } else if (user?.location?.coordinates) {
        // Use stored location if geolocation not available
        const [lng, lat] = user.location.coordinates;
        setUserLocation({ latitude: lat, longitude: lng });
      } else {
        // If no location, fetch all available materials
        fetchMaterials();
      }
    }
  }, [activeTab, selectedCategory, userLocation, fetchMaterials, user]);

  // Fetch requests when requests tab is active
  useEffect(() => {
    if (activeTab === "requests" && user) {
      fetchRequests();
    } else if (activeTab === "impact" && user) {
      fetchImpactData();
      fetchAnalyticsData();
    }
  }, [activeTab, user, fetchRequests, fetchImpactData, fetchAnalyticsData]);

  // Listen for real-time request status updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleRequestApproved = () => {
      console.log('✅ Request approved notification received');
      // Refresh requests if we're on the requests tab
      if (activeTab === "requests") {
        fetchRequests();
      }
      // Refresh materials to update availability
      if (activeTab === "browse" && userLocation) {
        fetchMaterials();
      }
      // Refresh impact and analytics data when request is approved (material reused)
      if (activeTab === "impact") {
        fetchImpactData();
        fetchAnalyticsData();
      }
    };

    const handleRequestRejected = () => {
      console.log('❌ Request rejected notification received');
      // Refresh requests if we're on the requests tab
      if (activeTab === "requests") {
        fetchRequests();
      }
      // Refresh materials to update availability
      if (activeTab === "browse" && userLocation) {
        fetchMaterials();
      }
    };

    // Listen for material reuse events (when order is received)
    const handleMaterialReused = () => {
      console.log('♻️ Material reused notification received');
      // Refresh impact and analytics data
      if (activeTab === "impact") {
        fetchImpactData();
        fetchAnalyticsData();
      }
    };

    socket.on('requestApproved', handleRequestApproved);
    socket.on('requestRejected', handleRequestRejected);
    socket.on('materialReused', handleMaterialReused);

    return () => {
      socket.off('requestApproved', handleRequestApproved);
      socket.off('requestRejected', handleRequestRejected);
      socket.off('materialReused', handleMaterialReused);
    };
  }, [socket, activeTab, fetchRequests, fetchMaterials, userLocation, fetchImpactData, fetchAnalyticsData]);

  const handleRequestClick = (material: Material) => {
    setSelectedMaterial(material);
    setIsRequestModalOpen(true);
  };

  const handleRequestSubmit = async (quantity: string, message: string) => {
    if (!selectedMaterial) return;
    
    try {
      await requestAPI.create({
        materialId: selectedMaterial.id,
        quantity,
        message,
      });
      toast.success("Request sent successfully!");
      // Refresh materials to update status
      if (userLocation) {
        fetchMaterials();
      }
      // Refresh requests
      if (activeTab === "requests") {
        fetchRequests();
      }
    } catch (error: any) {
      console.error("Error sending request:", error);
      toast.error(error.message || "Failed to send request");
      throw error;
    }
  };

  const handlePaymentClick = (request: any) => {
    setSelectedRequestForPayment(request);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentComplete = async (paymentId: string) => {
    if (!selectedRequestForPayment) return;
    
    try {
      // Payment is already verified in PaymentModal via verifyPayment API
      // Just refresh the requests and materials
      toast.success("Payment completed successfully!");
      // Refresh requests
      fetchRequests();
      // Refresh materials
      if (activeTab === "browse" && userLocation) {
        fetchMaterials();
      }
    } catch (error: any) {
      console.error("Error completing payment:", error);
      toast.error(error.message || "Failed to complete payment");
      throw error;
    }
  };

  const handleReceiveOrder = async (requestId: string) => {
    try {
      await requestAPI.receiveOrder(requestId);
      // Find the request to show review modal
      const request = requests.find((r) => r.id === requestId);
      if (request) {
        setSelectedExchangeForReview(request);
        setReviewModalOpen(true);
      }
      toast.success("Order marked as received!");
      fetchRequests();
    } catch (error: any) {
      console.error("Error marking order as received:", error);
      toast.error(error.message || "Failed to mark order as received");
    }
  };

  const handleDownloadInvoice = async (requestId: string) => {
    try {
      const blob = await requestAPI.getInvoice(requestId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${requestId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Invoice downloaded!");
    } catch (error: any) {
      console.error("Error downloading invoice:", error);
      toast.error(error.message || "Failed to download invoice");
    }
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
            <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center text-white font-bold">
              {getUserInitial()}
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="font-medium text-sm">{user.name}</p>
                <p className="text-xs text-muted-foreground">
                  {user.role === "seeker" ? user.college || "Seeker" : user.organization || "Provider"}
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
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-6">
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
        <main className="flex-1 p-6 overflow-auto">
          <AnimatePresence mode="wait">
            {activeTab === "browse" && (
              <motion.div
                key="browse"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Search Bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      placeholder="Search materials by name, category, or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-12 text-base"
                    />
                  </div>
                </div>

                {/* AI Search Bar */}
                <AISearchBar
                  userLocation={userLocation}
                  onMaterialClick={(material) => {
                    setSelectedMaterial(material);
                    setIsRequestModalOpen(true);
                  }}
                />

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-6 mt-6">
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          // Materials will refresh automatically via useEffect
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                          selectedCategory === cat
                            ? "gradient-primary text-white"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setShowTrustedOnly(!showTrustedOnly)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                        showTrustedOnly
                          ? "gradient-primary text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <Star className="w-4 h-4" />
                      Highly Rated (4+)
                    </button>
                    <Button variant="outline" size="sm">
                      <Sliders className="w-4 h-4 mr-2" />
                      Filters
                    </Button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-sm">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span>Within 5 km</span>
                    </div>
                  </div>
                </div>

                {/* Materials Grid */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : materials.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No materials available</p>
                    {!userLocation && (
                      <p className="text-xs text-muted-foreground">
                        Enable location access to see nearby materials
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {materials
                      .filter((material) => {
                        // Filter by search query
                        if (searchQuery.trim()) {
                          const query = searchQuery.toLowerCase();
                          const matchesTitle = material.title?.toLowerCase().includes(query);
                          const matchesCategory = material.category?.toLowerCase().includes(query);
                          const matchesDescription = material.description?.toLowerCase().includes(query);
                          if (!matchesTitle && !matchesCategory && !matchesDescription) {
                            return false;
                          }
                        }
                        // Filter by trusted providers if enabled
                        if (showTrustedOnly) {
                          const rating = material.provider?.averageRating || 0;
                          return rating >= 4;
                        }
                        return true;
                      })
                      .map((material, index) => {
                      // Use distance from API if available (from getNearby), otherwise calculate
                      const [materialLng, materialLat] = material.location?.coordinates || [0, 0];
                      const distance = material.distance !== undefined
                        ? material.distance
                        : (userLocation && materialLat && materialLng
                          ? calculateDistance(
                              userLocation.latitude,
                              userLocation.longitude,
                              materialLat,
                              materialLng
                            )
                          : null);
                      
                      const isAvailable = material.status === "available";
                      const hasImages = material.images && material.images.length > 0;

                      return (
                        <motion.div
                          key={material.id}
                          id={`material-${material.id}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          whileHover={{ y: -4 }}
                          className="glass-card rounded-2xl overflow-hidden group cursor-pointer"
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
                            <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Heart className="w-5 h-5 text-muted-foreground hover:text-destructive transition-colors" />
                            </button>
                            {!isAvailable && (
                              <div className="absolute inset-0 bg-foreground/50 flex items-center justify-center">
                                <span className="px-3 py-1 rounded-full bg-muted text-sm font-medium">
                                  Currently Unavailable
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
                            </div>
                            
                            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                              {material.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-1">
                              {material.provider?.name || material.provider?.organization || "Provider"}
                            </p>
                            {material.description && (
                              <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                {material.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Price:</span>
                                {(() => {
                                  // Get price from API response (directly from DB)
                                  const materialPrice = material.price ?? 0;
                                  const priceUnit = material.priceUnit || 'total';
                                  
                                  // Ensure price is a valid number
                                  const validPrice = typeof materialPrice === 'number' && !isNaN(materialPrice) && materialPrice >= 0 
                                    ? materialPrice 
                                    : 0;
                                  
                                  if (validPrice === 0) {
                                    return (
                                      <span className="px-2 py-0.5 rounded-full bg-eco-green/10 text-eco-green text-xs font-medium">
                                        Free / Donation
                                      </span>
                                    );
                                  }
                                  
                                  return (
                                    <>
                                      <span className="font-semibold text-primary">
                                        ₹{validPrice.toFixed(2)}
                                      </span>
                                      {priceUnit !== 'total' && (
                                        <span className="text-xs text-muted-foreground">
                                          /{priceUnit === 'per_unit' ? 'unit' :
                                           priceUnit === 'per_kg' ? 'kg' :
                                           priceUnit === 'per_box' ? 'box' :
                                           priceUnit === 'per_set' ? 'set' : ''}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Qty: {material.quantity}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4" />
                                <span>
                                  {distance !== null 
                                    ? `${distance.toFixed(1)} km`
                                    : "Location unknown"}
                                </span>
                              </div>
                              <Button 
                                variant="hero" 
                                size="sm" 
                                disabled={!isAvailable}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRequestClick(material);
                                }}
                              >
                                Request
                                <ArrowRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "map" && (
              <motion.div
                key="map"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-[calc(100vh-8rem)] rounded-3xl overflow-hidden"
              >
                <MaterialMap
                  userLocation={userLocation}
                  onMaterialClick={(material) => {
                    // Switch to browse tab and scroll to material
                    setActiveTab("browse");
                    setSelectedCategory("All");
                    // Scroll to material after a brief delay to allow tab switch
                    setTimeout(() => {
                      const materialElement = document.getElementById(`material-${material.id}`);
                      if (materialElement) {
                        materialElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // Highlight the material
                        materialElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
                        setTimeout(() => {
                          materialElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
                        }, 3000);
                      }
                    }, 300);
                  }}
                />
              </motion.div>
            )}

            {/* Old map view code removed - keeping for reference */}
            {false && (
              <motion.div
                key="map-old"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-[calc(100vh-8rem)] rounded-3xl overflow-hidden border border-border"
              >
                <div className="relative w-full h-full bg-muted/50">
                  {/* Grid Pattern */}
                  <div 
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                        linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                      `,
                      backgroundSize: '40px 40px'
                    }}
                  />
                  
                  {/* User Location */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="absolute"
                    style={{ left: "50%", top: "50%" }}
                  >
                    <div className="absolute inset-0 w-10 h-10 -ml-5 -mt-5 rounded-full bg-accent/30 animate-ping" />
                    <div className="w-10 h-10 -ml-5 -mt-5 rounded-full bg-accent border-4 border-white shadow-lg flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-white" />
                    </div>
                  </motion.div>

                  {/* Map Legend */}
                  <div className="absolute bottom-4 left-4 glass-card rounded-xl p-4">
                    <p className="text-sm font-medium mb-2">Map View</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <div className="w-3 h-3 rounded-full gradient-primary" />
                      <span>Available Materials</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "requests" && (
              <motion.div
                key="requests"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardList className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground mb-4">No requests yet</p>
                    <Button onClick={() => setActiveTab("browse")} variant="hero">
                      Browse Materials
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request, index) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-card rounded-2xl p-6"
                    >
                      {/* Order Status Timeline */}
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        {[
                          { label: "Requested", status: "pending" },
                          { label: "Approved", status: "approved" },
                          { label: "Paid", status: "paid" },
                          { label: "Dispatched", status: "dispatched" },
                          { label: "Received", status: "received" },
                        ].map((step, i) => {
                          const currentStatus = request.orderStatus || request.status;
                          const isActive = 
                            currentStatus === step.status ||
                            (step.status === "approved" && request.status === "approved") ||
                            (step.status === "pending" && request.status === "pending");
                          const isCompleted = 
                            (step.status === "paid" && ["paid", "dispatched", "received"].includes(currentStatus)) ||
                            (step.status === "dispatched" && ["dispatched", "received"].includes(currentStatus)) ||
                            (step.status === "received" && currentStatus === "received");
                          
                          return (
                            <div key={step.label} className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isActive || isCompleted ? "gradient-primary text-white" : "bg-muted text-muted-foreground"
                              }`}>
                                {(isActive || isCompleted) ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              </div>
                              <span className={`text-xs ${isActive || isCompleted ? "font-medium" : "text-muted-foreground"}`}>
                                {step.label}
                              </span>
                              {i < 4 && (
                                <div className={`w-4 h-0.5 ${isCompleted ? "bg-primary" : "bg-muted"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{request.material?.title || "Material"}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            from {request.provider?.name || request.provider?.organization || "Provider"}
                          </p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm">
                              <span className="text-muted-foreground">Quantity:</span>{" "}
                              <span className="font-medium">{request.quantity}</span>
                            </p>
                            {request.message && (
                              <p className="text-xs text-muted-foreground italic">"{request.message}"</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          {/* Payment Button */}
                          {request.status === "approved" && request.orderStatus === "approved" && (
                            <Button
                              variant="hero"
                              size="sm"
                              onClick={() => handlePaymentClick(request)}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Pay Now
                            </Button>
                          )}
                          
                          {/* Download Invoice Button */}
                          {request.orderStatus === "dispatched" && request.invoiceNumber && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoice(request.id)}
                            >
                              Download Invoice
                            </Button>
                          )}
                          
                          {/* Receive Order Button */}
                          {request.orderStatus === "dispatched" && (
                            <Button
                              variant="hero"
                              size="sm"
                              onClick={() => handleReceiveOrder(request.id)}
                            >
                              Mark as Received
                            </Button>
                          )}
                          
                          {/* Status Badge */}
                          {request.orderStatus === "received" && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-eco-green/10 text-eco-green">
                              Order Received
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === "impact" && (
              <motion.div
                key="impact"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid gap-6"
              >
                {impactLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { 
                          label: "Materials Reused", 
                          value: impactData?.totalMaterialsReused || 0, 
                          suffix: "", 
                          color: "text-eco-green" 
                        },
                        { 
                          label: "CO₂ Saved", 
                          value: Math.round(impactData?.totalCO2Saved || 0), 
                          suffix: " kg", 
                          color: "text-eco-teal" 
                        },
                        { 
                          label: "Money Saved", 
                          value: Math.round(impactData?.totalMoneySaved || 0), 
                          prefix: "₹", 
                          suffix: "", 
                          color: "text-eco-blue" 
                        },
                      ].map((stat) => (
                        <div key={stat.label} className="glass-card rounded-2xl p-6 text-center">
                          <p className={`font-display font-bold text-4xl ${stat.color}`}>
                            <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Category Breakdown */}
                    {impactData?.categoryWiseBreakdown && impactData.categoryWiseBreakdown.length > 0 && (
                      <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-semibold text-lg mb-4">Category-wise Impact</h3>
                        <div className="space-y-4">
                          {impactData.categoryWiseBreakdown.map((cat: any, index: number) => (
                            <div key={cat.category} className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{cat.category}</p>
                                <p className="text-sm text-muted-foreground">
                                  {cat.materialsReused} materials • {cat.quantityReused.toFixed(1)} kg reused
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-eco-teal">{cat.co2Saved.toFixed(1)} kg CO₂</p>
                                <p className="text-sm text-eco-blue">₹{cat.moneySaved.toFixed(0)} saved</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Category Distribution Chart */}
                    {impactData?.categoryDistribution && impactData.categoryDistribution.length > 0 && (
                      <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-semibold text-lg mb-4">Waste Distribution by Category</h3>
                        <div className="space-y-3">
                          {impactData.categoryDistribution.map((cat: any, index: number) => (
                            <div key={cat.category}>
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-medium">{cat.category}</span>
                                <span className="text-sm text-muted-foreground">{cat.percentage.toFixed(1)}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full transition-all duration-500"
                                  style={{ width: `${cat.percentage}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Charts - Dynamic from MongoDB */}
                {analyticsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Waste Reused by Category - Progress Bars */}
                    {categoryBreakdown.length > 0 ? (
                      <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-semibold mb-4">Waste Reused by Category</h3>
                        <div className="space-y-4">
                          {(() => {
                            // Calculate total for percentage calculation
                            const total = categoryBreakdown.reduce((sum, cat) => sum + cat.total, 0);
                            return categoryBreakdown.map((cat) => {
                              const percentage = total > 0 ? (cat.total / total) * 100 : 0;
                              return (
                                <div key={cat.category}>
                                  <div className="flex justify-between text-sm mb-1">
                                    <span>{cat.category}</span>
                                    <span className="text-muted-foreground">
                                      {cat.total.toFixed(1)} kg ({percentage.toFixed(1)}%)
                                    </span>
                                  </div>
                                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 1, delay: 0.2 }}
                                      className="h-full gradient-primary rounded-full"
                                    />
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card rounded-2xl p-6 flex items-center justify-center min-h-[200px]">
                        <p className="text-muted-foreground">No category data available</p>
                      </div>
                    )}

                    {/* Category Distribution - Doughnut Chart */}
                    {categoryBreakdown.length > 0 ? (
                      <div className="glass-card rounded-2xl p-6">
                        <h3 className="font-semibold mb-4">Category Distribution</h3>
                        <div className="flex items-center justify-center">
                          <div className="w-full max-w-md">
                            <Doughnut
                              data={{
                                labels: categoryBreakdown.map((cat) => cat.category),
                                datasets: [
                                  {
                                    label: 'Waste Reused (kg)',
                                    data: categoryBreakdown.map((cat) => cat.total),
                                    backgroundColor: [
                                      'hsl(var(--eco-green))',
                                      'hsl(var(--eco-teal))',
                                      'hsl(var(--eco-blue))',
                                      'hsl(var(--accent))',
                                      'hsl(var(--primary))',
                                      'hsl(var(--secondary))',
                                      'hsl(var(--muted))',
                                    ],
                                    borderWidth: 0,
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: true,
                                plugins: {
                                  legend: {
                                    position: 'bottom',
                                    labels: {
                                      padding: 15,
                                      usePointStyle: true,
                                    },
                                  },
                                  tooltip: {
                                    callbacks: {
                                      label: (context) => {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        const total = categoryBreakdown.reduce((sum, cat) => sum + cat.total, 0);
                                        const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                        return `${label}: ${value.toFixed(1)} kg (${percentage}%)`;
                                      },
                                    },
                                  },
                                },
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card rounded-2xl p-6 flex items-center justify-center min-h-[200px]">
                        <p className="text-muted-foreground">No distribution data available</p>
                      </div>
                    )}

                    {/* CO₂ Reduction Over Time - Bar Chart */}
                    {co2Monthly.length > 0 ? (
                      <div className="glass-card rounded-2xl p-6 md:col-span-2">
                        <h3 className="font-semibold mb-4">CO₂ Reduction Over Time</h3>
                        <div className="h-64">
                          <Bar
                            data={{
                              labels: co2Monthly.map((item) => {
                                // Convert month number to month name
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                return `${monthNames[item.month - 1]} ${item.year}`;
                              }),
                              datasets: [
                                {
                                  label: 'CO₂ Saved (kg)',
                                  data: co2Monthly.map((item) => item.co2),
                                  backgroundColor: 'hsl(var(--eco-teal))',
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
                                      return `CO₂ Saved: ${context.parsed.y.toFixed(2)} kg`;
                                    },
                                  },
                                },
                              },
                              scales: {
                                y: {
                                  beginAtZero: true,
                                  ticks: {
                                    callback: (value) => `${value} kg`,
                                  },
                                },
                              },
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="glass-card rounded-2xl p-6 flex items-center justify-center min-h-[200px] md:col-span-2">
                        <p className="text-muted-foreground">No CO₂ data available</p>
                      </div>
                    )}
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
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full gradient-primary shadow-glow-lg flex items-center justify-center text-white"
      >
        <ClipboardList className="w-6 h-6" />
      </motion.button>

      {/* Request Modal */}
      <RequestModal
        material={selectedMaterial}
        isOpen={isRequestModalOpen}
        onClose={() => {
          setIsRequestModalOpen(false);
          setSelectedMaterial(null);
        }}
        onSubmit={handleRequestSubmit}
      />

      {/* Payment Modal */}
      <PaymentModal
        request={selectedRequestForPayment}
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedRequestForPayment(null);
        }}
        onPaymentComplete={handlePaymentComplete}
      />

      {/* Review Modal */}
      {reviewModalOpen && selectedExchangeForReview && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={() => {
            setReviewModalOpen(false);
            setSelectedExchangeForReview(null);
          }}
          exchangeId={selectedExchangeForReview.id}
          providerName={selectedExchangeForReview.provider?.name || selectedExchangeForReview.provider?.organization || "Provider"}
          materialTitle={selectedExchangeForReview.material?.title || "Material"}
          onReviewSubmitted={() => {
            fetchRequests();
          }}
        />
      )}
    </div>
  );
};

export default SeekerDashboard;
