"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel, GlassBadge, GlassCard } from '../glass/GlassComponents';
import { MessageSquare, Zap, Bot, User, Loader2 } from 'lucide-react';
import { useRef, useEffect } from 'react';
import type { ChatMessage } from '../hooks/useStreamingAnalysis';

interface ChatPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  typingEffect: boolean;
}

export function ChatPanel({ messages, loading, typingEffect }: ChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <GlassPanel
      variant="premium"
      className="h-[600px] overflow-hidden"
      header={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-3 rounded-xl bg-gradient-to-br from-accent-primary-500/20 to-accent-primary-600/30 border border-accent-primary-400/30 backdrop-blur-sm">
              <MessageSquare className="h-5 w-5 text-accent-primary-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-base-100">Conversation</h3>
                {messages.length > 0 && (
                  <GlassBadge variant="primary" className="animate-pulse">
                    {messages.length} message{messages.length !== 1 ? 's' : ''}
                  </GlassBadge>
                )}
                {loading && (
                  <div className="flex items-center gap-2 text-accent-primary-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-base-300 mt-1">AI-powered chat interface</p>
            </div>
          </div>
        </div>
      }
    >
      <div className="h-[480px] flex flex-col -m-6">
        <motion.div 
          className="flex-1 overflow-y-auto space-y-6 px-6 pt-6 pb-2 custom-scrollbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ 
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(99, 102, 241, 0.3) transparent'
          }}
        >
            {messages.length === 0 && !loading && (
              <motion.div 
                className="flex flex-col items-center justify-center h-full text-center space-y-8 px-8" 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent-primary-500/30 to-accent-cyan-500/30 flex items-center justify-center backdrop-blur-sm border border-accent-primary-400/40 shadow-lg shadow-accent-primary-500/20">
                    <MessageSquare className="h-12 w-12 text-accent-primary-400" />
                  </div>
                  <div className="absolute -top-3 -right-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-accent-cyan-400 to-accent-primary-400 rounded-full animate-pulse shadow-lg shadow-accent-cyan-400/30 flex items-center justify-center">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4 max-w-md">
                  <h3 className="text-xl font-semibold text-base-100">Start Your Crypto Analysis</h3>
                  <p className="text-base text-base-400 leading-relaxed">
                    Ask me anything about cryptocurrencies, market trends, or blockchain analysis. I'm here to help you make informed decisions.
                  </p>
                  <div className="grid grid-cols-1 gap-2 mt-6 text-sm">
                    <div className="flex items-center gap-2 text-base-300">
                      <div className="w-2 h-2 bg-accent-primary-400 rounded-full"></div>
                      <span>Real-time market analysis</span>
                    </div>
                    <div className="flex items-center gap-2 text-base-300">
                      <div className="w-2 h-2 bg-accent-cyan-400 rounded-full"></div>
                      <span>Portfolio insights</span>
                    </div>
                    <div className="flex items-center gap-2 text-base-300">
                      <div className="w-2 h-2 bg-accent-purple-400 rounded-full"></div>
                      <span>Trading recommendations</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {messages.map((msg, index) => (
                <motion.div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ 
                    duration: 0.4, 
                    delay: index * 0.03,
                    ease: "easeOut"
                  }}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple-500/30 to-accent-primary-500/30 flex items-center justify-center border border-accent-purple-400/40 backdrop-blur-sm shadow-sm">
                      <Bot className="h-5 w-5 text-accent-purple-400" />
                    </div>
                  )}
                  <motion.div 
                    className={`max-w-[75%] ${msg.role === 'user' ? 'order-1' : ''}`} 
                    whileHover={{ scale: 1.01 }} 
                    transition={{ duration: 0.2 }}
                  >
                    <GlassCard 
                      variant={msg.role === 'user' ? 'premium' : 'default'} 
                      className={`p-5 ${
                        msg.role === 'user' 
                          ? 'bg-gradient-to-br from-accent-primary-500/25 to-accent-cyan-500/25 border-accent-primary-400/40 shadow-lg shadow-accent-primary-500/10' 
                          : 'bg-gradient-to-br from-white/8 to-white/12 border-white/25 shadow-sm'
                      }`}
                    >
                      <p className="text-base leading-relaxed text-base-100 whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      {msg.timestamp && (
                        <time className="block mt-4 text-xs text-base-400 font-mono opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </time>
                      )}
                    </GlassCard>
                  </motion.div>
                  {msg.role === 'user' && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-accent-primary-500/30 to-accent-cyan-500/30 flex items-center justify-center border border-accent-primary-400/40 backdrop-blur-sm shadow-sm">
                      <User className="h-5 w-5 text-accent-primary-400" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && typingEffect && (
              <motion.div 
                className="flex gap-4 justify-start mb-6" 
                initial={{ opacity: 0, y: 20, scale: 0.95 }} 
                animate={{ opacity: 1, y: 0, scale: 1 }} 
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4 }}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-accent-purple-500/30 to-accent-primary-500/30 flex items-center justify-center border border-accent-purple-400/40 backdrop-blur-sm shadow-sm">
                  <Bot className="h-5 w-5 text-accent-purple-400" />
                </div>
                <GlassCard className="p-5 max-w-[75%] bg-gradient-to-br from-white/8 to-white/12 border-white/25">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Loader2 className="h-5 w-5 animate-spin text-accent-primary-400" />
                      <div className="absolute inset-0 rounded-full border-2 border-accent-primary-400/20 animate-ping"></div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-base text-base-100">Analyzing your request...</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-accent-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-accent-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-accent-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          <div ref={bottomRef} />
        </motion.div>
      </div>
    </GlassPanel>
  );
}
