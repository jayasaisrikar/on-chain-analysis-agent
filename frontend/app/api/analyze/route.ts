import { NextRequest } from 'next/server';
import { runAnalysis, AnalysisEvent } from '../../../../src';

export const runtime = 'nodejs';

// Extend AnalysisEvent so we can safely emit a synthesized 'report' event
// converted from incoming 'report_chunk' events without type errors.
interface StreamEvt extends Omit<AnalysisEvent, 'type'> {
  id?: string;
  type: AnalysisEvent['type'] | 'report';
}
const encode = (evt: StreamEvt) => JSON.stringify(evt) + '\n\n';

// Helper function to safely run analysis with user-provided API keys
async function runAnalysisWithUserKeys(
  question: string,
  callback: (evt: AnalysisEvent) => void,
  userApiKeys?: { openai?: string; gemini?: string; provider?: string },
  sessionId?: string
) {
  // Store original environment variables
  const originalEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  };

  try {
    // Temporarily set user API keys if provided
    if (userApiKeys?.openai && userApiKeys.provider === 'openai') {
      process.env.OPENAI_API_KEY = userApiKeys.openai;
    }
    if (userApiKeys?.gemini && userApiKeys.provider === 'gemini') {
      process.env.GOOGLE_API_KEY = userApiKeys.gemini;
    }

    // Run the analysis, forwarding sessionId (if any) so previous context is used
    await runAnalysis(question, callback, sessionId);
  } finally {
    // Restore original environment variables
    process.env.OPENAI_API_KEY = originalEnv.OPENAI_API_KEY;
    process.env.GOOGLE_API_KEY = originalEnv.GOOGLE_API_KEY;
  }
}

export async function POST(req: NextRequest) {
  const { question, apiKeys, sessionId } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await runAnalysisWithUserKeys(question, (evt) => {
          if (evt.type === 'report_chunk') {
            const outbound: StreamEvt = {
              ...(evt as any),
              type: 'report',
              id: crypto.randomUUID(),
              data: (evt as any).data,
            };
            controller.enqueue(encoder.encode(encode(outbound)));
            return;
          }
          const outbound: StreamEvt = { ...(evt as any), id: crypto.randomUUID() };
          controller.enqueue(encoder.encode(encode(outbound)));
  }, apiKeys, sessionId);
      } catch (err: any) {
        controller.enqueue(encoder.encode(encode({ type: 'error', id: crypto.randomUUID(), agent: 'root_agent', message: err?.message || String(err), ts: Date.now() })));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
