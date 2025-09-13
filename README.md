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

### Research Agent
- **Purpose**: Gathers cryptocurrency research data from web sources
- **Tools**: Tavily search, web scraping, token detection
- **Model**: Gemini 2.0 Flash (fast responses)

### Analysis Agent
- **Purpose**: Provides comprehensive cryptocurrency analysis
- **Capabilities**: Technical analysis, fundamental analysis, market sentiment
- **Model**: Gemini 2.5 Flash (advanced reasoning)

### Coordinator Agent
- **Purpose**: Orchestrates the research and analysis workflow
- **Role**: Query processing, agent coordination, result synthesis
- **Model**: Gemini 2.5 Flash

## 🛠️ Tools

### Research Tools
- **Tavily Search**: Web search with rate limiting and error handling
- **Universal Scraper**: Content extraction from multiple URLs
- **Token Detector**: Cryptocurrency token identification
- **Conduct Research**: Complete research workflow orchestration

### Analysis Tools
- **Analyze Data**: Data analysis and insight generation

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
import { agent as researchAgent } from './agents/research-agent/agent';

const research = await researchAgent();
const result = await research.runner.ask("Analyze Bitcoin market trends");
console.log(result);
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