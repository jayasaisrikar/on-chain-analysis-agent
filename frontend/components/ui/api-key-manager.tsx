"use client";

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Settings, Check, X, AlertCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AIProvider, APIKeySettings } from '@/types/api-config';
import APIKeyStorage from '@/utils/api-key-storage';

interface APIKeyManagerProps {
  selectedProvider: AIProvider;
  onApiKeyUpdate: (provider: AIProvider, apiKey: string, rememberKey: boolean) => void;
  disabled?: boolean;
  hasValidKey?: boolean;
  className?: string;
}

export function APIKeyManager({ 
  selectedProvider, 
  onApiKeyUpdate, 
  disabled = false,
  hasValidKey = false,
  className
}: APIKeyManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [currentKey, setCurrentKey] = useState('');
  const [rememberKey, setRememberKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  // Load stored settings when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadStoredSettings();
    }
  }, [isOpen, selectedProvider]);

  const loadStoredSettings = async () => {
    try {
      const settings = await APIKeyStorage.loadSettings();
      if (settings) {
        const key = selectedProvider === 'openai' ? settings.openaiKey : settings.geminiKey;
        setCurrentKey(key || '');
        setRememberKey(settings.rememberKeys);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const validateApiKey = async (key: string): Promise<boolean> => {
    if (!key.trim()) return false;
    
    setIsValidating(true);
    setValidationStatus('idle');
    
    try {
      // Simple validation based on key format
      let isValid = false;
      
      if (selectedProvider === 'openai') {
        isValid = key.startsWith('sk-') && key.length > 20;
      } else if (selectedProvider === 'gemini') {
        isValid = key.length > 20 && !key.includes(' ');
      }
      
      // Simulate API validation delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setValidationStatus(isValid ? 'valid' : 'invalid');
      return isValid;
    } catch (error) {
      setValidationStatus('invalid');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  const handleSave = async () => {
    if (!currentKey.trim()) return;

    const isValid = await validateApiKey(currentKey);
    if (!isValid) return;

    try {
      // Save to storage
      const settings: APIKeySettings = {
        selectedProvider,
        rememberKeys: rememberKey,
        [selectedProvider === 'openai' ? 'openaiKey' : 'geminiKey']: currentKey
      };
      
      await APIKeyStorage.saveSettings(settings);
      
      // Notify parent
      onApiKeyUpdate(selectedProvider, currentKey, rememberKey);
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save API key:', error);
    }
  };

  const handleKeyChange = (value: string) => {
    setCurrentKey(value);
    setValidationStatus('idle');
  };

  const getProviderInfo = () => {
    switch (selectedProvider) {
      case 'openai':
        return {
          name: 'OpenAI',
          placeholder: 'sk-...',
          description: 'Enter your OpenAI API key from platform.openai.com'
        };
      case 'gemini':
        return {
          name: 'Google Gemini',
          placeholder: 'AI...',
          description: 'Enter your Gemini API key from Google AI Studio'
        };
      default:
        return {
          name: 'API Key',
          placeholder: 'Enter API key...',
          description: 'Enter your API key'
        };
    }
  };

  const providerInfo = getProviderInfo();

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          className={cn(
            "h-6 w-6 p-0 transition-all duration-200 rounded",
            hasValidKey 
              ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10" 
              : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10",
            className
          )}
        >
          <Key className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md bg-slate-800/95 border-white/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-200">
            <Key className="h-5 w-5 text-purple-400" />
            {providerInfo.name} API Key
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            {providerInfo.description}
          </p>
          
          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={currentKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={providerInfo.placeholder}
                className="pr-10 bg-slate-700/50 border-white/10 text-slate-200 placeholder:text-slate-400"
              />
              
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {/* Validation Status */}
            {validationStatus !== 'idle' && (
              <div className={cn(
                "flex items-center gap-2 text-xs",
                validationStatus === 'valid' ? "text-emerald-400" : "text-red-400"
              )}>
                {validationStatus === 'valid' ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3" />
                )}
                {validationStatus === 'valid' ? 'Key format is valid' : 'Invalid key format'}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="remember"
              checked={rememberKey}
              onChange={(e) => setRememberKey(e.target.checked)}
              className="rounded border-white/20 bg-slate-700 text-purple-500 focus:ring-purple-500 focus:ring-offset-0"
            />
            <label htmlFor="remember" className="text-sm text-slate-300">
              Remember this key (stored securely in browser)
            </label>
          </div>
          
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <AlertCircle className="h-3 w-3" />
              <span>Keys are encrypted and stored locally in your browser only</span>
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1 border-white/10 text-slate-300 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!currentKey.trim() || isValidating || validationStatus === 'invalid'}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isValidating ? 'Validating...' : 'Save Key'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}