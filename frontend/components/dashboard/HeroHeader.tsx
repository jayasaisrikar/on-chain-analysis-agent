"use client";
import { motion } from 'framer-motion';
import { GlassBadge } from '../glass/GlassComponents';
import { Sparkles, Shield, Zap, Star, BarChart3 } from 'lucide-react';

export function HeroHeader() {
  return (
    <motion.div 
      className="text-center space-y-8 relative"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-r from-accent-primary-500/10 to-accent-cyan-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -top-10 -right-32 w-60 h-60 bg-gradient-to-r from-accent-purple-500/10 to-accent-primary-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

      <div className="space-y-6 relative z-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-accent-primary-500/20 to-accent-cyan-500/20 border border-accent-primary-400/30 backdrop-blur-sm">
            <Sparkles className="h-5 w-5 text-accent-primary-400 animate-pulse" />
            <span className="text-body font-medium text-accent-primary-200">Next-Gen Crypto Intelligence</span>
          </div>
          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black bg-gradient-to-r from-white via-accent-primary-200 to-accent-cyan-300 bg-clip-text text-transparent leading-tight tracking-tight">
            Crypto Analysis
            <br />
            <span className="bg-gradient-to-r from-accent-cyan-300 via-accent-purple-300 to-accent-primary-300 bg-clip-text text-transparent">
              Agent
            </span>
          </h1>
        </motion.div>

        <motion.div 
          className="flex items-center justify-center gap-3 flex-wrap"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          <GlassBadge variant="primary" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            <Shield className="h-4 w-4" />
            Enterprise Security
          </GlassBadge>
          <GlassBadge variant="success" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            <Zap className="h-4 w-4" />
            AI-Powered Analytics
          </GlassBadge>
          <GlassBadge variant="default" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            <Star className="h-4 w-4" />
            Real-time Data
          </GlassBadge>
          <GlassBadge variant="default" className="flex items-center gap-2 px-4 py-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4" />
            Deep Insights
          </GlassBadge>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="max-w-4xl mx-auto space-y-4"
      >
        <p className="text-xl md:text-2xl font-light text-base-200 leading-relaxed">
          Harness the power of <span className="font-semibold text-accent-primary-300">intelligent multi-agent systems</span> for 
          comprehensive on-chain analysis.
        </p>
        <p className="text-lg text-base-400 leading-relaxed max-w-2xl mx-auto">
          Advanced cryptocurrency research, market analysis, and DeFi insights delivered with unprecedented speed and accuracy.
        </p>
      </motion.div>
    </motion.div>
  );
}
