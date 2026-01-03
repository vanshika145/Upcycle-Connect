import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Recycle, Search, Package, Map, ClipboardList, BarChart3, Settings, 
  LogOut, Bell, Filter, MapPin, Heart, ArrowRight, Check, Clock,
  ChevronRight, Sliders, Star, Loader2, CreditCard
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { useAuth } from "@/contexts/AuthContext";
import { useSocket } from "@/contexts/SocketContext";
import { materialAPI, Material, requestAPI, impactAPI } from "@/lib/api";
import { toast } from "sonner";
import { RequestModal } from "@/components/RequestModal";
import { PaymentModal } from "@/components/PaymentModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const navItems = [
  { icon: Search, label: "Browse", id: "browse" },
  { icon: Map, label: "Map View", id: "map" },
  { icon: ClipboardList, label: "My Requests", id: "requests" },
  { icon: BarChart3, label: "My Impact", id: "impact" },
  { icon: Settings, label: "Settings", id: "settings" },
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
    }
  }, [activeTab, user, fetchRequests, fetchImpactData]);

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

    socket.on('requestApproved', handleRequestApproved);
    socket.on('requestRejected', handleRequestRejected);

    return () => {
      socket.off('requestApproved', handleRequestApproved);
      socket.off('requestRejected', handleRequestRejected);
    };
  }, [socket, activeTab, fetchRequests, fetchMaterials, userLocation]);

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
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search materials..." className="pl-9 w-64 h-10" />
            </div>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </Button>
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
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
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
                    {materials.map((material, index) => {
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
                                <span className="font-semibold text-primary">
                                  ₹{material.price.toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {material.priceUnit === 'per_unit' ? '/unit' :
                                   material.priceUnit === 'per_kg' ? '/kg' :
                                   material.priceUnit === 'per_box' ? '/box' :
                                   material.priceUnit === 'per_set' ? '/set' : ''}
                                </span>
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
                  
                  {/* Pins */}
                  {[
                    { x: "30%", y: "40%", label: "Lab Beakers" },
                    { x: "50%", y: "35%", label: "Copper Wire" },
                    { x: "65%", y: "55%", label: "PCB Boards" },
                    { x: "40%", y: "60%", label: "Solvents" },
                  ].map((pin, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: i * 0.1 }}
                      className="absolute group cursor-pointer"
                      style={{ left: pin.x, top: pin.y }}
                    >
                      <div className="absolute -inset-3 rounded-full bg-primary/20 map-pin-pulse" />
                      <div className="w-10 h-10 -ml-5 -mt-5 rounded-full gradient-primary shadow-glow flex items-center justify-center">
                        <Package className="w-5 h-5 text-white" />
                      </div>
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div className="glass-card rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
                          <p className="text-sm font-medium">{pin.label}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}

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

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Bar Chart */}
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="font-semibold mb-4">Waste Reused by Category</h3>
                    <div className="space-y-4">
                      {[
                        { label: "Electronics", value: 45 },
                        { label: "Metals", value: 30 },
                        { label: "Glassware", value: 15 },
                        { label: "Chemicals", value: 10 },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{item.label}</span>
                            <span className="text-muted-foreground">{item.value}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.value}%` }}
                              transition={{ duration: 1, delay: 0.2 }}
                              className="h-full gradient-primary rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pie Chart Visualization */}
                  <div className="glass-card rounded-2xl p-6">
                    <h3 className="font-semibold mb-4">Category Distribution</h3>
                    <div className="flex items-center justify-center">
                      <div className="relative w-48 h-48">
                        <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                          {[
                            { percent: 45, color: "hsl(var(--eco-green))", offset: 0 },
                            { percent: 30, color: "hsl(var(--eco-teal))", offset: 45 },
                            { percent: 15, color: "hsl(var(--eco-blue))", offset: 75 },
                            { percent: 10, color: "hsl(var(--accent))", offset: 90 },
                          ].map((slice, i) => (
                            <motion.circle
                              key={i}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke={slice.color}
                              strokeWidth="20"
                              strokeDasharray={`${slice.percent * 2.51} 251`}
                              strokeDashoffset={`${-slice.offset * 2.51}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: i * 0.2 }}
                            />
                          ))}
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <p className="font-display font-bold text-2xl">23</p>
                            <p className="text-xs text-muted-foreground">Total Items</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
    </div>
  );
};

export default SeekerDashboard;
