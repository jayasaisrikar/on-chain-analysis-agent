"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Square, Paperclip, Mic, Smile } from 'lucide-react';
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/ui/model-selector";
import { APIKeyManager } from "@/components/ui/api-key-manager";
import { AIProvider } from '@/types/api-config';

interface ModernChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  onAbort?: () => void;
  placeholder?: string;
  disabled?: boolean;
  // New props for model and API key management
  selectedModel?: AIProvider;
  onModelChange?: (model: AIProvider) => void;
  onApiKeyUpdate?: (provider: AIProvider, apiKey: string, rememberKey: boolean) => void;
  hasValidApiKey?: boolean;
}

export function ModernChatInput({
  value,
  onChange,
  onSubmit,
  loading = false,
  onAbort,
  placeholder = "Ask about crypto tokens, DeFi protocols, or blockchain analysis...",
  disabled = false,
  selectedModel = 'openai',
  onModelChange = () => {},
  onApiKeyUpdate = () => {},
  hasValidApiKey = false
}: ModernChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && value.trim()) {
        onSubmit();
      }
    }
  };

  const handleSubmit = () => {
    if (!loading && value.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="p-2 border-t border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto">
        <Card className={cn(
          "relative overflow-hidden transition-all duration-300 bg-white/5 border-white/10 backdrop-blur-sm",
          isFocused ? "ring-2 ring-purple-500/30 shadow-xl shadow-purple-500/10 bg-white/8" : "shadow-md hover:bg-white/7",
          loading && "ring-2 ring-violet-500/40 animate-pulse"
        )}>
          {/* Top bar with model selector and API key */}
          <div className="flex items-center justify-between px-2.5 py-1 border-b border-white/5 bg-white/2">
            <ModelSelector
              selectedModel={selectedModel}
              onModelChange={onModelChange}
              disabled={disabled}
            />
            
            <APIKeyManager
              selectedProvider={selectedModel}
              onApiKeyUpdate={onApiKeyUpdate}
              disabled={disabled}
              hasValidKey={hasValidApiKey}
            />
          </div>
          
          <div className="flex items-end gap-2 p-1.5">

            {/* Text Input */}
            <div className="flex-1 min-w-0">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder}
                className="min-h-[28px] max-h-[80px] resize-none border-0 shadow-none focus-visible:ring-0 px-0 py-1 text-sm bg-transparent text-slate-100 placeholder:text-slate-400"
                disabled={disabled}
              />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Submit/Stop Button */}
              {loading ? (
                <Button
                  onClick={onAbort}
                  size="icon"
                  className="h-7 w-7 bg-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/30 transition-all duration-200 animate-pulse"
                >
                  <Square className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  size="icon"
                  disabled={!value.trim() || disabled}
                  className={cn(
                    "h-7 w-7 transition-all duration-200",
                    value.trim()
                      ? hasValidApiKey
                        ? "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-md shadow-purple-500/20"
                        : "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20"
                      : "bg-slate-700 text-slate-400 opacity-50"
                  )}
                  title={!hasValidApiKey ? "Set up API key first" : "Send message"}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500 opacity-60 rounded-b-lg">
              <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse rounded-b-lg" />
            </div>
          )}
        </Card>

        {/* Status indicator */}
        {!hasValidApiKey && (
          <div className="mt-1 px-1">
            <p className="text-xs text-amber-400/80 text-center">
              Click the key icon above to set up your API key
            </p>
          </div>
        )}
      </div>
    </div>
  );
}