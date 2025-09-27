import fs from "node:fs";
import * as dotenv from "dotenv";
import { getRootAgent } from "./agents/agent";

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
 * Converts the ADK runner response into a stream of structured events that
 * can be forwarded to a Next.js Route Handler and rendered live in the UI.
 */
export async function runAnalysis(question: string, emit: (evt: AnalysisEvent) => void) {
	const start = Date.now();
	emit({ type: "start", agent: "root_agent", message: `question: ${question}`, ts: start });

	try {
		const { runner } = await getRootAgent();

		// Execute the orchestrated pipeline (research parallel + analysis)
		const result = await runner.ask(question);

		// Emit per-agent lifecycle + capture analysis output
		let analysisText: string | undefined;
			for (const rRaw of result) {
				const r: any = rRaw as any;
				emit({ type: "start", agent: r.agent, message: "started", ts: Date.now() });
				emit({ type: "finish", agent: r.agent, message: "completed", ts: Date.now() });
				// Collect analysis text
				if (r.agent === "analysis_agent" && (r.response || r.content || r.text)) {
					analysisText = r.response || r.content || r.text;
				}
			}

		if (!analysisText) {
			// Fallback: try to locate any text-y field
					const fallback: any = result.find((r: any) => typeof (r as any).response === "string" || typeof (r as any).content === "string");
					if (fallback) analysisText = (fallback as any).response || (fallback as any).content;
		}

		if (analysisText) {
			emit({ type: "analysis", agent: "analysis_agent", message: "final report", ts: Date.now() });
			const chunkSize = 1200;
			for (let i = 0; i < analysisText.length; i += chunkSize) {
				emit({ type: "report_chunk", agent: "analysis_agent", data: analysisText.slice(i, i + chunkSize), ts: Date.now() });
			}
		} else {
			emit({ type: "error", agent: "analysis_agent", message: "No analysis output produced", ts: Date.now() });
		}
	} catch (err: any) {
		emit({ type: "error", agent: "root_agent", message: err?.message || String(err), ts: Date.now() });
	} finally {
		emit({ type: "finish", agent: "root_agent", message: "completed", ts: Date.now() });
	}
}

/**
 * CLI demo retained for local development: writes analysis to response.md
 */
async function main() {
	const question = "Provide analysis for DOGE and LOKA.";
	let collected = "";
	await runAnalysis(question, (evt) => {
		if (evt.type === "report_chunk" && typeof evt.data === "string") {
			collected += evt.data;
		}
	});
	if (collected) {
		fs.writeFileSync("./response.md", collected, { encoding: "utf-8" });
		console.log("Analysis written to response.md");
	}
}

if (require.main === module) {
	main().catch(console.error);
}