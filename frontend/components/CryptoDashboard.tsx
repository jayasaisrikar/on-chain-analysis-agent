"use client";
// Orchestrator component with scroll animations
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { MarketStatusBar } from './dashboard/MarketStatusBar';
import { HeroHeader } from './dashboard/HeroHeader';
import { QueryInput } from './dashboard/QueryInput';
import { ChatPanel } from './dashboard/ChatPanel';
import { AgentExecutionPanel } from './dashboard/AgentExecutionPanel';
import { AnalysisReportPanel } from './dashboard/AnalysisReportPanel';
import { StatusFooter } from './dashboard/StatusFooter';
import { ToastNotice } from './dashboard/ToastNotice';
import { useStreamingAnalysis } from './hooks/useStreamingAnalysis';
import { useAPIConfig } from '../hooks/useAPIConfig';
import APISetupNotification from './notifications/APISetupNotification';
import type { StepEvent } from './AgentTimeline';
import { AppConfig, defaultAppConfig, shouldUseEnvKeys, shouldShowSettings } from '../types/app-config';

interface Toast { id: string; message: string }

interface CryptoDashboardProps {
  appConfig?: Partial<AppConfig>;
}

// Custom hook for scroll animations
function useScrollAnimation() {
  const visibleSections = new Set<string>(['hero', 'query', 'chat', 'analysis', 'footer']);
  const registerSection = (_id: string) => (_el: HTMLElement | null) => {};
  return { visibleSections, registerSection };
}

export default function CryptoDashboard({ appConfig = {} }: CryptoDashboardProps) {
  const appConfiguration = { ...defaultAppConfig, ...appConfig };
  const { config, isConfigured, getAPIKeysForRequest } = useAPIConfig();
  const { messages, events, report, loading, typingEffect, run, clear, sessionId, clearSession } = useStreamingAnalysis({
    onError: (err: Error) => console.error('analysis error', err),
    apiKeys: shouldUseEnvKeys(appConfiguration, isConfigured) ? undefined : getAPIKeysForRequest()
  });
  const [input, setInput] = useState('Provide analysis for DOGE and LOKA.');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const { visibleSections, registerSection } = useScrollAnimation();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const timelineEvents: StepEvent[] = useMemo(() => {
    return (events as any[]).filter(e => e && e.id && e.agent && e.message && e.type && e.ts);
  }, [events]);

  const copyReport = useCallback(async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setToast({ id: crypto.randomUUID(), message: 'Report copied to clipboard' });
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('copy failed', e);
    }
  }, [report]);

  const downloadReport = useCallback(() => {
    if (!report) return;
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto-analysis-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setToast({ id: crypto.randomUUID(), message: 'Download started' });
  }, [report]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const runAnalysis = useCallback(() => {
    if (!input.trim()) return;
    
    const useEnvKeys = shouldUseEnvKeys(appConfiguration, isConfigured);
    
    console.log('Analysis Config:', { 
      appConfiguration, 
      isConfigured, 
      useEnvKeys,
      showSettings: shouldShowSettings(appConfiguration)
    });
    
    if (!useEnvKeys && !isConfigured) {
      setToast({ 
        id: crypto.randomUUID(), 
        message: 'Please configure your API keys in Settings before running analysis.' 
      });
      return;
    }
    
    run(input);
    setInput('');
  }, [run, input, isConfigured, appConfiguration]);

  const clearAll = useCallback(() => {
    clear();
    setInput('');
  }, [clear]);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Navbar - Fixed, always visible */}
      <div className={`sticky top-0 z-50 transition-opacity duration-500 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
        <APISetupNotification />
        <MarketStatusBar appConfig={appConfiguration} />
      </div>
      
      <div className={`container mx-auto px-6 space-y-16 max-w-7xl transition-all duration-300 ${!isConfigured ? 'pt-8 pb-16' : 'pt-4 pb-16'}`}>
        {/* Hero Section */}
        <section
          ref={registerSection('hero')}
          data-section="hero"
          className={`transition-all duration-700 ease-out will-change-transform ${
            visibleSections.has('hero')
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-12'
          }`}
        >
          <HeroHeader />
        </section>

        {/* Query Input Section */}
        <section
          ref={registerSection('query')}
          data-section="query"
          className={`transition-all duration-700 ease-out will-change-transform ${
            visibleSections.has('query')
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-12'
          }`}
          style={{ transitionDelay: visibleSections.has('query') ? '100ms' : '0ms' }}
        >
          <QueryInput
            input={input}
            setInput={setInput}
            loading={loading}
            hasMessages={messages.length > 0}
            onRun={runAnalysis}
            onClear={clearAll}
            sessionId={sessionId}
            clearSession={clearSession}
          />
        </section>

        {/* Chat Panel Section */}
        <section
          ref={registerSection('chat')}
          data-section="chat"
          className={`transition-all duration-700 ease-out will-change-transform ${
            visibleSections.has('chat')
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-12'
          }`}
          style={{ transitionDelay: visibleSections.has('chat') ? '100ms' : '0ms' }}
        >
          <ChatPanel messages={messages} loading={loading} typingEffect={typingEffect} />
        </section>

        {/* Agent & Report Section - Grouped together */}
        <section
          ref={registerSection('analysis')}
          data-section="analysis"
          className="space-y-8"
        >
          <div 
            className={`transition-all duration-700 ease-out will-change-transform ${
              visibleSections.has('analysis')
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: visibleSections.has('analysis') ? '100ms' : '0ms' }}
          >
            <AgentExecutionPanel events={timelineEvents} loading={loading} />
          </div>
          
          <div 
            className={`transition-all duration-700 ease-out will-change-transform ${
              visibleSections.has('analysis')
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-12'
            }`}
            style={{ transitionDelay: visibleSections.has('analysis') ? '100ms' : '0ms' }}
          >
            <AnalysisReportPanel
              report={report}
              loading={loading}
              copied={copied}
              onCopy={copyReport}
              onDownload={downloadReport}
            />
          </div>
        </section>

        {/* Footer Section */}
        <section
          ref={registerSection('footer')}
          data-section="footer"
          className={`transition-all duration-700 ease-out will-change-transform ${
            visibleSections.has('footer')
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-12'
          }`}
          style={{ transitionDelay: visibleSections.has('footer') ? '100ms' : '0ms' }}
        >
          <StatusFooter
            eventsCount={timelineEvents.length}
            messagesCount={messages.length}
            loading={loading}
          />
        </section>
      </div>

      <ToastNotice toast={toast} />
    </div>
  );
}