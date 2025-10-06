"use client";

import { motion } from 'framer-motion';
import { GlassCard, GlassBadge } from '../glass/GlassComponents';
import { TrendingUp, Clock } from 'lucide-react';
import { useClock } from '../hooks/useClock';
import { useHeaderVisibility } from '../hooks/useHeaderVisibility';
import SettingsButton from '../settings/SettingsButton';
import type { AppConfig } from '../../types/app-config';
import { shouldShowSettings, defaultAppConfig } from '../../types/app-config';

interface MarketStatusBarProps {
  appConfig?: Partial<AppConfig>;
}

export function MarketStatusBar({ appConfig }: MarketStatusBarProps) {
  const nowTime = useClock();
  const headerVisible = useHeaderVisibility();

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: headerVisible ? 0 : -100, opacity: headerVisible ? 1 : 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="relative z-20 sticky top-0"
    >
      <GlassCard
        variant="premium"
        padding="none"
        className="mx-auto my-4 max-w-6xl overflow-hidden rounded-full border border-white/20 bg-gradient-to-r from-white/5 via-white/10 to-white/5 shadow-2xl backdrop-blur-3xl"
      >
        <div className="relative px-6 py-4">
          <div className="absolute inset-0 bg-gradient-to-r from-accent-primary-500/5 via-accent-cyan-500/5 to-accent-purple-500/5 animate-pulse" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-10">
            
            {/* Left Section: Icon + Title */}
            <motion.div
              className="flex items-center gap-4 md:gap-6"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.2 }}
            >
              <div className="relative">
                <div className="flex items-center justify-center p-2 rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/30 to-emerald-400/20 backdrop-blur-sm">
                  <TrendingUp className="h-5 w-5 text-emerald-300" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50" />
              </div>
              <div className="flex flex-col">
                <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-300 to-emerald-100 bg-clip-text text-transparent">
                  On Chain Analysis Agent
                </h2>
                <p className="text-xs font-medium text-base-400">
                  Real-time cryptocurrency data
                </p>
              </div>
            </motion.div>

            {/* Right Section: Clock + Settings + Live Badge */}
            <div className="flex items-center gap-3 md:gap-4 flex-wrap">
              <motion.div
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20"
                whileHover={{ scale: 1.02 }}
              >
                <Clock className="h-5 w-5 text-accent-cyan-400" />
                <span suppressHydrationWarning className="text-sm font-medium text-base-200">
                  {nowTime}
                </span>
              </motion.div>

              {shouldShowSettings({ ...defaultAppConfig, ...appConfig }) && (
                <SettingsButton className="text-xs" />
              )}

              <GlassBadge
                variant="success"
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold"
              >
                <motion.div
                  className="relative w-3 h-3"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                >
                  <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full" />
                </motion.div>
                Live Data
              </GlassBadge>
            </div>

          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
