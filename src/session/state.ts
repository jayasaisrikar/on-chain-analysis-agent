// Minimal stub implementation for session state augmentation used by runAnalysis.
// Provides in-memory stores for market data and session memory entries.

interface MarketDataRecord {
  [symbol: string]: any;
}

interface MemoryEntry {
  question: string;
  timestamp: number;
  analysis: string;
}

const marketDataStore: Record<string, MarketDataRecord> = {};
const sessionMemoryStore: Record<string, MemoryEntry[]> = {};

export function updateMarketData(sessionId: string, data: MarketDataRecord) {
  if (!sessionId) return;
  marketDataStore[sessionId] = { ...(marketDataStore[sessionId] || {}), ...data };
}

export function addMemoryEntry(sessionId: string, entry: MemoryEntry) {
  if (!sessionId) return;
  if (!sessionMemoryStore[sessionId]) sessionMemoryStore[sessionId] = [];
  sessionMemoryStore[sessionId].push(entry);
}

export function summarizeSessionMemory(sessionId: string): string | undefined {
  const entries = sessionMemoryStore[sessionId];
  if (!entries || !entries.length) return undefined;
  return entries
    .slice(-5) // last few entries for brevity
    .map(e => `Q: ${e.question}\nA(len): ${e.analysis.length} chars`)
    .join("\n---\n");
}

// Optional helper to inspect stored state (not used by build but handy for debugging)
export function _debugDump(sessionId: string) {
  return {
    market: marketDataStore[sessionId],
    memory: sessionMemoryStore[sessionId]
  };
}
