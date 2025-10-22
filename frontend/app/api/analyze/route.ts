import { NextRequest } from 'next/server';
import { runAnalysis, AnalysisEvent } from '@backend/index';

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
  model?: 'openai' | 'gemini',
  apiKey?: string,
  sessionId?: string
) {
  // Store original environment variables
  const originalEnv = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
  };

  try {
    // Temporarily set user API key if provided
    if (apiKey && model === 'openai') {
      process.env.OPENAI_API_KEY = apiKey;
    } else if (apiKey && model === 'gemini') {
      process.env.GOOGLE_API_KEY = apiKey;
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
  const { question, model, apiKey, sessionId } = await req.json();
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
  }, model, apiKey, sessionId);
      } catch (err: any) {
        console.error('Analysis error:', err);
        
        let message = err?.message || String(err);
        let userMessage = message;
        
        // Handle specific API quota errors with user-friendly messages
        if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED') || err?.status === 429) {
          if (model === 'gemini') {
            userMessage = `⚠️ Gemini API quota exceeded. This usually happens with:\n• Free tier limits (15 requests/minute)\n• New API keys needing time to activate\n• Account billing issues\n\n💡 Solutions:\n• Switch to OpenAI GPT-4 model\n• Wait 1-2 minutes and try again\n• Check your Google AI Studio billing\n• Verify API key is activated`;
          } else {
            userMessage = `⚠️ OpenAI API quota exceeded. Please check your billing and usage limits at platform.openai.com`;
          }
        } else if (message.includes('API_KEY') || message.includes('authentication') || message.includes('unauthorized')) {
          userMessage = `🔑 API Key Error: Please verify your ${model === 'gemini' ? 'Gemini' : 'OpenAI'} API key is correct and active.`;
        }
        
        const errorPayload: StreamEvt = { 
          type: 'error', 
          id: crypto.randomUUID(), 
          agent: 'root_agent', 
          message: userMessage,
          ts: Date.now() 
        } as StreamEvt;
        
        controller.enqueue(encoder.encode(encode(errorPayload)));
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}
