'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { APIKeySettings } from '../../types/api-config';
import APIKeyStorage from '../../utils/api-key-storage';
import APIConfigPanel from './APIConfigPanel';

interface SettingsButtonProps {
  onConfigChange?: (config: APIKeySettings) => void;
  className?: string;
}

const SettingsButton: React.FC<SettingsButtonProps> = ({ onConfigChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasValidConfig, setHasValidConfig] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<string>('');

  // Check for existing configuration on mount
  useEffect(() => {
    const checkConfig = async () => {
      const stored = await APIKeyStorage.loadSettings();
      if (stored) {
        const hasKey = stored.selectedProvider === 'openai' ? !!stored.openaiKey : !!stored.geminiKey;
        setHasValidConfig(hasKey);
        setCurrentProvider(stored.selectedProvider);
      }
    };
    checkConfig();
  }, []);

  const handleConfigChange = (config: APIKeySettings) => {
    const hasKey = config.selectedProvider === 'openai' ? !!config.openaiKey : !!config.geminiKey;
    setHasValidConfig(hasKey);
    setCurrentProvider(config.selectedProvider);
    onConfigChange?.(config);
  };

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const getStatusIcon = () => {
    if (hasValidConfig) {
      return <CheckCircle className="w-3 h-3 text-green-400" />;
    }
    return <AlertCircle className="w-3 h-3 text-amber-400" />;
  };

  const getStatusText = () => {
    if (hasValidConfig) {
      return 'Settings';
    }
    return 'Setup Required';
  };

  const getTooltipText = () => {
    if (hasValidConfig) {
      return `${currentProvider.toUpperCase()} configured - Click to manage settings`;
    }
    return 'API configuration required - Click to set up your AI provider';
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleOpen}
        title={getTooltipText()}
        className={`
          flex items-center gap-2 px-3 py-2
          bg-white/10 hover:bg-white/20 
          border border-white/20 hover:border-white/30
          rounded-xl transition-all duration-200
          backdrop-blur-sm group
          ${!hasValidConfig ? 'animate-pulse border-amber-400/50 bg-amber-500/10' : ''}
          ${className}
        `}
      >
        <Settings className="w-4 h-4 text-slate-300 group-hover:text-white transition-colors" />
        {getStatusIcon()}
        <span className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
          {getStatusText()}
        </span>
      </motion.button>

      <APIConfigPanel 
        isOpen={isOpen}
        onClose={handleClose}
        onConfigChange={handleConfigChange}
      />
    </>
  );
};

export default SettingsButton;