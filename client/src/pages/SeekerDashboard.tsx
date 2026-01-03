import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Recycle, Search, Package, Map, ClipboardList, BarChart3, Settings, 
  LogOut, Bell, Filter, MapPin, Heart, ArrowRight, Check, Clock,
  ChevronRight, Sliders, Star
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const navItems = [
  { icon: Search, label: "Browse", id: "browse" },
  { icon: Map, label: "Map View", id: "map" },
  { icon: ClipboardList, label: "My Requests", id: "requests" },
  { icon: BarChart3, label: "My Impact", id: "impact" },
  { icon: Settings, label: "Settings", id: "settings" },
];

const categories = ["All", "Chemicals", "Glassware", "Electronics", "Metals", "Plastics", "Bio Materials"];

const mockMaterials = [
  { 
    id: 1, 
    name: "Laboratory Beakers Set", 
    provider: "MIT Chemistry Lab", 
    distance: "0.8 km",
    category: "Glassware",
    image: "🧪",
    rating: 4.8,
    available: true
  },
  { 
    id: 2, 
    name: "Copper Wire Scraps (5kg)", 
    provider: "ElectroTech Industries", 
    distance: "1.2 km",
    category: "Metals",
    image: "🔌",
    rating: 4.5,
    available: true
  },
  { 
    id: 3, 
    name: "Recycled PCB Boards", 
    provider: "TechCycle Hub", 
    distance: "2.1 km",
    category: "Electronics",
    image: "🖥️",
    rating: 4.9,
    available: true
  },
  { 
    id: 4, 
    name: "Organic Solvents", 
    provider: "BioScience Lab", 
    distance: "3.5 km",
    category: "Chemicals",
    image: "⚗️",
    rating: 4.2,
    available: false
  },
];

const mockRequests = [
  { id: 1, material: "Copper Wire Scraps", status: "approved", date: "Jan 2", provider: "ElectroTech" },
  { id: 2, material: "Lab Beakers", status: "pending", date: "Jan 1", provider: "MIT Lab" },
  { id: 3, material: "PCB Boards", status: "picked", date: "Dec 28", provider: "TechCycle" },
];

const SeekerDashboard = () => {
  const [activeTab, setActiveTab] = useState("browse");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sidebarOpen, setSidebarOpen] = useState(true);

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
              A
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="font-medium text-sm">Alex Chen</p>
                <p className="text-xs text-muted-foreground">Innovator</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <Button variant="ghost" size="sm" className="w-full mt-3 text-muted-foreground">
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
                        onClick={() => setSelectedCategory(cat)}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mockMaterials.map((material, index) => (
                    <motion.div
                      key={material.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -4 }}
                      className="glass-card rounded-2xl overflow-hidden group cursor-pointer"
                    >
                      {/* Image */}
                      <div className="relative h-40 bg-muted flex items-center justify-center text-6xl">
                        {material.image}
                        <button className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Heart className="w-5 h-5 text-muted-foreground hover:text-destructive transition-colors" />
                        </button>
                        {!material.available && (
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
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                            <span>{material.rating}</span>
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                          {material.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">{material.provider}</p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{material.distance}</span>
                          </div>
                          <Button variant="hero" size="sm" disabled={!material.available}>
                            Request
                            <ArrowRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
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
                <div className="space-y-4">
                  {mockRequests.map((request, index) => (
                    <motion.div
                      key={request.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-card rounded-2xl p-6"
                    >
                      {/* Timeline Status */}
                      <div className="flex items-center gap-4 mb-4">
                        {["Requested", "Approved", "Picked Up"].map((step, i) => {
                          const isActive = 
                            (request.status === "pending" && i === 0) ||
                            (request.status === "approved" && i <= 1) ||
                            (request.status === "picked" && i <= 2);
                          return (
                            <div key={step} className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                isActive ? "gradient-primary text-white" : "bg-muted text-muted-foreground"
                              }`}>
                                {isActive ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                              </div>
                              <span className={`text-sm ${isActive ? "font-medium" : "text-muted-foreground"}`}>
                                {step}
                              </span>
                              {i < 2 && (
                                <div className={`w-8 h-0.5 ${isActive ? "bg-primary" : "bg-muted"}`} />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{request.material}</h3>
                          <p className="text-sm text-muted-foreground">
                            from {request.provider} • {request.date}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          View Details
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
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
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Materials Reused", value: 23, suffix: "", color: "text-eco-green" },
                    { label: "CO₂ Saved", value: 156, suffix: " kg", color: "text-eco-teal" },
                    { label: "Money Saved", value: 420, prefix: "$", suffix: "", color: "text-eco-blue" },
                  ].map((stat) => (
                    <div key={stat.label} className="glass-card rounded-2xl p-6 text-center">
                      <p className={`font-display font-bold text-4xl ${stat.color}`}>
                        <AnimatedCounter end={stat.value} prefix={stat.prefix} suffix={stat.suffix} />
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>

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
    </div>
  );
};

export default SeekerDashboard;
