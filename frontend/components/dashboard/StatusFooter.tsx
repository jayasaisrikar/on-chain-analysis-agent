"use client";
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassBadge } from '../glass/GlassComponents';
import { Activity, MessageSquare, Loader2, Zap, Shield } from 'lucide-react';

interface StatusFooterProps {
  eventsCount: number;
  messagesCount: number;
  loading: boolean;
}

export function StatusFooter({ eventsCount, messagesCount, loading }: StatusFooterProps) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 1.0 }}>
      <GlassCard variant="subtle" className="mt-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <AnimatePresence>
              {eventsCount > 0 && (
                <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Activity className="h-4 w-4 text-accent-cyan-400" />
                  <span className="text-body-sm text-base-300">{eventsCount} agent events</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {messagesCount > 0 && (
                <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <MessageSquare className="h-4 w-4 text-accent-primary-400" />
                  <span className="text-body-sm text-base-300">{messagesCount} messages</span>
                </motion.div>
              )}
            </AnimatePresence>
            <AnimatePresence>
              {loading && (
                <motion.div className="flex items-center gap-2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <Loader2 className="h-4 w-4 animate-spin text-accent-cyan-400" />
                  <span className="text-body-sm text-base-300">Analysis in progress</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-3">
            <GlassBadge variant="default" className="flex items-center gap-2">
              <Zap className="h-3 w-3" />
              Made with IQAI ADK-TS
            </GlassBadge>
            <div className="flex items-center gap-2 text-body-sm text-base-400">
              <Shield className="h-4 w-4" />
              <span>Secure & Private</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
