"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Square, Paperclip, Mic, Smile } from 'lucide-react';
import { cn } from "@/lib/utils";

interface ModernChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  onAbort?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ModernChatInput({
  value,
  onChange,
  onSubmit,
  loading = false,
  onAbort,
  placeholder = "Ask about crypto tokens, DeFi protocols, or blockchain analysis...",
  disabled = false
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
    <div className="p-6 border-t border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl">
      <div className="max-w-4xl mx-auto">
        <Card className={cn(
          "relative overflow-hidden transition-all duration-300 bg-white/5 border-white/10 backdrop-blur-sm",
          isFocused ? "ring-2 ring-purple-500/30 shadow-2xl shadow-purple-500/10 scale-[1.02] bg-white/10" : "shadow-lg hover:bg-white/10",
          loading && "ring-2 ring-violet-500/40 animate-pulse"
        )}>
          <div className="flex items-end gap-3 p-4">
            {/* Attachment Button */}
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 h-10 w-10 text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 mb-1 transition-all duration-300"
              disabled={disabled}
            >
              <Paperclip className="h-5 w-5" />
            </Button>

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
                className="min-h-[44px] max-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0 px-0 py-3 text-base bg-transparent text-slate-100 placeholder:text-slate-400"
                disabled={disabled}
              />
              
              {/* Character Counter */}
              {value.length > 0 && (
                <div className="text-xs text-slate-400 mt-1 px-1">
                  {value.length} characters
                </div>
              )}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 flex-shrink-0 mb-1">
              {/* Emoji Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-300"
                disabled={disabled}
              >
                <Smile className="h-5 w-5" />
              </Button>

              {/* Voice Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-all duration-300"
                disabled={disabled}
              >
                <Mic className="h-5 w-5" />
              </Button>

              {/* Submit/Stop Button */}
              {loading ? (
                <Button
                  onClick={onAbort}
                  size="icon"
                  className="h-10 w-10 bg-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/30 transition-all duration-300 animate-pulse"
                >
                  <Square className="h-5 w-5" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  size="icon"
                  disabled={!value.trim() || disabled}
                  className={cn(
                    "h-10 w-10 transition-all duration-300",
                    value.trim() 
                      ? "bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white scale-100 shadow-lg shadow-purple-500/25" 
                      : "bg-slate-700 text-slate-400 scale-95 opacity-50"
                  )}
                >
                  <Send className="h-5 w-5" />
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

        {/* Helper Text */}
        <div className="mt-3 px-2">
          <p className="text-xs text-slate-400 text-center">
            Press <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-slate-300">Enter</kbd> to send, 
            <kbd className="px-2 py-1 bg-white/10 border border-white/20 rounded text-xs text-slate-300 ml-1">Shift + Enter</kbd> for new line
          </p>
        </div>
      </div>
    </div>
  );
}