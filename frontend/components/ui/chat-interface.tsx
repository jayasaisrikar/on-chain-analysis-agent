"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { ModernChatMessages } from '@/components/ui/modern-chat-messages';
import { ModernChatInput } from '@/components/ui/modern-chat-input';
import { ChatMessage } from '@/components/ui/message';
import { streamAnalysis } from '../../lib/agent-client';
import { AIProvider, APIKeySettings } from '@/types/api-config';
import APIKeyStorage from '@/utils/api-key-storage';
import { useToast } from '@/hooks/use-toast';

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [controller, setController] = useState<AbortController | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID()); // Generate persistent session ID
  const analysisBuffer = useRef<string>('');
  const { toast } = useToast();
  
  // New state for model and API key management
  const [selectedModel, setSelectedModel] = useState<AIProvider>('openai');
  const [apiKeys, setApiKeys] = useState<{ [key in AIProvider]?: string }>({});
  const [hasValidApiKey, setHasValidApiKey] = useState(false);

  // Load stored API settings on mount
  useEffect(() => {
    const loadStoredSettings = async () => {
      try {
        const settings = await APIKeyStorage.loadSettings();
        if (settings) {
          setSelectedModel(settings.selectedProvider);
          
          const keys: { [key in AIProvider]?: string } = {};
          if (settings.openaiKey) keys.openai = settings.openaiKey;
          if (settings.geminiKey) keys.gemini = settings.geminiKey;
          
          setApiKeys(keys);
          setHasValidApiKey(!!(keys[settings.selectedProvider]));
        }
      } catch (error) {
        console.error('Failed to load API settings:', error);
      }
    };
    
    loadStoredSettings();
  }, []);

  // Update hasValidApiKey when model changes
  useEffect(() => {
    setHasValidApiKey(!!(apiKeys[selectedModel]));
  }, [selectedModel, apiKeys]);

  const handleModelChange = (model: AIProvider) => {
    setSelectedModel(model);
    
    // Show helpful tips when switching models
    if (model === 'gemini') {
      toast({
        title: "⚠️ Gemini Rate Limits",
        description: "Gemini free tier: 15 requests/minute. Switch to OpenAI for better reliability.",
        duration: 5000,
      });
    }
  };

  const handleApiKeyUpdate = (provider: AIProvider, apiKey: string, rememberKey: boolean) => {
    setApiKeys(prev => ({ ...prev, [provider]: apiKey }));
    
    if (provider === selectedModel) {
      setHasValidApiKey(!!apiKey);
    }
  };

  const startNewSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setMessages([]);
    setInput('');
    if (controller) {
      controller.abort();
      setController(null);
      setLoading(false);
    }
  }, [controller]);

  const append = (partial: Omit<ChatMessage, 'id'>) => 
    setMessages(prev => [...prev, { id: crypto.randomUUID(), ...partial }]);

  const handleSend = useCallback(async () => {
    const question = input.trim();
    if (!question || loading || !hasValidApiKey) return;

    const currentApiKey = apiKeys[selectedModel];
    if (!currentApiKey) {
      append({ role: 'error', content: 'Please set up your API key for the selected model first.' });
      return;
    }

    // Check for rate limiting hints
    if (selectedModel === 'gemini') {
      append({ 
        role: 'system', 
        content: '⚠️ Using Gemini API (15 req/min limit). Switch to OpenAI for better reliability.' 
      });
    }

    setInput('');
    append({ role: 'user', content: question });
    setLoading(true);
    analysisBuffer.current = '';
    
    const abort = new AbortController();
    setController(abort);
    
    // Generate unique ID for this analysis message
    const analysisId = `analysis-${crypto.randomUUID()}`;
    
    // Initialize placeholder analysis message
    setMessages(prev => [...prev, { id: analysisId, role: 'agent', content: '' }]);
    
    const updateCurrentAnalysis = () => {
      const content = analysisBuffer.current;
      setMessages(prev => {
        const idx = prev.findIndex(m => m.id === analysisId);
        if (idx === -1) return [...prev, { id: analysisId, role: 'agent', content }];
        const clone = [...prev]; 
        clone[idx] = { ...clone[idx], content }; 
        return clone;
      });
    };
    
    try {
      await streamAnalysis(question, {
        signal: abort.signal,
        sessionId: sessionId, // Pass session ID for context persistence
        model: selectedModel,
        apiKey: currentApiKey,
        onEvent: (evt) => {
          if ((evt.type === 'report_chunk' || evt.type === 'report') && typeof evt.data === 'string') {
            analysisBuffer.current += evt.data;
            updateCurrentAnalysis();
            return;
          }
          if (evt.type === 'finish' && evt.agent === 'root_agent') {
            if (analysisBuffer.current) {
              setMessages(prev => {
                const idx = prev.findIndex(m => m.id === analysisId);
                if (idx === -1) return [...prev, { id: analysisId, role: 'agent', content: analysisBuffer.current }];
                const clone = [...prev]; 
                clone[idx] = { ...clone[idx], content: analysisBuffer.current }; 
                return clone;
              });
            }
            append({ role: 'system', content: 'Analysis complete.' });
            return;
          }
          if (evt.type === 'error') {
            append({ role: 'error', content: evt.message || 'Error' });
          }
        },
        onDone: () => { 
          setLoading(false); 
          setController(null); 
        },
        onError: (err) => { 
          append({ role: 'error', content: err.message }); 
          setLoading(false); 
          setController(null); 
        }
      });
    } catch (e: any) {
      append({ role: 'error', content: e.message || 'Request failed' });
      setLoading(false);
      setController(null);
    }
  }, [input, loading, selectedModel, apiKeys, hasValidApiKey]);

  const handleAbort = () => {
    controller?.abort();
    setController(null);
    setLoading(false);
    append({ role: 'system', content: 'Generation aborted.' });
  };

  const currentChatTitle = messages.length > 0 
    ? messages.find(m => m.role === 'user')?.content?.slice(0, 30) + '...' 
    : 'New Chat';

  return (
    <MainLayout
      currentChat={currentChatTitle}
      sidebarOpen={sidebarOpen}
      onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
      sessionId={sessionId}
      onNewChat={startNewSession}
    >
      <div className="flex flex-col h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
        {/* Background elements */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8B5CF6_1px,transparent_1px),linear-gradient(to_bottom,#8B5CF6_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.02] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col h-full">
          {/* Chat Messages Area */}
          <ModernChatMessages 
            messages={messages}
            loading={loading}
            className="flex-1 overflow-hidden"
          />

          {/* Chat Input / Processing State */}
          {/** UX NOTE: Input is fully hidden while loading to prevent multi-submit and focus flicker.
           * When loading=true we render a compact processing bar with Abort. Re-show after root_agent finish.
           */}
          {!loading ? (
            <ModernChatInput
              value={input}
              onChange={setInput}
              onSubmit={handleSend}
              loading={loading}
              onAbort={handleAbort}
              disabled={false}
              selectedModel={selectedModel}
              onModelChange={handleModelChange}
              onApiKeyUpdate={handleApiKeyUpdate}
              hasValidApiKey={hasValidApiKey}
            />
          ) : (
            <div className="p-6 border-t border-white/10 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto">
                <div className="relative overflow-hidden transition-all duration-300 bg-white/5 border-white/10 backdrop-blur-sm ring-2 ring-violet-500/40 animate-pulse rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-violet-400 animate-ping" />
                      <span className="text-sm text-slate-300">
                        Generating analysis… input hidden until complete
                      </span>
                    </div>
                    <button
                      onClick={handleAbort}
                      className="text-xs px-3 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors"
                    >Abort</button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500 opacity-60">
                    <div className="h-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
