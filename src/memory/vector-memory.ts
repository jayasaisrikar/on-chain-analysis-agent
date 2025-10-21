// Minimal in-memory vector memory stub. Real implementation would embed text and perform similarity search.
// For now we keep a simple array of { question, analysis } and return last few entries that share keywords.

interface VectorRecord {
  question: string;
  analysis: string;
  createdAt: number;
}

const records: VectorRecord[] = [];

export function addMemory(question: string, analysis: string) {
  records.push({ question, analysis, createdAt: Date.now() });
}

export function searchMemory(query: string, limit = 3): VectorRecord[] {
  if (!query) return [];
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean);
  // score by number of matching terms in question text
  const scored = records.map(r => {
    const qLower = r.question.toLowerCase();
    const score = terms.reduce((acc, t) => acc + (qLower.includes(t) ? 1 : 0), 0);
    return { rec: r, score };
  }).filter(s => s.score > 0);
  scored.sort((a, b) => b.score - a.score || b.rec.createdAt - a.rec.createdAt);
  return scored.slice(0, limit).map(s => s.rec);
}

export function summarizeRecords(recs: VectorRecord[]): string {
  return recs.map(r => `Q: ${r.question}\nA(len): ${r.analysis.length} chars`).join("\n---\n");
}

export function _allRecords() { return [...records]; }
