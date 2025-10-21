export interface AnalysisEvent { type: 'start'|'finish'|'log'|'analysis'|'report_chunk'|'error'|'debug'|'report'; agent?: string; message?: string; data?: any; ts: number; }
interface StreamOptions { signal?: AbortSignal; sessionId?: string; apiKeys?: { openai?: string; gemini?: string; provider?: string }; onEvent: (evt: AnalysisEvent) => void; onDone?: () => void; onError?: (err: Error) => void; }
export async function streamAnalysis(question: string, opts: StreamOptions) {
  const res = await fetch('/api/analyze', { method: 'POST', signal: opts.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, apiKeys: opts.apiKeys, sessionId: opts.sessionId }) });
  if (!res.body) throw new Error('No response body');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const p of parts) {
        const trimmed = p.trim();
        if (!trimmed) continue;
        try { opts.onEvent(JSON.parse(trimmed)); } catch { /* ignore partial */ }
      }
    }
    if (buffer.trim()) { try { opts.onEvent(JSON.parse(buffer.trim())); } catch {} }
    opts.onDone && opts.onDone();
  } catch (err:any) {
    if (opts.signal?.aborted) return;
    opts.onError && opts.onError(err instanceof Error ? err : new Error(String(err)));
  } finally { try { reader.releaseLock(); } catch {} }
}
