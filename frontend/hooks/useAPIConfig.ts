import { useState, useEffect, useMemo } from 'react';
import { APIKeySettings } from '../types/api-config';
import APIKeyStorage from '../utils/api-key-storage';

export const useAPIConfig = () => {
  const [config, setConfig] = useState<APIKeySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const stored = await APIKeyStorage.loadSettings();
        setConfig(stored);
      } catch (error) {
        console.error('Failed to load API config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Update configuration
  const updateConfig = async (newConfig: APIKeySettings) => {
    try {
      await APIKeyStorage.saveSettings(newConfig);
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to save API config:', error);
      throw error;
    }
  };

  // Clear configuration
  const clearConfig = () => {
    APIKeyStorage.clearSettings();
    setConfig(null);
  };

  // Get API keys for the request
  const getAPIKeysForRequest = () => {
    if (!config) return undefined;
    
    return {
      openai: config.openaiKey,
      gemini: config.geminiKey,
      provider: config.selectedProvider
    };
  };

  // Check if configuration is valid using useMemo for proper reactivity
  const isConfigured = useMemo(() => {
    if (!config) {
      console.log('API Config Debug: No config found');
      return false;
    }
    
    const hasRequiredKey = config.selectedProvider === 'openai' 
      ? !!config.openaiKey 
      : !!config.geminiKey;
    
    console.log('API Config Debug:', {
      provider: config.selectedProvider,
      hasOpenAI: !!config.openaiKey,
      hasGemini: !!config.geminiKey,
      hasRequiredKey,
      configured: hasRequiredKey
    });
      
    return hasRequiredKey;
  }, [config]);

  return {
    config,
    isLoading,
    updateConfig,
    clearConfig,
    getAPIKeysForRequest,
    isConfigured
  };
};