'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Key, Eye, EyeOff, Check, AlertCircle, Loader2, Shield, Info } from 'lucide-react';
import { APIKeySettings, AIProvider, APIKeyValidationResult } from '../../types/api-config';
import APIKeyStorage from '../../utils/api-key-storage';
import { APIKeyValidator } from '../../utils/api-key-validator';
import AboutAPIConfig from './AboutAPIConfig';

interface APIConfigPanelProps {
  onConfigChange?: (config: APIKeySettings) => void;
  isOpen: boolean;
  onClose: () => void;
}

const APIConfigPanel: React.FC<APIConfigPanelProps> = ({ onConfigChange, isOpen, onClose }) => {
  const [settings, setSettings] = useState<APIKeySettings>({
    selectedProvider: 'gemini',
    rememberKeys: false
  });
  
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    openai?: APIKeyValidationResult;
    gemini?: APIKeyValidationResult;
  }>({});
  const [isValidating, setIsValidating] = useState<{
    openai?: boolean;
    gemini?: boolean;
  }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load settings on component mount
  useEffect(() => {
    setMounted(true);
    const loadStoredSettings = async () => {
      const stored = await APIKeyStorage.loadSettings();
      if (stored) {
        setSettings(stored);
      }
    };
    loadStoredSettings();
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Focus the modal when it opens
      const timer = setTimeout(() => {
        const modal = document.querySelector('[data-modal="api-config"]') as HTMLElement;
        if (modal) {
          modal.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle provider selection
  const handleProviderChange = (provider: AIProvider) => {
    setSettings(prev => ({
      ...prev,
      selectedProvider: provider
    }));
  };

  // Handle API key change
  const handleKeyChange = (provider: AIProvider, value: string) => {
    setSettings(prev => ({
      ...prev,
      [`${provider}Key`]: value
    }));
    
    // Clear validation result when key changes
    setValidationResults(prev => ({
      ...prev,
      [provider]: undefined
    }));
  };

  // Handle remember keys toggle
  const handleRememberToggle = (remember: boolean) => {
    setSettings(prev => ({
      ...prev,
      rememberKeys: remember
    }));
  };

  // Validate API key
  const validateKey = async (provider: AIProvider) => {
    const key = provider === 'openai' ? settings.openaiKey : settings.geminiKey;
    if (!key) return;

    setIsValidating(prev => ({ ...prev, [provider]: true }));

    try {
      const result = await APIKeyValidator.validateAPIKey(provider, key);
      setValidationResults(prev => ({
        ...prev,
        [provider]: result
      }));
    } catch (error) {
      setValidationResults(prev => ({
        ...prev,
        [provider]: {
          isValid: false,
          provider,
          error: error instanceof Error ? error.message : 'Validation failed'
        }
      }));
    } finally {
      setIsValidating(prev => ({ ...prev, [provider]: false }));
    }
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await APIKeyStorage.saveSettings(settings);
      onConfigChange?.(settings);
      
      // Show success message briefly
      await new Promise(resolve => setTimeout(resolve, 500));
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Check if configuration is valid
  const isConfigValid = () => {
    const currentKey = settings.selectedProvider === 'openai' ? settings.openaiKey : settings.geminiKey;
    const currentValidation = validationResults[settings.selectedProvider];
    
    return currentKey && 
           APIKeyValidator.isValidKeyFormat(settings.selectedProvider, currentKey) &&
           currentValidation?.isValid;
  };

  const providerInfo = {
    openai: {
      name: 'OpenAI',
      description: 'Uses GPT models for analysis',
      keyFormat: 'Starts with "sk-" (51 characters)',
      getKeyUrl: 'https://platform.openai.com/api-keys'
    },
    gemini: {
      name: 'Google Gemini',
      description: 'Uses Gemini models for analysis',
      keyFormat: 'Alphanumeric string (39 characters)',
      getKeyUrl: 'https://makersuite.google.com/app/apikey'
    }
  };

  if (!mounted) {
    return null;
  }

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ 
              duration: 0.2, 
              ease: [0.23, 1, 0.320, 1] // Custom easing for smooth feel
            }}
            className="w-full max-w-2xl bg-slate-900/98 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
            data-modal="api-config"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b border-slate-700/50">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Settings className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">API Configuration</h2>
                <p className="text-sm text-slate-400">Configure your AI provider and API keys</p>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* About Section */}
              <AboutAPIConfig />

              {/* Provider Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-300">
                  AI Provider
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(providerInfo).map(([key, info]) => {
                    const provider = key as AIProvider;
                    const isSelected = settings.selectedProvider === provider;
                    
                    return (
                      <motion.button
                        key={provider}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleProviderChange(provider)}
                        className={`p-4 border-2 rounded-lg transition-all text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10 text-white'
                            : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        <div className="font-medium">{info.name}</div>
                        <div className="text-xs opacity-70 mt-1">{info.description}</div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* API Key Inputs */}
              <div className="space-y-4">
                {Object.entries(providerInfo).map(([key, info]) => {
                  const provider = key as AIProvider;
                  const keyValue = provider === 'openai' ? settings.openaiKey : settings.geminiKey;
                  const showKey = provider === 'openai' ? showOpenAIKey : showGeminiKey;
                  const validation = validationResults[provider];
                  const isValidatingKey = isValidating[provider];
                  const isSelected = settings.selectedProvider === provider;

                  return (
                    <div key={provider} className={`space-y-2 ${!isSelected && 'opacity-50'}`}>
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-slate-300">
                          {info.name} API Key {isSelected && <span className="text-red-400">*</span>}
                        </label>
                        <a
                          href={info.getKeyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                          <Info className="w-3 h-3" />
                          Get API Key
                        </a>
                      </div>
                      
                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={keyValue || ''}
                          onChange={(e) => handleKeyChange(provider, e.target.value)}
                          placeholder={`Enter ${info.name} API key`}
                          disabled={!isSelected}
                          className="w-full px-4 py-3 pr-20 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                          {keyValue && (
                            <>
                              <button
                                type="button"
                                onClick={() => provider === 'openai' ? setShowOpenAIKey(!showOpenAIKey) : setShowGeminiKey(!showGeminiKey)}
                                className="p-1 text-slate-400 hover:text-slate-300"
                              >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => validateKey(provider)}
                                disabled={isValidatingKey || !isSelected}
                                className="p-1 text-slate-400 hover:text-slate-300 disabled:opacity-50"
                              >
                                {isValidatingKey ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Key className="w-4 h-4" />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Key format hint */}
                      <p className="text-xs text-slate-500">{info.keyFormat}</p>

                      {/* Validation result */}
                      {validation && (
                        <div className={`flex items-center gap-2 text-sm ${
                          validation.isValid ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {validation.isValid ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          {validation.isValid ? (
                            <span>Valid - {validation.model}</span>
                          ) : (
                            <span>{validation.error}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Remember Keys Option */}
              <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                <div>
                  <p className="font-medium text-white">Remember API Keys</p>
                  <p className="text-sm text-slate-400">
                    Store encrypted keys locally for future sessions
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.rememberKeys}
                    onChange={(e) => handleRememberToggle(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="relative w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 p-6 border-t border-slate-700/50">
              <button
                onClick={onClose}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSave}
                disabled={!isConfigValid() || isSaving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
};

export default APIConfigPanel;