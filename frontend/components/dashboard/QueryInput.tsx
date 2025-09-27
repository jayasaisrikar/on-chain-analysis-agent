"use client";
import { FormEvent, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassButton } from '../glass/GlassComponents';
import { Sparkles, ArrowRight, RefreshCw, Trash2, MessageSquare, Layers, Wand2, TrendingUp } from 'lucide-react';

const exampleQueries = [
  { text: 'Analyze BTC and ETH market trends', icon: TrendingUp },
  { text: 'Research SOLANA ecosystem tokens', icon: Sparkles },
  { text: 'Compare MATIC vs ARBITRUM', icon: Layers },
  { text: 'Analyze CHAINLINK price action', icon: Wand2 }
];

interface QueryInputProps {
  input: string;
  setInput: (v: string) => void;
  loading: boolean;
  hasMessages: boolean;
  onRun: () => void;
  onClear: () => void;
}

export function QueryInput({ input, setInput, loading, hasMessages, onRun, onClear }: QueryInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = textareaRef.current; 
    if (!el) return; 
    el.style.height = 'auto'; 
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  const submit = (e: FormEvent) => { e.preventDefault(); onRun(); };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.6, delay: 0.4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <GlassCard variant="premium" className="p-6 md:p-8 transition-all duration-300 hover:shadow-glass">
        <form onSubmit={submit} className="space-y-6">
          {/* Header Section */}
          <div className="text-center space-y-3">
            <motion.div 
              className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-gradient-to-r from-accent-primary-500/20 to-accent-purple-500/20 border border-accent-primary-400/30"
              animate={{ scale: isHovered ? 1.02 : 1 }}
              transition={{ duration: 0.2 }}
            >
              <Sparkles className="h-5 w-5 text-accent-primary-400" />
              <span className="text-sm font-semibold text-accent-primary-200">AI Crypto Analysis</span>
            </motion.div>
            <h3 className="text-lg font-semibold text-base-100">What would you like to analyze?</h3>
            <p className="text-base-400 text-sm">Ask questions about crypto markets, tokens, or trading strategies</p>
          </div>

          {/* Input Section */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative group">
              <motion.div
                className={`relative rounded-2xl transition-all duration-300 ${
                  isFocused 
                    ? 'ring-2 ring-accent-primary-400/60 shadow-glow-primary' 
                    : 'hover:shadow-md'
                }`}
                animate={{ scale: isFocused ? 1.01 : 1 }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onRun(); }
                    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setInput(''); }
                  }}
                  aria-label="Analysis query input"
                  placeholder="Enter tokens to analyze or ask a question... (Shift+Enter = newline)"
                  disabled={loading}
                  rows={1}
                  className={`w-full resize-none pl-14 pr-4 py-4 rounded-2xl bg-white/5 border border-white/10 focus:outline-none text-base-100 placeholder:text-base-400 font-medium leading-relaxed transition-all duration-300 ${
                    isFocused 
                      ? 'border-accent-primary-400/50 bg-white/10' 
                      : 'hover:border-white/20 hover:bg-white/8'
                  }`}
                />
                <MessageSquare className={`absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 transition-all duration-300 ${
                  isFocused ? 'text-accent-primary-400 scale-110' : 'text-accent-primary-400/70'
                }`} />
                
                {/* Character count indicator */}
                {input.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute bottom-2 right-3 text-xs text-base-500"
                  >
                    {input.length}/500
                  </motion.div>
                )}
              </motion.div>
            </div>
            {/* Action Buttons */}
            <div className="flex gap-3 items-center">
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="stop"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                  >
                    <GlassButton 
                      variant="danger" 
                      size="md" 
                      onClick={onClear} 
                      className="px-4 py-2.5 font-medium inline-flex items-center"
                    >
                      <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
                      Stop
                    </GlassButton>
                  </motion.div>
                ) : (
                  <motion.div
                    key="analyze"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                  >
                    <GlassButton 
                      variant="primary" 
                      size="md" 
                      disabled={!input.trim()} 
                      onClick={onRun} 
                      className="px-4 py-2.5 font-medium bg-gradient-to-r from-accent-primary-600/30 to-accent-purple-600/30 hover:from-accent-primary-500/40 hover:to-accent-purple-500/40 border-accent-primary-400/40 inline-flex items-center"
                    >
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Analyze
                    </GlassButton>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <GlassButton 
                  variant="default" 
                  size="md" 
                  disabled={loading || !hasMessages} 
                  onClick={onClear} 
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 inline-flex items-center"
                >
                  <Trash2 className="h-4 w-4" />
                </GlassButton>
              </motion.div>
            </div>
          </div>
          {/* Quick Examples Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 justify-center">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <Layers className="h-4 w-4 text-accent-primary-400" />
                <span className="text-sm font-medium text-base-300">Quick Examples</span>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {exampleQueries.map((query, idx) => {
                const IconComponent = query.icon;
                return (
                  <motion.button
                    key={idx}
                    type="button"
                    onClick={() => setInput(query.text)}
                    disabled={loading}
                    className="group relative p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent-primary-400/30 transition-all duration-300 text-left"
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + idx * 0.1 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-primary-500/20 flex items-center justify-center group-hover:bg-accent-primary-500/30 transition-colors">
                        <IconComponent className="h-4 w-4 text-accent-primary-400" />
                      </div>
                      <span className="text-sm font-medium text-base-200 group-hover:text-base-100 transition-colors">
                        {query.text}
                      </span>
                    </div>
                    
                    {/* Hover effect */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-accent-primary-500/5 to-accent-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </motion.button>
                );
              })}
            </div>
            
            {/* Keyboard shortcuts hint */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="flex items-center justify-center gap-4 text-xs text-base-500"
            >
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-xs">⏎</kbd>
                <span>Send</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-xs">⇧</kbd>
                <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-xs">⏎</kbd>
                <span>New line</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-xs">⌘</kbd>
                <kbd className="px-2 py-1 bg-white/10 rounded border border-white/20 font-mono text-xs">K</kbd>
                <span>Clear</span>
              </div>
            </motion.div>
          </div>
        </form>
      </GlassCard>
    </motion.div>
  );
}
