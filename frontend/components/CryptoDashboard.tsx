"use client";
// Orchestrator component (clean refactored version)
import { useState, useCallback, useEffect, useMemo } from 'react';
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

export default function CryptoDashboard({ appConfig = {} }: CryptoDashboardProps) {
  const appConfiguration = { ...defaultAppConfig, ...appConfig };
  const { config, isConfigured, getAPIKeysForRequest } = useAPIConfig();
  const { messages, events, report, loading, typingEffect, run, clear } = useStreamingAnalysis({
    onError: (err: Error) => console.error('analysis error', err),
    apiKeys: shouldUseEnvKeys(appConfiguration, isConfigured) ? undefined : getAPIKeysForRequest()
  });
  const [input, setInput] = useState('Provide analysis for DOGE and LOKA.');
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

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
    
    // Check if we should use environment keys or if user keys are configured
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
    <div className="min-h-screen relative">
      <APISetupNotification />
      <MarketStatusBar appConfig={appConfiguration} />
      <div className={`container mx-auto px-6 space-y-4 max-w-7xl transition-all duration-300 ${!isConfigured ? 'pt-8 pb-8' : 'pt-4 pb-8'}`}>
        <HeroHeader />
        <QueryInput
          input={input}
          setInput={setInput}
          loading={loading}
          hasMessages={messages.length > 0}
          onRun={runAnalysis}
          onClear={clearAll}
        />
        <div className="space-y-8">
          <div className="grid lg:grid-cols-2 gap-8">
            <ChatPanel messages={messages} loading={loading} typingEffect={typingEffect} />
            <AgentExecutionPanel events={timelineEvents} loading={loading} />
          </div>
          <AnalysisReportPanel
            report={report}
            loading={loading}
            copied={copied}
            onCopy={copyReport}
            onDownload={downloadReport}
          />
        </div>
        <StatusFooter
          eventsCount={timelineEvents.length}
          messagesCount={messages.length}
          loading={loading}
        />
      </div>
      <ToastNotice toast={toast} />
    </div>
  );
}