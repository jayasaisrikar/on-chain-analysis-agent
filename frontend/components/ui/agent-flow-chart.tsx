"use client";

import React from 'react';
import { ArrowRight, ArrowDown, Radar, Activity, Search, Globe2, Brain, Network } from 'lucide-react';

export default function AgentFlowChart() {
  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Root Agent */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-2xl p-6 border border-purple-500/30 backdrop-blur-sm">
          <div className="flex items-center justify-center space-x-3">
            <Network className="h-8 w-8 text-purple-400" />
            <div>
              <h3 className="text-xl font-semibold text-white">Root Agent</h3>
              <p className="text-sm text-purple-300">Sequential Orchestrator</p>
            </div>
          </div>
        </div>
        <ArrowDown className="h-6 w-6 text-purple-400 mt-4 animate-bounce" />
      </div>

      {/* Research Agent Container */}
      <div className="bg-gradient-to-br from-blue-500/10 to-violet-500/10 rounded-3xl p-8 border border-blue-500/20 mb-8">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-white mb-2">Research Agent</h3>
          <p className="text-blue-300">Parallel Data Gathering</p>
        </div>

        {/* Sub-agents grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Token Detection Agent */}
          <div className="group relative bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-cyan-500/30 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 text-center">
              <Radar className="h-8 w-8 text-cyan-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white mb-2">Token Detection</h4>
              <p className="text-xs text-slate-300">Identifies crypto tokens from user query</p>
              <div className="mt-3 text-xs text-cyan-300">
                <div className="bg-cyan-500/20 rounded-full px-2 py-1 mb-1">keyword_matching</div>
              </div>
            </div>
          </div>

          {/* Market Data Agent */}
          <div className="group relative bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-green-500/30 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 text-center">
              <Activity className="h-8 w-8 text-green-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white mb-2">Market Data</h4>
              <p className="text-xs text-slate-300">CoinGecko real-time price & volume data</p>
              <div className="mt-3 text-xs text-green-300">
                <div className="bg-green-500/20 rounded-full px-2 py-1 mb-1">CoinGecko API</div>
              </div>
            </div>
          </div>

          {/* Synonym Generator Agent */}
          <div className="group relative bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-yellow-500/30 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 text-center">
              <Search className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white mb-2">Synonym Generator</h4>
              <p className="text-xs text-slate-300">Creates search queries for web research</p>
              <div className="mt-3 text-xs text-yellow-300">
                <div className="bg-yellow-500/20 rounded-full px-2 py-1 mb-1">query_expansion</div>
              </div>
            </div>
          </div>

          {/* Web Search Agent */}
          <div className="group relative bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:border-purple-500/30 transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10 text-center">
              <Globe2 className="h-8 w-8 text-purple-400 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white mb-2">Web Search</h4>
              <p className="text-xs text-slate-300">Tavily API for latest news & trends</p>
              <div className="mt-3 text-xs text-purple-300">
                <div className="bg-purple-500/20 rounded-full px-2 py-1 mb-1">Tavily Search</div>
              </div>
            </div>
          </div>
        </div>

        {/* Parallel execution indicator */}
        <div className="flex items-center justify-center space-x-2 text-blue-300 text-sm">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-200"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse delay-300"></div>
          </div>
          <span>Executing in Parallel</span>
        </div>
      </div>

      {/* Arrow to Analysis */}
      <div className="flex justify-center mb-8">
        <ArrowDown className="h-6 w-6 text-violet-400 animate-bounce" />
      </div>

      {/* Analysis Agent */}
      <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl p-8 border border-violet-500/30 backdrop-blur-sm text-center">
        <Brain className="h-12 w-12 text-violet-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">Analysis Agent</h3>
        <p className="text-violet-300 mb-4">AI-Powered Synthesis & Report Generation</p>
        
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-violet-400 font-semibold mb-1">Input Processing</div>
            <div className="text-slate-300 text-xs">Combines market data, search results & token info</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-violet-400 font-semibold mb-1">AI Analysis</div>
            <div className="text-slate-300 text-xs">LLM-powered correlation & insight generation</div>
          </div>
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-violet-400 font-semibold mb-1">Report Output</div>
            <div className="text-slate-300 text-xs">Structured markdown with risk assessment</div>
          </div>
        </div>
      </div>

      {/* Flow Legend */}
      <div className="mt-8 bg-slate-900/50 rounded-xl p-6 border border-slate-700/30">
        <h4 className="text-lg font-semibold text-white mb-4">Execution Flow</h4>
        <div className="grid md:grid-cols-2 gap-6 text-sm">
          <div>
            <h5 className="text-violet-400 font-medium mb-2">Sequential Pipeline</h5>
            <ul className="space-y-1 text-slate-300">
              <li>1. Root Agent receives user query</li>
              <li>2. Research Agent activates sub-agents</li>
              <li>3. Analysis Agent processes results</li>
              <li>4. Final report generated</li>
            </ul>
          </div>
          <div>
            <h5 className="text-blue-400 font-medium mb-2">Parallel Research</h5>
            <ul className="space-y-1 text-slate-300">
              <li>• All 4 sub-agents run simultaneously</li>
              <li>• Optimized for speed & efficiency</li>
              <li>• Session state maintains data flow</li>
              <li>• Error handling & fallbacks included</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}