import { useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams, Link } from "react-router-dom";
import { 
  Recycle, ArrowRight, ArrowLeft, Check, Building2, Beaker, Cpu, 
  Package, Leaf, FlaskConical, Clock, Users, Lightbulb
} from "lucide-react";
import { Button } from "@/components/ui/button";

const providerTypes = [
  { id: "university", icon: Building2, label: "University Lab" },
  { id: "industry", icon: Cpu, label: "Small Industry" },
  { id: "research", icon: FlaskConical, label: "Research Center" },
  { id: "hospital", icon: Beaker, label: "Medical Lab" },
];

const materialCategories = [
  { id: "chemicals", icon: FlaskConical, label: "Chemicals" },
  { id: "glassware", icon: Beaker, label: "Glassware" },
  { id: "electronics", icon: Cpu, label: "Electronics" },
  { id: "metals", icon: Package, label: "Metals" },
  { id: "plastics", icon: Package, label: "Plastics" },
  { id: "bio", icon: Leaf, label: "Bio Materials" },
];

const seekerInterests = [
  { id: "robotics", label: "Robotics" },
  { id: "chemistry", label: "Chemistry Projects" },
  { id: "electronics", label: "Electronics" },
  { id: "art", label: "Art & Design" },
  { id: "sustainability", label: "Sustainability" },
  { id: "biotech", label: "Biotechnology" },
  { id: "3dprinting", label: "3D Printing" },
  { id: "education", label: "Education" },
];

const projectTypes = [
  { id: "academic", label: "Academic Project" },
  { id: "startup", label: "Startup / Business" },
  { id: "personal", label: "Personal Project" },
  { id: "nonprofit", label: "Non-profit Initiative" },
];

const Onboarding = () => {
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "provider";
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [pickupHours, setPickupHours] = useState([9, 17]);

  const totalSteps = role === "provider" ? 3 : 2;

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const nextStep = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Recycle className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl">UpCycleConnect</span>
          </Link>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i + 1 === step ? "w-12 gradient-primary" : i + 1 < step ? "w-8 bg-primary" : "w-8 bg-muted"
                }`}
              />
            ))}
          </div>

          <h1 className="font-display font-bold text-3xl mb-2">
            {role === "provider" ? "Set Up Your Provider Profile" : "Personalize Your Experience"}
          </h1>
          <p className="text-muted-foreground">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Content Card */}
        <div className="glass-card rounded-3xl p-8">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {role === "provider" ? (
              <>
                {step === 1 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">What type of organization are you?</h2>
                        <p className="text-sm text-muted-foreground">Select the option that best describes you</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {providerTypes.map((type) => (
                        <motion.button
                          key={type.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedType(type.id)}
                          className={`relative p-6 rounded-2xl border-2 text-left transition-all ${
                            selectedType === type.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          {selectedType === type.id && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <type.icon className={`w-8 h-8 mb-3 ${
                            selectedType === type.id ? "text-primary" : "text-muted-foreground"
                          }`} />
                          <p className="font-medium">{type.label}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">What materials do you typically have?</h2>
                        <p className="text-sm text-muted-foreground">Select all that apply</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {materialCategories.map((cat) => (
                        <motion.button
                          key={cat.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleCategory(cat.id)}
                          className={`relative p-4 rounded-xl border-2 text-center transition-all ${
                            selectedCategories.includes(cat.id)
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          {selectedCategories.includes(cat.id) && (
                            <div className="absolute top-2 right-2 w-4 h-4 rounded-full gradient-primary flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                          )}
                          <cat.icon className={`w-6 h-6 mx-auto mb-2 ${
                            selectedCategories.includes(cat.id) ? "text-primary" : "text-muted-foreground"
                          }`} />
                          <p className="text-sm font-medium">{cat.label}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">When are you available for pickups?</h2>
                        <p className="text-sm text-muted-foreground">Set your typical availability hours</p>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-2xl p-6">
                      <div className="flex items-center gap-4 mb-6">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="relative h-3 bg-muted rounded-full">
                            <div 
                              className="absolute h-full gradient-primary rounded-full"
                              style={{ 
                                left: `${(pickupHours[0] / 24) * 100}%`, 
                                right: `${100 - (pickupHours[1] / 24) * 100}%` 
                              }}
                            />
                            <input
                              type="range"
                              min="0"
                              max="24"
                              value={pickupHours[0]}
                              onChange={(e) => setPickupHours([parseInt(e.target.value), pickupHours[1]])}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </div>
                        </div>
                        <span className="text-sm font-medium min-w-[80px]">
                          {pickupHours[0]}:00 - {pickupHours[1]}:00
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-4 h-4" />
                        <span>Students will see these hours when requesting materials</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {step === 1 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Lightbulb className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">What are you interested in?</h2>
                        <p className="text-sm text-muted-foreground">Select all that apply</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      {seekerInterests.map((interest) => (
                        <motion.button
                          key={interest.id}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => toggleInterest(interest.id)}
                          className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all ${
                            selectedInterests.includes(interest.id)
                              ? "border-primary bg-primary text-white"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          {interest.label}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-lg">What type of project are you working on?</h2>
                        <p className="text-sm text-muted-foreground">This helps us recommend the right materials</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {projectTypes.map((type) => (
                        <motion.button
                          key={type.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setSelectedType(type.id)}
                          className={`relative p-5 rounded-2xl border-2 text-left transition-all ${
                            selectedType === type.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/30"
                          }`}
                        >
                          {selectedType === type.id && (
                            <div className="absolute top-3 right-3 w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <p className="font-medium">{type.label}</p>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1}
              className={step === 1 ? "invisible" : ""}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {step < totalSteps ? (
              <Button variant="hero" onClick={nextStep}>
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Link to={role === "provider" ? "/provider-dashboard" : "/seeker-dashboard"}>
                <Button variant="hero">
                  Get Started
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Onboarding;
