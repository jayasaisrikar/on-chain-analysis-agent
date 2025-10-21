import * as dotenv from "dotenv";
import { getRootAgent } from "./agents/agent";
import { updateMarketData, addMemoryEntry, summarizeSessionMemory } from "./session/state"; // still used for augmented state beyond ADK session
import { searchMemory, addMemory as addVectorMemory, summarizeRecords } from "./memory/vector-memory";

dotenv.config();

/**
 * Event shape emitted for UI consumption.
 */
export interface AnalysisEvent {
	type: "start" | "finish" | "log" | "analysis" | "report_chunk" | "error" | "debug";
	agent?: string;
	message?: string;
	data?: any;
	ts: number;
}

/**
 * Run a full analysis for a user question using the root agent pipeline.
 * Emits structured events that can be forwarded to a Next.js Route Handler
 * and rendered live in the UI.
 */
export async function runAnalysis(question: string, emit: (evt: AnalysisEvent) => void, sessionId?: string) {
	const start = Date.now();
	emit({ type: "start", agent: "root_agent", message: `question: ${question}`, ts: start });

	try {
		// Build root agent; capture session from ADK builder
		const { runner, session } = await getRootAgent();
		if (sessionId && session) {
			// If caller provided a sessionId different from existing session.id, attempt to set (if API supports) else emit notice
			try {
				// Some ADK sessions may expose id; we just emit for now
				emit({ type: "debug", agent: "root_agent", message: `session_active id:${(session as any).id ?? 'unknown'}`, ts: Date.now() });
				// Initialize session state if not exists
				if (!(session as any)?.state) {
					(session as any).state = {};
				}
				// Don't pre-set market_data_results as undefined - let it be set by the market data agent
				emit({ type: "debug", agent: "root_agent", message: `session_state_initialized`, ts: Date.now() });
			} catch {}
		}
		// Emit prior augmented session memory summary (from our augmentation layer) if available
		let memorySummary: string | undefined;
		if (sessionId) {
			memorySummary = summarizeSessionMemory(sessionId);
			if (memorySummary) {
				// Provide to ADK session state so instruction placeholder resolves
				try { (session as any)?.state && ((session as any).state.session_memory_summary = memorySummary); } catch {}
				emit({ type: "debug", agent: "root_agent", message: `session_memory_summary:\n${memorySummary}`, ts: Date.now() });
			}
		}

		// Execute the orchestrated pipeline (research parallel + analysis)
		// Retrieve vector memory context for enrichment
		const related = searchMemory(question, 3);
		if (related.length) {
			emit({ type: "debug", agent: "root_agent", message: `vector_memory_matches:\n${summarizeRecords(related)}` , ts: Date.now() });
		}
		const result = await runner.ask(question);

		// Emit per-agent lifecycle + capture analysis output
		let analysisText: string | undefined;
		for (const rRaw of result) {
			const r: any = rRaw as any;
			emit({ type: "start", agent: r.agent, message: "started", ts: Date.now() });
			emit({ type: "finish", agent: r.agent, message: "completed", ts: Date.now() });
			// Emit debug summary (avoid large payloads)
			try {
				const summaryKeys = Object.keys(r).filter(k => ["agent","response","content","text","tokens","marketData","searches","synonyms","success","error"].includes(k));
				emit({ type: "debug", agent: r.agent, message: `keys: ${summaryKeys.join(',')}${r.error? ' error:'+r.error.slice(0,120):''}`, ts: Date.now() });
			} catch {}
			// Persist market data results into session state
			if (sessionId && r.agent === "market_data_agent" && r.marketData) {
				try { updateMarketData(sessionId, r.marketData); } catch {}
				// Also attach to ADK session state if available
				try { (session as any)?.state && ((session as any).state.market_data_results = r.marketData); } catch {}
			}
			if (r.agent === "analysis_agent" && (r.response || r.content || r.text)) {
				analysisText = r.response || r.content || r.text;
			}
		}

		if (!analysisText) {
			const fallback: any = result.find((r: any) => typeof (r as any).response === "string" || typeof (r as any).content === "string");
			if (fallback) analysisText = (fallback as any).response || (fallback as any).content;
		}

			if (analysisText) {
			emit({ type: "analysis", agent: "analysis_agent", message: "final report", ts: Date.now() });
			const chunkSize = 1200;
			for (let i = 0; i < analysisText.length; i += chunkSize) {
				emit({ type: "report_chunk", agent: "analysis_agent", data: analysisText.slice(i, i + chunkSize), ts: Date.now() });
			}
			if (sessionId) {
				addMemoryEntry(sessionId, { question, timestamp: Date.now(), analysis: analysisText });
				// Attach analysis excerpt into ADK session messages if supported
				try {
					if ((session as any)?.addMessage) {
						(session as any).addMessage("system", `[analysis-summary] ${analysisText.substring(0,500)}...`);
					} else if ((session as any)?.state) {
						const st = (session as any).state;
						if (!st.messages) st.messages = [];
						st.messages.push({ role: "system", content: `[analysis-summary] ${analysisText.substring(0,500)}...`, ts: Date.now() });
					}
				} catch {}
			}
			addVectorMemory(question, analysisText);
		} else {
			emit({ type: "error", agent: "analysis_agent", message: "No analysis output produced", ts: Date.now() });
		}
	} catch (err: any) {
		emit({ type: "error", agent: "root_agent", message: err?.message || String(err), ts: Date.now() });
	} finally {
		emit({ type: "finish", agent: "root_agent", message: "completed", ts: Date.now() });
	}
}

// CLI execution block removed to avoid including Node-specific side effects in Next.js RSC bundle.