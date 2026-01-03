import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Recycle, Mail, Lock, User, Building2, Factory, Beaker, ArrowRight, Check, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

type Role = "provider" | "seeker" | null;

const Signup = () => {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") as Role;
  const [selectedRole, setSelectedRole] = useState<Role>(initialRole);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    organization: "",
  });
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

  // Get user location when enabled
  useEffect(() => {
    if (locationEnabled && !location) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          (error) => {
            console.error("Geolocation error:", error);
            // Set default location if geolocation fails
            setLocation({ latitude: 0, longitude: 0 });
          }
        );
      } else {
        // Set default location if geolocation is not supported
        setLocation({ latitude: 0, longitude: 0 });
      }
    }
  }, [locationEnabled, location]);

  const roles = [
    {
      id: "provider" as const,
      icon: Factory,
      title: "Material Provider",
      description: "Labs, industries, and organizations with surplus materials to share",
      features: ["List surplus materials", "Track pickup requests", "Monitor impact"],
    },
    {
      id: "seeker" as const,
      icon: Beaker,
      title: "Material Seeker",
      description: "Students, innovators, and startups looking for reusable materials",
      features: ["Browse local resources", "Request materials", "Build sustainably"],
    },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Illustration */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden lg:flex lg:w-1/2 gradient-primary relative overflow-hidden"
      >
        {/* Pattern Overlay */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
        
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Recycle className="w-8 h-8" />
            </div>
            <span className="font-display font-bold text-2xl">UpCycleConnect</span>
          </div>

          {/* Illustration */}
          <div className="relative w-80 h-80 mb-8">
            <motion.div
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <div className="w-64 h-64 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <div className="w-48 h-48 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Recycle className="w-16 h-16" />
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Floating Icons */}
            {[Factory, Beaker, Building2].map((Icon, index) => (
              <motion.div
                key={index}
                animate={{ 
                  y: [0, -10, 0],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 3, 
                  repeat: Infinity, 
                  delay: index * 0.5,
                  ease: "easeInOut"
                }}
                className="absolute w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                style={{
                  left: `${20 + index * 30}%`,
                  top: index % 2 === 0 ? '10%' : '80%'
                }}
              >
                <Icon className="w-6 h-6" />
              </motion.div>
            ))}
          </div>

          <h2 className="font-display font-bold text-3xl text-center mb-4">
            Join the Circular Economy
          </h2>
          <p className="text-white/80 text-center max-w-sm">
            Connect with local labs and industries to transform waste into valuable resources.
          </p>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Mobile Logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Recycle className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl">UpCycleConnect</span>
          </Link>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={`w-3 h-3 rounded-full transition-all ${
                  s === step ? "w-8 gradient-primary" : s < step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {step === 1 ? (
            <>
              <h1 className="font-display font-bold text-3xl text-center mb-2">
                Create your account
              </h1>
              <p className="text-muted-foreground text-center mb-8">
                Choose how you want to use UpCycleConnect
              </p>

              {/* Role Selection */}
              <div className="grid gap-4 mb-8">
                {roles.map((role) => (
                  <motion.button
                    key={role.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedRole(role.id)}
                    className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                      selectedRole === role.id
                        ? "border-primary bg-primary/5 shadow-glow"
                        : "border-border hover:border-primary/30 hover:bg-muted/50"
                    }`}
                  >
                    {/* Check Mark */}
                    {selectedRole === role.id && (
                      <div className="absolute top-4 right-4 w-6 h-6 rounded-full gradient-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        selectedRole === role.id ? "gradient-primary" : "bg-muted"
                      }`}>
                        <role.icon className={`w-6 h-6 ${
                          selectedRole === role.id ? "text-white" : "text-muted-foreground"
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{role.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{role.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {role.features.map((feature) => (
                            <span
                              key={feature}
                              className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <Button
                variant="hero"
                size="lg"
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!selectedRole}
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </Button>
            </>
          ) : (
            <>
              <h1 className="font-display font-bold text-3xl text-center mb-2">
                Almost there!
              </h1>
              <p className="text-muted-foreground text-center mb-8">
                Fill in your details to get started
              </p>

              {/* Signup Form */}
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedRole || !location) {
                    return;
                  }

                  try {
                    setIsLoading(true);
                    await signUp(
                      formData.email,
                      formData.password,
                      {
                        name: formData.name,
                        role: selectedRole,
                        organization: selectedRole === "provider" ? formData.organization : undefined,
                        college: selectedRole === "seeker" ? formData.organization : undefined,
                        latitude: location.latitude,
                        longitude: location.longitude,
                      }
                    );
                  } catch (error) {
                    // Error is handled by the auth context (toast notification)
                  } finally {
                    setIsLoading(false);
                  }
                }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="name" 
                      placeholder="John Doe" 
                      className="pl-10 h-12"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="you@example.com" 
                      className="pl-10 h-12"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      className="pl-10 h-12"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      minLength={6}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">
                    {selectedRole === "provider" ? "Organization" : "College"}
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      id="organization" 
                      placeholder={selectedRole === "provider" ? "MIT Labs" : "MIT"} 
                      className="pl-10 h-12"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Location Permission */}
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setLocationEnabled(!locationEnabled)}
                  className={`p-4 rounded-xl border border-dashed ${
                    locationEnabled ? "border-primary bg-primary/10" : "border-primary/30 bg-primary/5"
                  } flex items-center gap-4 cursor-pointer transition-colors`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    locationEnabled ? "bg-primary/20" : "bg-primary/10"
                  }`}>
                    <MapPin className={`w-5 h-5 ${locationEnabled ? "text-primary" : "text-primary/70"}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Enable Location</p>
                    <p className="text-xs text-muted-foreground">
                      {locationEnabled && location 
                        ? `Location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
                        : "Required to find nearby materials"}
                    </p>
                  </div>
                  <div 
                    className={`w-12 h-6 rounded-full relative transition-colors ${
                      locationEnabled ? "bg-primary" : "bg-primary/20"
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      locationEnabled ? "left-7" : "left-1"
                    }`} />
                  </div>
                </motion.div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    onClick={() => setStep(1)}
                    disabled={isLoading}
                  >
                    Back
                  </Button>
                  <Button 
                    variant="hero" 
                    size="lg" 
                    className="flex-1"
                    type="submit"
                    disabled={isLoading || !locationEnabled || !location}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Account
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Login Link */}
          <p className="text-center text-muted-foreground mt-8">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Log in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Signup;
