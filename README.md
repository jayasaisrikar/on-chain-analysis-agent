# On-Chain Analysis Agent

A cryptocurrency analysis system built with IQAI ADK TypeScript framework following the recommended multi-agent project structure.

## 🏗️ Project Structure

This project follows the official IQAI ADK recommended structure:

```
on-chain-with-adk/
├── .env                     # Environment variables (API keys)
├── .gitignore              # Git ignore rules
├── package.json            # Project dependencies
├── tsconfig.json           # TypeScript configuration
└── src/
    ├── agents/
    │   ├── research-agent/
    │   │   ├── agent.ts     # Research agent implementation
    │   │   └── tools.ts     # Research tools (Tavily search, scraping, etc.)
    │   ├── analysis-agent/
    │   │   ├── agent.ts     # Analysis agent implementation
    │   │   └── tools.ts     # Analysis tools
    │   └── coordinator/
    │       └── agent.ts     # Coordinator agent
    ├── shared/
    │   └── tools/
    │       └── customTool.ts # Shared tool interfaces
    ├── env.ts              # Environment validation
    └── main.ts             # Main application entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Google API Key from [Google AI Studio](https://aistudio.google.com/app/apikey)
- Tavily API Key (optional)

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your API keys
4. Build the project:
   ```bash
   npm run build
   ```

### Running the Application

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run start
```

**Interactive Testing with ADK CLI:**
```bash
npm install -g @iqai/adk-cli
adk run   # CLI interface
adk web   # Web interface
```

## 🤖 Agents

### Token Market Agent (New)
- **Purpose**: Detects tokens & fetches real-time market data (CoinGecko)
- **Tools**: `token_detector`, `coingecko_market_data`
- **Output**: Structured JSON (tokens + market summary) stored in session state

### Web Research Agent (New)
- **Purpose**: Targeted web search & scraping for analysis context
- **Tools**: `tavily_search`, `universal_scraper`, `conduct_research`
- **Output**: Search queries used, synthesized findings, sources, excerpts → stored in session state

### Analysis Agent
- **Purpose**: Converts aggregated market + research context into actionable analysis
- **Tools**: `analyze_data`
- **Reads**: `market_data_summary`, `web_top_findings`, `web_scraped_excerpt` from session state

### Coordinator Agent
- **Purpose**: Still available for orchestration / future extensions
- **Note**: Main flow now handled by a Sequential pipeline

### Sequential Pipeline (New)
Implemented via `SequentialAgent` combining:
1. Token Market Agent → writes: `detected_tokens`, `market_data_summary`
2. Web Research Agent → writes: `web_top_findings`, `web_scraped_excerpt`, `web_sources`
3. Analysis Agent → writes: `analysis_summary`

All steps share the same session state for deterministic hand-off.

## 🛠️ Tools

### Research Tools
- **Tavily Search**: Web search with rate limiting and error handling
- **Universal Scraper**: Content extraction from multiple URLs
- **Token Detector**: Cryptocurrency token identification
- **Conduct Research**: Complete research workflow orchestration

### Analysis Tools
- **Analyze Data**: Data analysis and insight generation

## 🔁 Sequential Workflow & State

The new workflow uses `SequentialAgent` (see `src/agents/workflow/pipeline.ts`) to run agents in a fixed order. A single `InMemorySessionService` session is created in `main.ts` and state updates are applied through `EventActions.stateDelta` ensuring auditability.

State Keys Used:
```
original_query
current_step
detected_tokens
market_data_summary
token_market_raw
web_search_queries
web_top_findings
web_sources
web_scraped_excerpt
web_research_raw
analysis_summary
```
All keys are session-scoped (no prefix) for simplicity; can be migrated later to `user:` / `app:` scopes if persistence evolves.

## � Model Fallback Handling

Quota (429 / RESOURCE_EXHAUSTED) and overload (503 / UNAVAILABLE) errors from Gemini are mitigated by a lightweight fallback system:

