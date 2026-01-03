import { motion } from "framer-motion";
import { TrendingUp, Leaf, Factory, Users } from "lucide-react";
import { AnimatedCounter } from "./AnimatedCounter";

const metrics = [
  {
    icon: TrendingUp,
    value: 45280,
    suffix: " kg",
    label: "Waste Diverted",
    description: "From landfills to innovation",
    color: "text-eco-green",
    bgColor: "bg-eco-green/10",
  },
  {
    icon: Leaf,
    value: 12450,
    suffix: " kg",
    label: "CO₂ Emissions Reduced",
    description: "Environmental impact saved",
    color: "text-eco-teal",
    bgColor: "bg-eco-teal/10",
  },
  {
    icon: Factory,
    value: 156,
    suffix: "+",
    label: "Labs & Industries",
    description: "Active contributors",
    color: "text-eco-blue",
    bgColor: "bg-eco-blue/10",
  },
  {
    icon: Users,
    value: 2340,
    suffix: "+",
    label: "Student Innovators",
    description: "Building with reused materials",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
];

export const ImpactPreview = () => {
  return (
    <section className="py-24 bg-muted/50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="hsl(var(--primary))" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Real Impact
          </span>
          <h2 className="font-display font-bold text-4xl md:text-5xl text-foreground mb-4">
            Our Collective Impact
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Together, we're building a more sustainable future. See the difference our community is making.
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="glass-card rounded-2xl p-6 text-center group"
            >
              {/* Icon */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: 10 }}
                className={`w-14 h-14 rounded-2xl ${metric.bgColor} flex items-center justify-center mx-auto mb-4`}
              >
                <metric.icon className={`w-7 h-7 ${metric.color}`} />
              </motion.div>

              {/* Value */}
              <div className="font-display font-bold text-4xl text-foreground mb-1">
                <AnimatedCounter end={metric.value} suffix={metric.suffix} />
              </div>

              {/* Label */}
              <h3 className="font-semibold text-foreground mb-1">{metric.label}</h3>
              <p className="text-sm text-muted-foreground">{metric.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
