"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Brain, Layers, Activity, ArrowRight, Network, Radar, Search, Globe2 } from 'lucide-react';
import Link from 'next/link';
import AgentFlowChart from '@/components/ui/agent-flow-chart';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-purple-500/5 to-violet-500/5 rounded-full blur-3xl animate-spin-slow"></div>
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8B5CF6_1px,transparent_1px),linear-gradient(to_bottom,#8B5CF6_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-10"></div>

      <div className="relative z-10">
        {/* Navigation Bar */}
        <nav className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">On-Chain Analysis</h1>
                <p className="text-xs text-purple-300">AI-Powered Intelligence</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/chat">
                <Button variant="outline" className="hidden md:flex border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:border-purple-500/50">
                  Launch Agent
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              
              <Link href="/chat">
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-medium">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-12 pb-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30 mb-8">
              <Activity className="h-4 w-4 text-purple-400 mr-2" />
              <span className="text-purple-300 text-sm font-medium">Advanced AI-Driven Analytics</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-violet-200 bg-clip-text text-transparent mb-6 leading-tight">
              On-Chain Analysis Agent
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-8 font-light">
              The Foundation of Next-Generation Blockchain Intelligence
            </p>
            
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm px-4 py-2">
                Multi-Agent Architecture
              </Badge>
              <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-300 text-sm px-4 py-2">
                Real-Time Analysis
              </Badge>
              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-sm px-4 py-2">
                Lightning Fast
              </Badge>
            </div>

            {/* CTA Button */}
            <div className="mb-16">
              <Link href="/chat">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold px-8 py-4 text-lg">
                  Proceed to Agent
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-6 pb-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Feature 1 */}
            <div className="group relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-violet-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <Zap className="h-12 w-12 text-purple-400 mb-6" />
                <h3 className="text-xl font-semibold text-white mb-4">Parallel Execution</h3>
                <p className="text-slate-300 leading-relaxed">
                  Four specialized sub-agents run simultaneously, gathering token data, market metrics, and web intelligence in parallel for maximum efficiency.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-violet-500/30 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-blue-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <Brain className="h-12 w-12 text-violet-400 mb-6" />
                <h3 className="text-xl font-semibold text-white mb-4">AI-Powered Analysis</h3>
                <p className="text-slate-300 leading-relaxed">
                  Advanced LLM synthesizes multi-source data into actionable insights, risk assessments, and investment recommendations with reasoning.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <Network className="h-12 w-12 text-blue-400 mb-6" />
                <h3 className="text-xl font-semibold text-white mb-4">Sequential Orchestration</h3>
                <p className="text-slate-300 leading-relaxed">
                  Root agent coordinates research and analysis phases with state management, ensuring data flows seamlessly between agents.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Agent Architecture Flow */}
        <section className="container mx-auto px-6 pb-20">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">Agent Architecture</h2>
            <p className="text-xl text-slate-300">
              Sequential orchestration with parallel research execution
            </p>
          </div>

          <AgentFlowChart />
        </section>

        {/* Technical Capabilities */}
        <section className="container mx-auto px-6 pb-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-6">Technical Capabilities</h2>
              <p className="text-xl text-slate-300">
                Built on IQAI Agent Development Kit with enterprise-grade tools
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Token Detection */}
              <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-6 border border-cyan-500/20">
                <Radar className="h-10 w-10 text-cyan-400 mb-4" />
                <h4 className="text-white font-semibold mb-3">Token Detection</h4>
                <ul className="text-slate-300 text-sm space-y-2">
                  <li>• Keyword matching algorithm</li>
                  <li>• Crypto symbol recognition</li>
                  <li>• Fallback to Bitcoin default</li>
                  <li>• Confidence scoring</li>
                </ul>
              </div>

              {/* Market Data */}
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-6 border border-green-500/20">
                <Activity className="h-10 w-10 text-green-400 mb-4" />
                <h4 className="text-white font-semibold mb-3">Market Data</h4>
                <ul className="text-slate-300 text-sm space-y-2">
                  <li>• CoinGecko API integration</li>
                  <li>• Real-time price & volume</li>
                  <li>• Market cap calculations</li>
                  <li>• 24h change tracking</li>
                </ul>
              </div>

              {/* Web Search */}
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-6 border border-purple-500/20">
                <Globe2 className="h-10 w-10 text-purple-400 mb-4" />
                <h4 className="text-white font-semibold mb-3">Web Research</h4>
                <ul className="text-slate-300 text-sm space-y-2">
                  <li>• Tavily Search API</li>
                  <li>• Latest news & trends</li>
                  <li>• Content summarization</li>
                  <li>• Source credibility scoring</li>
                </ul>
              </div>

              {/* AI Analysis */}
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-xl p-6 border border-violet-500/20">
                <Brain className="h-10 w-10 text-violet-400 mb-4" />
                <h4 className="text-white font-semibold mb-3">AI Analysis</h4>
                <ul className="text-slate-300 text-sm space-y-2">
                  <li>• LLM-powered synthesis</li>
                  <li>• Risk assessment (1-10 scale)</li>
                  <li>• Investment recommendations</li>
                  <li>• Structured markdown reports</li>
                </ul>
              </div>
            </div>

            {/* Architecture Benefits */}
            <div className="mt-12 bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-2xl p-8 border border-slate-600/30">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Architecture Benefits</h3>
                  <ul className="space-y-3 text-slate-300">
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-violet-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Parallel Efficiency:</strong> Research agents execute simultaneously for 4x faster data gathering</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>State Management:</strong> Session-scoped data flow ensures consistent analysis context</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Error Resilience:</strong> Graceful handling of missing data and API failures</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Output Format</h3>
                  <ul className="space-y-3 text-slate-300">
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-cyan-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Executive Summary:</strong> Key insights and investment thesis</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Market Analysis:</strong> Price trends and volume indicators</span>
                    </li>
                    <li className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span><strong>Risk Profile:</strong> Quantified risk assessment with scenarios</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="container mx-auto px-6 pb-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="bg-gradient-to-r from-purple-500/10 to-violet-500/10 rounded-3xl p-12 border border-purple-500/20 backdrop-blur-sm">
              <h2 className="text-3xl font-bold text-white mb-6">
                The Blueprint for Intelligent Token Research
              </h2>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Experience the future of blockchain intelligence. Start analyzing tokens with AI-powered insights today.
              </p>
              <Link href="/chat">
                <Button size="lg" className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold px-8 py-3">
                  Proceed to Agent
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-gradient-to-r from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-8">
            <div className="grid md:grid-cols-4 gap-6 mb-6">
              {/* Brand Section */}
              <div className="md:col-span-2">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg flex items-center justify-center">
                    <Activity className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">On-Chain Analysis Agent</h3>
                    <p className="text-xs text-purple-300">AI-Powered Blockchain Intelligence</p>
                  </div>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed mb-3 max-w-sm">
                  Advanced multi-agent system for cryptocurrency analysis with real-time market data.
                </p>
                <div className="flex space-x-2">
                  <Badge variant="outline" className="border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs px-2 py-1">
                    TypeScript
                  </Badge>
                  <Badge variant="outline" className="border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs px-2 py-1">
                    Next.js
                  </Badge>
                  <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300 text-xs px-2 py-1">
                    IQAI ADK
                  </Badge>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h4 className="text-white font-semibold mb-3 text-sm">Product</h4>
                <ul className="space-y-1 text-xs">
                  <li><Link href="/chat" className="text-slate-300 hover:text-purple-300 transition-colors">Launch Agent</Link></li>
                  <li><Link href="#features" className="text-slate-300 hover:text-purple-300 transition-colors">Features</Link></li>
                  <li><Link href="#architecture" className="text-slate-300 hover:text-purple-300 transition-colors">Architecture</Link></li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h4 className="text-white font-semibold mb-3 text-sm">Resources</h4>
                <ul className="space-y-1 text-xs">
                  <li><a href="#" className="text-slate-300 hover:text-purple-300 transition-colors">Documentation</a></li>
                  <li><a href="#" className="text-slate-300 hover:text-purple-300 transition-colors">GitHub</a></li>
                  <li><a href="#" className="text-slate-300 hover:text-purple-300 transition-colors">Support</a></li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-4 border-t border-white/10">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="text-xs text-slate-400 mb-2 md:mb-0">
                  © 2025 On-Chain Analysis Agent
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <span className="text-slate-400">Powered by</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-violet-500 rounded"></div>
                    <span className="text-slate-300 font-medium">CoinGecko</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-cyan-500 rounded"></div>
                    <span className="text-slate-300 font-medium">Tavily</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
