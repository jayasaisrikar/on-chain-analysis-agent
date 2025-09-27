'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, Key, Shield, Check } from 'lucide-react';
import { useAPIConfig } from '../../hooks/useAPIConfig';

const APISetupNotification: React.FC = () => {
  const { isConfigured } = useAPIConfig();
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasShownBefore, setHasShownBefore] = useState(false);

  useEffect(() => {
    // Check if user has seen this notification before
    const hasSeenNotification = localStorage.getItem('api-setup-notification-seen') === 'true';
    setHasShownBefore(hasSeenNotification);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('api-setup-notification-seen', 'true');
  };

  // Don't show if already configured, dismissed, or has seen before
  if (isConfigured || isDismissed || hasShownBefore) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600/95 to-purple-600/95 backdrop-blur-sm border-b border-blue-400/20"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/10 rounded-lg">
                <Key className="w-5 h-5 text-white" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold text-white text-sm">
                  API Configuration Required
                </h3>
                <p className="text-white/80 text-sm">
                  Configure your AI provider (OpenAI or Gemini) using the Settings button in the top bar.
                </p>
              </div>
              
              <div className="hidden sm:flex items-center gap-4 text-white/80 text-xs">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span>Stored locally & encrypted</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Never sent to our servers</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default APISetupNotification;