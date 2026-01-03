import { motion } from "framer-motion";
import { ArrowRight, Leaf, Factory, Beaker, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const floatingIcons = [
  { Icon: Leaf, delay: 0, x: "10%", y: "20%" },
  { Icon: Factory, delay: 0.5, x: "85%", y: "15%" },
  { Icon: Beaker, delay: 1, x: "75%", y: "75%" },
  { Icon: Sparkles, delay: 1.5, x: "15%", y: "70%" },
];

export const Hero = () => {
  return (
    <section className="relative min-h-screen hero-gradient overflow-hidden pt-24">
      {/* Floating Background Icons */}
      {floatingIcons.map(({ Icon, delay, x, y }, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ delay, duration: 0.8 }}
          className="absolute float-animation"
          style={{ left: x, top: y, animationDelay: `${delay}s` }}
        >
          <Icon className="w-24 h-24 text-primary" />
        </motion.div>
      ))}

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }}
      />

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">
              Join 500+ Labs & Industries Already Reducing Waste
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-extrabold text-5xl md:text-7xl leading-tight mb-6"
          >
            Turn Waste into{" "}
            <span className="gradient-text">Resources</span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Build innovation. Reduce carbon. Enable reuse.{" "}
            <span className="text-foreground font-medium">
              Connect with local labs and industries to give materials a second life.
            </span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/signup?role=provider">
              <Button variant="hero" size="xl" className="group">
                <Factory className="w-5 h-5" />
                I'm a Lab / Industry
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/signup?role=seeker">
              <Button variant="hero-outline" size="xl" className="group">
                <Beaker className="w-5 h-5" />
                I'm a Student / Innovator
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-16 flex items-center justify-center gap-8 text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-background gradient-primary"
                  />
                ))}
              </div>
              <span className="text-sm">500+ Active Users</span>
            </div>
            <div className="hidden md:block w-px h-6 bg-border" />
            <div className="hidden md:flex items-center gap-2">
              <Leaf className="w-4 h-4 text-primary" />
              <span className="text-sm">12,000 kg CO₂ Saved</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};
