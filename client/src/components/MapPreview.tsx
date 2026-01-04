import { motion } from "framer-motion";
import { MapPin, Beaker, Cpu, Package, Leaf } from "lucide-react";

const mapPins = [
  { x: "25%", y: "35%", label: "Chemistry Lab", icon: Beaker, items: 12 },
  { x: "45%", y: "25%", label: "Electronics Recycler", icon: Cpu, items: 8 },
  { x: "65%", y: "45%", label: "Packaging Industry", icon: Package, items: 23 },
  { x: "35%", y: "55%", label: "Bio Lab", icon: Leaf, items: 5 },
  { x: "55%", y: "65%", label: "Materials Lab", icon: Beaker, items: 15 },
  { x: "75%", y: "30%", label: "Tech Startup", icon: Cpu, items: 7 },
];

export const MapPreview = () => {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Nearby Resources
          </span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-foreground mb-4">
            Materials Near You
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover available materials from labs and industries in your area. The closer, the lower the carbon footprint!
          </p>
        </motion.div>

        {/* Map Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative max-w-5xl mx-auto"
        >
          {/* Map Background with actual map image */}
          <div className="relative aspect-[16/10] rounded-3xl overflow-hidden border border-border shadow-xl">
            {/* Map Image */}
            <img 
              src="/map.png" 
              alt="Materials map showing nearby resources"
              className="absolute inset-0 w-full h-full object-cover"
            />
            
            {/* Gradient Overlay for better visibility */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/10" />
            
            {/* Subtle overlay for better contrast */}
            <div className="absolute inset-0 bg-background/5" />

            {/* Location Pins */}
            {mapPins.map((pin, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + index * 0.1, duration: 0.4, type: "spring" }}
                className="absolute group cursor-pointer"
                style={{ left: pin.x, top: pin.y }}
              >
                {/* Pulse Ring */}
                <div className="absolute -inset-3 rounded-full bg-primary/20 map-pin-pulse" />
                
                {/* Pin */}
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className="relative w-12 h-12 -ml-6 -mt-6"
                >
                  <div className="absolute inset-0 rounded-full gradient-primary shadow-glow" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <pin.icon className="w-5 h-5 text-white" />
                  </div>
                </motion.div>

                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div className="glass-card rounded-xl px-4 py-2 whitespace-nowrap shadow-lg">
                    <p className="font-semibold text-sm text-foreground">{pin.label}</p>
                    <p className="text-xs text-muted-foreground">{pin.items} materials available</p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Your Location Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.8 }}
              className="absolute"
              style={{ left: "50%", top: "50%" }}
            >
              <div className="relative -ml-4 -mt-4">
                <div className="absolute inset-0 w-8 h-8 rounded-full bg-accent/30 animate-ping" />
                <div className="relative w-8 h-8 rounded-full bg-accent border-4 border-white shadow-lg flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full gradient-primary" />
              <span className="text-sm text-muted-foreground">Material Providers</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-accent" />
              <span className="text-sm text-muted-foreground">Your Location</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
