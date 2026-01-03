import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Recycle, Plus, Package, ClipboardList, BarChart3, Settings, 
  LogOut, Bell, Search, TrendingUp, Leaf, Upload, MapPin,
  Clock, CheckCircle, XCircle, ChevronRight, Calendar, Users
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatedCounter } from "@/components/AnimatedCounter";

const navItems = [
  { icon: Plus, label: "Add Material", id: "add" },
  { icon: Package, label: "My Listings", id: "listings" },
  { icon: ClipboardList, label: "Requests", id: "requests" },
  { icon: BarChart3, label: "Analytics", id: "analytics" },
  { icon: Settings, label: "Settings", id: "settings" },
];

const mockListings = [
  { id: 1, name: "Lab Glass Equipment", category: "Glassware", status: "active", requests: 3, image: "🧪" },
  { id: 2, name: "Copper Wire Scraps", category: "Metals", status: "active", requests: 7, image: "🔌" },
  { id: 3, name: "Plastic Containers", category: "Plastics", status: "pending", requests: 0, image: "📦" },
];

const mockRequests = [
  { id: 1, material: "Copper Wire Scraps", requester: "Tech Innovation Lab", status: "pending", date: "2h ago" },
  { id: 2, material: "Lab Glass Equipment", requester: "Chemistry Dept.", status: "approved", date: "1d ago" },
  { id: 3, material: "Lab Glass Equipment", requester: "BioTech Startup", status: "pending", date: "3d ago" },
];

const ProviderDashboard = () => {
  const [activeTab, setActiveTab] = useState("listings");
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
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold">
              M
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="font-medium text-sm">MIT Chemistry Lab</p>
                <p className="text-xs text-muted-foreground">Provider</p>
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
              <Input placeholder="Search..." className="pl-9 w-64 h-10" />
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
            {/* Impact Summary Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"
            >
              {[
                { icon: TrendingUp, label: "Waste Diverted", value: 1250, suffix: " kg", color: "text-eco-green" },
                { icon: Leaf, label: "CO₂ Saved", value: 340, suffix: " kg", color: "text-eco-teal" },
                { icon: Users, label: "People Helped", value: 28, suffix: "", color: "text-eco-blue" },
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
                      <AnimatedCounter end={stat.value} suffix={stat.suffix} duration={1.5} />
                    </p>
                  </div>
                </div>
              ))}
            </motion.div>

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
                  
                  <form className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Material Name</label>
                      <Input placeholder="e.g., Laboratory Glass Beakers" className="h-12" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category</label>
                      <div className="grid grid-cols-3 gap-3">
                        {["Chemicals", "Glassware", "Electronics", "Metals", "Plastics", "Other"].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className="px-4 py-2 rounded-xl border border-border text-sm hover:border-primary hover:bg-primary/5 transition-all"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Image Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Images</label>
                      <div className="border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Drag and drop images, or{" "}
                          <span className="text-primary font-medium">browse</span>
                        </p>
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pickup Location</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input placeholder="Auto-detected..." className="pl-10 h-12" />
                      </div>
                      <div className="h-40 rounded-xl bg-muted/50 border border-border flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Map Preview</p>
                      </div>
                    </div>

                    {/* Pickup Hours */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Pickup Hours</label>
                      <div className="flex items-center gap-4">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1 h-2 bg-muted rounded-full relative">
                          <div className="absolute left-[20%] right-[30%] h-full gradient-primary rounded-full" />
                          <div className="absolute left-[20%] w-4 h-4 -mt-1 bg-white rounded-full border-2 border-primary shadow" />
                          <div className="absolute right-[30%] w-4 h-4 -mt-1 bg-white rounded-full border-2 border-primary shadow" />
                        </div>
                        <span className="text-sm text-muted-foreground">9AM - 5PM</span>
                      </div>
                    </div>

                    <Button variant="hero" size="lg" className="w-full">
                      Add Material
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
                <div className="grid gap-4">
                  {mockListings.map((listing, index) => (
                    <motion.div
                      key={listing.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -2 }}
                      className="glass-card rounded-2xl p-6 flex items-center gap-6 cursor-pointer group"
                    >
                      <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-3xl">
                        {listing.image}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {listing.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{listing.category}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        listing.status === "active" 
                          ? "bg-eco-green/10 text-eco-green" 
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {listing.status}
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg">{listing.requests}</p>
                        <p className="text-xs text-muted-foreground">requests</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </motion.div>
                  ))}
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
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{request.material}</h3>
                          <p className="text-sm text-muted-foreground">
                            Requested by <span className="text-foreground">{request.requester}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">{request.date}</p>
                        </div>
                        {request.status === "pending" ? (
                          <div className="flex gap-2">
                            <Button variant="hero" size="sm">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button variant="outline" size="sm">
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-eco-green/10 text-eco-green">
                            Approved
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
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
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="font-semibold mb-4">CO₂ Reduction Over Time</h3>
                  <div className="h-64 flex items-end gap-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((height, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: i * 0.05, duration: 0.5 }}
                        className="flex-1 gradient-primary rounded-t-lg"
                      />
                    ))}
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>Jan</span>
                    <span>Mar</span>
                    <span>May</span>
                    <span>Jul</span>
                    <span>Sep</span>
                    <span>Nov</span>
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
        onClick={() => setActiveTab("add")}
        className="fixed bottom-8 right-8 w-14 h-14 rounded-full gradient-primary shadow-glow-lg flex items-center justify-center text-white"
      >
        <Plus className="w-6 h-6" />
      </motion.button>
    </div>
  );
};

export default ProviderDashboard;
