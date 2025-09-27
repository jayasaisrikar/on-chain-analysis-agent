"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPanel, GlassBadge } from '../glass/GlassComponents';
import { Activity, Loader2, Zap } from 'lucide-react';
import { useRef, useEffect } from 'react';
import type { StepEvent } from '../AgentTimeline';
import { AgentTimeline } from '../AgentTimeline';

interface AgentExecutionPanelProps {
  events: StepEvent[];
  loading: boolean;
}

export function AgentExecutionPanel({ events, loading }: AgentExecutionPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [events]);

  return (
    <GlassPanel
      variant="premium"
      className="h-[600px] overflow-hidden"
      header={
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-3 rounded-xl bg-gradient-to-br from-accent-cyan-500/20 to-accent-cyan-600/30 border border-accent-cyan-400/30 backdrop-blur-sm">
              <Activity className="h-5 w-5 text-accent-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-base-100">Agent Execution</h3>
                {events.length > 0 && (
                  <GlassBadge variant="success" className="animate-pulse">
                    {events.length} step{events.length !== 1 ? 's' : ''}
                  </GlassBadge>
                )}
                {loading && (
                  <div className="flex items-center gap-2 text-accent-cyan-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Executing...</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-base-300 mt-1">Real-time agent activity</p>
            </div>
          </div>
        </div>
      }
    >
      <div className="h-[480px] flex flex-col -m-6">
        <motion.div
          className="flex-1 overflow-y-auto px-6 pt-6 pb-2 custom-scrollbar"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ 
            scrollbarWidth: 'thin', 
            scrollbarColor: 'rgba(34, 197, 94, 0.3) transparent' 
          }}
        >
        {events.length === 0 && !loading && (
          <motion.div 
            className="flex flex-col items-center justify-center h-full text-center space-y-8 px-8" 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-accent-cyan-500/30 to-accent-purple-500/30 flex items-center justify-center backdrop-blur-sm border border-accent-cyan-400/40 shadow-lg shadow-accent-cyan-500/20">
                <Activity className="h-12 w-12 text-accent-cyan-400" />
              </div>
              <div className="absolute -top-3 -right-3">
                <div className="w-8 h-8 bg-gradient-to-r from-accent-purple-400 to-accent-cyan-400 rounded-full animate-pulse shadow-lg shadow-accent-purple-400/30 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-4 max-w-md">
              <h3 className="text-xl font-semibold text-base-100">Awaiting Agent Activity</h3>
              <p className="text-base text-base-400 leading-relaxed">
                When you start an analysis, AI agents will execute tasks here in real-time. You'll see each step as it happens.
              </p>
              <div className="grid grid-cols-1 gap-2 mt-6 text-sm">
                <div className="flex items-center gap-2 text-base-300">
                  <div className="w-2 h-2 bg-accent-cyan-400 rounded-full"></div>
                  <span>Data collection</span>
                </div>
                <div className="flex items-center gap-2 text-base-300">
                  <div className="w-2 h-2 bg-accent-purple-400 rounded-full"></div>
                  <span>Analysis execution</span>
                </div>
                <div className="flex items-center gap-2 text-base-300">
                  <div className="w-2 h-2 bg-accent-primary-400 rounded-full"></div>
                  <span>Result generation</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
          <AgentTimeline events={events} />
          <div ref={bottomRef} />
        </motion.div>
      </div>
    </GlassPanel>
  );
}
