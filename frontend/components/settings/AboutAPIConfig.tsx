'use client';

import React from 'react';
import { Shield, Lock, Zap, Globe, CheckCircle, Info } from 'lucide-react';

const AboutAPIConfig: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Why This Approach */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
        <div className="flex items-center gap-3 mb-4">
          <Info className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-white">Why We Ask for Your API Keys</h3>
        </div>
        
        <p className="text-slate-300 text-sm leading-relaxed mb-4">
          This approach provides you with several key advantages over traditional cloud-based AI services:
        </p>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white text-sm">Complete Privacy</p>
                <p className="text-slate-400 text-xs">Your queries and data never leave your browser</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white text-sm">Direct API Access</p>
                <p className="text-slate-400 text-xs">Bypass rate limits and get faster responses</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Lock className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white text-sm">You Own Your Usage</p>
                <p className="text-slate-400 text-xs">Pay directly to AI providers, no markup</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Globe className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white text-sm">Provider Choice</p>
                <p className="text-slate-400 text-xs">Switch between OpenAI and Gemini freely</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Industry Standard Practice */}
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <h4 className="font-medium text-green-300">Industry Standard Practice</h4>
        </div>
        
        <p className="text-green-200/80 text-sm">
          This is a common and secure approach used by many professional AI applications. 
          Popular tools like ChatGPT Desktop, Raycast AI, and many developer tools follow this pattern.
        </p>
      </div>

      {/* Security Features */}
      <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
        <h4 className="font-medium text-white mb-3">Security Features</h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
            <span>AES-256 encryption for stored keys</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
            <span>Keys stored only in your browser's local storage</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
            <span>Optional 30-day auto-expiration</span>
          </div>
          <div className="flex items-center gap-2 text-slate-300">
            <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
            <span>Never transmitted to our servers</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutAPIConfig;