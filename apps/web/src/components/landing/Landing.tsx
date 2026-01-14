import { Navbar } from "./navbar";
import { DeveloperExperience } from "./developer-experience";
import { NetworkDiagram } from "./network-diagram";
import { BringYourOwnDomain } from "./bring-your-own-domain";
import { MultipleProtocols } from "./multiple-protocols";
import { OpenSource } from "./opensource";
import { Hero } from "./hero";
import { authClient } from "@/lib/auth-client";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export const Landing = () => {
  const { isPending: isSessionLoading } = authClient.useSession();
  const [minLoadingTime, setMinLoadingTime] = useState(true);
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinLoadingTime(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isSessionLoading && !minLoadingTime) {
      setShowLoading(false);
    }
  }, [isSessionLoading, minLoadingTime]);

  return (
    <>
      <AnimatePresence>
        {showLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <img src="/logo.png" alt="OutRay Logo" className="w-16 h-16" />
              <div className="flex gap-2">
                <motion.div
                  className="w-2 h-2 bg-white/60 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-2 h-2 bg-white/60 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-2 h-2 bg-white/60 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-black text-white selection:bg-accent/30">
        <Navbar />

        <Hero />

        <div className="py-24 border-white/5">
          <DeveloperExperience />
        </div>

        <NetworkDiagram />

        <BringYourOwnDomain />

        <MultipleProtocols />

        <OpenSource />

        <footer className="border-t border-white/10 py-12 bg-black">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="font-bold">OutRay</span>
            </div>
            <div className="text-white/40 text-sm">
              © {new Date().getFullYear()} OutRay. All rights reserved.
            </div>
            <div className="flex gap-6 text-white/60">
              <a
                href="https://twitter.com/outraytunnel"
                target="_blank"
                className="hover:text-white transition-colors"
              >
                Twitter
              </a>
              <a
                href="https://github.com/akinloluwami/outray"
                target="_blank"
                className="hover:text-white transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://discord.gg/DncjGcCHDg"
                target="_blank"
                className="hover:text-white transition-colors"
              >
                Discord
              </a>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};
