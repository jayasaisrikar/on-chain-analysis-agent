# 🚀 On-Chain Crypto Analyzer

A sophisticated cryptocurrency analysis pipeline built with TypeScript and the IQAI ADK (Agent Development Kit). This application provides AI-powered comprehensive analysis of cryptocurrency markets using multiple data sources, advanced web scraping, and intelligent agent orchestration.

## ✨ Features

- 🔍 **Multi-Source Analysis**: Real-time market data, news scraping, and AI analysis
- 🤖 **AI-Powered Agents**: IQAI ADK with OpenAI GPT-4 and Google Gemini
- 📊 **Market Data Integration**: CoinGecko API for live price and market data
- 🌐 **Advanced Web Scraping**: Multiple fallback methods for reliable content extraction
- 💾 **Intelligent Caching**: Efficient data caching to minimize API calls
- 🔒 **Query Validation**: Built-in security and crypto-relevance validation
- ⚡ **Performance Optimized**: Batch processing and rate limiting
- 🏗️ **Modular Architecture**: Granular, testable, and maintainable codebase

## 🏗️ Architecture

```
src/
├── agents/           # AI agents using IQAI ADK
│   └── index.ts      # Query validation, synonym generation, analysis
├── config.ts         # Centralized configuration
├── memory/           # Persistence and session memory
│   └── index.ts      # File-based and in-memory storage
├── services/         # Core business logic
│   ├── search.ts     # Exa search integration
│   ├── scraper.ts    # Multi-method web scraping
│   ├── market-data.ts # CoinGecko market data
│   └── prompt-builder.ts # Analysis prompt construction
├── types/            # TypeScript type definitions
│   └── index.ts      # Comprehensive type system
├── utils/            # Utility functions
│   └── index.ts      # Helpers, timers, rate limiting
└── index.ts          # Main pipeline orchestrator
```

## 🚀 Quick Start

### Prerequisites

- Node.js 22+ (required for IQAI ADK)
- npm or yarn
- API keys for OpenAI, Google AI, and Exa

### Installation

1. **Clone and install:**
   ```bash
   git clone <repository-url>
   cd on-chain
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Required API Keys:**
   - `OPENAI_API_KEY` - For query processing and validation
   - `GOOGLE_API_KEY` - For final analysis generation  
   - `EXA_API_KEY` - For intelligent web search
   - `COINGECKO_API_KEY` - Optional, for better rate limits
   - `TAVILY_API_KEY` - Optional, alternative search provider

### Usage

```bash
# Run analysis with query from .env file
npm start

# Development mode with hot reload (uses .env query)
npm run dev

# Run tests
tsx test.ts
```

**Note:** The application will use the `USER_QUERY` from your `.env` file. Simply update the query in your `.env` file and run the commands above.

## Configuration

The application can be configured through `src/config.ts`:

```typescript
export const config = {
  // API configuration
  openai: { model: "gpt-4o-mini" },
  google: { model: "gemini-2.5-flash" },
  
  // Search settings
  search: {
    exaResultsPerQuery: 2,
    maxUrls: 10,
    batchSize: 5
  },
  
  // Market data filters
  marketData: {
    minMarketCap: 1_000_000,
    minVolume: 10_000
  }
};
```

## Pipeline Flow

1. **Query Validation** - Sanitizes and validates crypto-relevance
2. **Synonym Generation** - Creates targeted search queries
3. **Knowledge Base Setup** - Loads filtered cryptocurrency data
4. **Token Detection** - Identifies relevant cryptocurrencies in query
5. **Market Data Augmentation** - Fetches real-time price/market data
6. **Web Search** - Searches for relevant news and analysis
7. **Content Scraping** - Extracts content using multiple methods
8. **Coverage Analysis** - Ensures all tokens are covered
9. **Final Analysis** - AI-powered comprehensive analysis

## API Rate Limits

The application includes built-in rate limiting and retry logic:

- **Exa Search**: 5 requests per second with exponential backoff
- **CoinGecko**: 120ms delay between requests
- **Web Scraping**: Multiple fallback methods for reliability

## Data Storage

- **Memory**: In-memory storage for current session
- **Persistence**: JSON file storage for cross-session data
- **Cache**: Filtered knowledge base cached for 30 minutes

## Error Handling

- Comprehensive error handling with graceful degradation
- Multiple scraping methods as fallbacks
- Rate limit detection and automatic retry
- Detailed logging for debugging

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Clean build directory
npm run clean
```

## Dependencies

### Core Dependencies
- `@iqai/adk` - IQAI Agent Development Kit
- `@ai-sdk/openai` - OpenAI integration
- `@ai-sdk/google` - Google AI integration
- `exa-js` - Exa search API client
- `axios` - HTTP client
- `playwright` - Browser automation for scraping
- `cheerio` - Server-side HTML parsing
- `@mozilla/readability` - Content extraction

### Development Dependencies
- `typescript` - TypeScript compiler
- `ts-node` - TypeScript execution
- `@types/node` - Node.js type definitions
- `eslint` - Code linting

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support, please open an issue on the GitHub repository or contact the development team.
