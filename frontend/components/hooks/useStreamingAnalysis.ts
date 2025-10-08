import { useCallback, useRef, useState } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface StepEvent {
  id?: string;
  type: string;
  data?: any; // structure depends on backend events
  ts?: number;
}

interface UseStreamingOptions {
  persist?: boolean;
  // Optional callbacks
  onError?: (err: Error) => void;
  apiKeys?: {
    openai?: string;
    gemini?: string;
    provider?: string;
  };
}

export function useStreamingAnalysis(opts: UseStreamingOptions = {}) {
  const { onError } = opts;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<StepEvent[]>([]);
  const [report, setReport] = useState('');
  // persist session id in localStorage so follow-ups survive reloads
  const STORAGE_KEY = 'adk_session_id';
  // initialize sessionId state from localStorage so follow-ups survive reloads and page reloads
  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v || null;
    } catch (err) {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [typingEffect, setTypingEffect] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(async (input: string) => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setTypingEffect(true);
    setReport('');
    setEvents([]);

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input, timestamp: Date.now() };
    setMessages(m => [...m, userMessage]);

    const controller = new AbortController();
    abortRef.current = controller;

    let streamedReport = '';
    try {
      const body: any = { question: input, apiKeys: opts.apiKeys };
      if (sessionId) body.sessionId = sessionId;
      const res = await fetch('/api/analyze', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' }, signal: controller.signal });
      if (!res.body) throw new Error('No stream');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary;
        while ((boundary = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 2);
            if (!chunk) continue;
            try {
              const evt = JSON.parse(chunk);
              if (evt.type === 'report') {
                streamedReport += evt.data;
                setReport(streamedReport);
              } else if (evt.type === 'session') {
                // server may send session metadata
                if (evt.data?.sessionId) {
                  setSessionId(evt.data.sessionId);
                  try { localStorage.setItem(STORAGE_KEY, evt.data.sessionId); } catch {}
                }
              } else {
                setEvents(e => [...e, evt]);
              }
            } catch {}
        }
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        const err = e instanceof Error ? e : new Error(String(e));
        onError?.(err);
        setMessages(m => [...m, { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry, there was an error processing your request. Please try again.', timestamp: Date.now() }]);
      }
    } finally {
      setLoading(false);
      setTypingEffect(false);
      abortRef.current = null;
      if (streamedReport.trim()) {
        setMessages(m => [...m, { id: crypto.randomUUID(), role: 'assistant', content: streamedReport, timestamp: Date.now() }]);
      }
    }
  }, [loading, onError]);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setEvents([]);
    setReport('');
  }, []);

  const clearSession = useCallback(() => {
    try { localStorage.removeItem('adk_session_id'); } catch {}
    setSessionId(null);
  }, []);

  return { messages, events, report, loading, typingEffect, run, stop, clear, sessionId, clearSession };
}
