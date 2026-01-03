import { motion } from "framer-motion";
import { Recycle, Leaf, Heart, Twitter, Linkedin, Github } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Recycle className="w-5 h-5 text-white" />
              </div>
              <span className="font-display font-bold text-xl text-background">
                UpCycle<span className="text-primary">Connect</span>
              </span>
            </Link>
            <p className="text-background/60 max-w-sm mb-6">
              Connecting laboratories, industries, and innovators to transform waste into 
              resources. Building a sustainable future, one material at a time.
            </p>
            <div className="flex items-center gap-2 text-sm text-background/60">
              <Leaf className="w-4 h-4 text-primary" />
              <span>Making sustainability accessible for everyone</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-background mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {["Browse Materials", "Post a Listing", "How It Works", "Impact Dashboard"].map(
                (link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-background/60 hover:text-primary transition-colors text-sm"
                    >
                      {link}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold text-background mb-4">Resources</h4>
            <ul className="space-y-3">
              {["Documentation", "API Reference", "Community", "Support"].map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-background/60 hover:text-primary transition-colors text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-background/10 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-1 text-sm text-background/60">
              <span>© {currentYear} UpCycleConnect. Made with</span>
              <Heart className="w-4 h-4 text-destructive fill-destructive" />
              <span>for the planet.</span>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {[
                { icon: Twitter, label: "Twitter" },
                { icon: Linkedin, label: "LinkedIn" },
                { icon: Github, label: "GitHub" },
              ].map(({ icon: Icon, label }) => (
                <motion.a
                  key={label}
                  href="#"
                  whileHover={{ scale: 1.1, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-10 h-10 rounded-xl bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                >
                  <Icon className="w-5 h-5" />
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