1. Specify optional env var `FALLBACK_MODELS` as a comma-separated list (e.g.:
```
FALLBACK_MODELS=gemini-1.5-flash,gemini-2.0-flash
```
2. On agent build and each LLM call the system cycles through: `[primary, QUERY_LLM_MODEL, LLM_MODEL, ...FALLBACK_MODELS]` (deduped).
3. Transient errors trigger trying the next model; non-transient errors abort immediately.
4. Token/market step performs an extra empty-output retry cycle if initial JSON lacks tokens & summary.

This keeps the pipeline resilient without adding heavy external rate control. For higher reliability integrate a persistent session service and queue.

## �🧪 Extending the Pipeline
To add another step (e.g., Risk Scoring Agent):
1. Create new agent with `AgentBuilder`
2. Export its factory in a new file under `src/agents/<new-agent>/agent.ts`
3. Import and insert into `subAgents` array in `pipeline.ts`
4. Write any outputs to session state via event append helper in `main.ts`

## ⚠️ Error Handling Notes
If an upstream step fails (e.g., quota / 503), state records `*_error` and downstream steps degrade gracefully using whatever context exists.

## 🔧 Configuration

The project uses environment-based configuration:

```typescript
// src/env.ts
export const env = envSchema.parse(process.env);
```

Required environment variables:
- `GOOGLE_API_KEY`: Google Gemini API key
- `TAVILY_API_KEY`: Tavily search API key (optional)
- `LLM_MODEL`: Default model (gemini-2.5-flash)
- `QUERY_LLM_MODEL`: Fast model for queries (gemini-2.0-flash)

## 🏃‍♂️ Development

### Building
```bash
npm run build
```

### Running in Development
```bash
npm run dev
```

### Clean Build
```bash
npm run clean
npm run build
```

## 📚 Documentation

- [IQAI ADK Documentation](https://adk.iqai.com)
- [IQAI ADK GitHub](https://github.com/IQAIcom/adk-ts)

## 🎯 Features

- ✅ Multi-agent architecture following IQAI ADK best practices
- ✅ Cryptocurrency research and analysis capabilities
- ✅ Web search and content scraping
- ✅ Token detection and identification
- ✅ Comprehensive error handling
- ✅ Environment-based configuration
- ✅ TypeScript type safety
- ✅ Clean project structure
- ✅ ADK CLI compatibility

## 🚀 Usage Example

```typescript
import { buildPipeline } from './agents/workflow/pipeline';
const { pipeline } = await buildPipeline();
// You can still run individual sub-agents, but pipeline orchestrates order deterministically.
```

## 🔍 Testing

The project includes comprehensive logging and debugging capabilities. When running with `ADK_DEBUG=true`, you'll see detailed execution logs showing:

- Agent initialization
- Tool availability
- LLM requests and responses
- Function calls and tool usage
- Execution flow and timing

## 📊 Current Status

✅ **Completed:**
- Project restructured to follow IQAI ADK guidelines
- All agents properly implemented using AgentBuilder pattern
- Tools correctly integrated with createTool pattern
- Environment configuration and validation
- TypeScript compilation and build process
- Application successfully runs and executes agents

🔄 **Working:**
- Research agent successfully calls tools
- Analysis agent processes data
- Full workflow coordination
- Debug logging and monitoring

The application is now properly structured according to IQAI ADK best practices and successfully running!

## 🔄 Unified Analysis Flow (UI Integration)

The frontend (`/frontend`) now relies on a single backend function `runAnalysis(question, emit)` exported from `src/index.ts`.

### Flow Overview
1. User enters a prompt in the minimal `ChatInterface` component
2. Frontend sends POST `/api/analyze` with `{ question }`
3. Route handler calls `runAnalysis` and streams JSONL events over an HTTP `ReadableStream`
4. UI accumulates `type: "report"` / `report_chunk` events into the final analysis answer area
5. Lifecycle events (`start`, `finish`, `analysis`, `error`, `log`, `debug`) are listed in a simple steps panel

### Event Contract
Each line-delimited JSON object has shape:
```
{ "type": string, "id": string, "agent": string, "message": string, "data": any, "ts": number }
```

Important event types:

| Type | Purpose |
|------|---------|
| start | Agent began execution |
| finish | Agent completed |
| analysis | Analysis phase starting |
| report / report_chunk | Streaming markdown content (append in order) |
| log | Informational messages |
| debug | Diagnostic output |
| error | Pipeline or agent error |

### Adding New Agents
Insert into the root agent pipeline (`getRootAgent`) and ensure they expose a unique `name`. Their start/finish will automatically surface in the timeline.

### Reusing Outside Next.js
You can call `runAnalysis` directly in a CLI/tooling context and pipe events to stdout or another transport.

---