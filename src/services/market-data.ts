import axios, { AxiosInstance } from 'axios';
import { AgentBuilder } from "@iqai/adk";
import { openai } from "@ai-sdk/openai";
import { removeStopwords, eng } from 'stopword';
import { config } from "../config.js";

interface MarketData {
  id: string;
  symbol: string;
  name: string;
  market_cap: number;
  total_volume: number;
  current_price: number;
  price_change_percentage_24h: number;
  high_24h: number;
  low_24h: number;
}

async function fetchFilteredMarketData({
  apiKey,
  perPage = 250,
  minMarketCap = 1_000_000,
  minVolume = 10_000,
  delayMs = 120
}: {
  apiKey: string;
  perPage?: number;
  minMarketCap?: number;
  minVolume?: number;
  delayMs?: number;
}): Promise<MarketData[]> {
  const client: AxiosInstance = axios.create({
    baseURL: 'https://pro-api.coingecko.com/api/v3',
    headers: { 'x-cg-pro-api-key': apiKey }
  });
  const results: MarketData[] = [];
  let page = 1;

  while (true) {
    await new Promise(r => setTimeout(r, delayMs));

    try {
      const resp = await client.get('/coins/markets', {
        params: {
          vs_currency: 'usd',
          order: 'market_cap_desc',
          per_page: perPage,
          page
        }
      });
      const data: MarketData[] = resp.data;
      if (!Array.isArray(data) || data.length === 0) break;

      const filtered = data.filter(
        c =>
          c.market_cap >= minMarketCap &&
          c.total_volume >= minVolume
      );
      results.push(...filtered);

      if (data.length < perPage) break;
      page++;
    } catch (err: any) {
      if (err.response?.status === 429) {
        console.warn(`Rate limit hit on page ${page}, backing off...`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      throw err;
    }
  }

  return results;
}

export async function getCachedKnowledgeBase() {
  const CACHE_FILE = 'data/cache/knowledge_base_filtered.json';
  const CACHE_TTL = 30 * 60 * 1000;
  
  const fs = await import('fs/promises');
  
  try {
    const stats = await fs.stat(CACHE_FILE);
    const isExpired = Date.now() - stats.mtime.getTime() > CACHE_TTL;
    
    if (!isExpired) {
      const cached = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
      console.log(`✅ Using cached knowledge base (${cached.length} filtered coins) - Cache age: ${Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60))} minutes`);
      return cached;
    } else {
      console.log('🔄 Cache expired, fetching fresh data...');
    }
  } catch (error) {
    console.log('📦 No cache found, creating fresh knowledge base...');
  }
  
  const freshData = await setupFilteredKnowledgeBase();
  
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(freshData, null, 2));
    console.log('💾 Filtered knowledge base cached for future runs');
  } catch (error: any) {
    console.warn('⚠️ Could not cache knowledge base:', error.message);
  }
  
  return freshData;
}

async function setupFilteredKnowledgeBase() {
  try {
    console.log("Setting up filtered knowledge base: fetching high-quality CoinGecko assets...");
    const apiKey = process.env.COINGECKO_API_KEY;
    if (!apiKey) {
      throw new Error('❌ COINGECKO_API_KEY environment variable not set.');
    }
    
    console.log("Fetching filtered market data (>$1M market cap, >$10K volume)...");
    const filteredMarketData = await fetchFilteredMarketData({ 
      apiKey, 
      minMarketCap: 1_000_000, 
      minVolume: 10_000 
    });

    console.log(`✅ Retrieved ${filteredMarketData.length} high-quality coins (market cap >= $1M and volume >= $10K)`);

    const filteredCoins = filteredMarketData.map(coin => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name
    }));

    return filteredCoins;
  } catch (error) {
    console.error("❌ Fatal Error: Could not fetch CoinGecko asset list. The application cannot continue.");
    process.exit(1);
  }
}

function findTokenMatches(
  potentialTokens: string[],
  assetList: Array<{ id: string; symbol: string; name: string }>,
  listType: string
): Array<{ name: string; id: string; symbol: string }> {
  const matches: Array<{ name: string; id: string; symbol: string }> = [];
  const foundIds = new Set<string>();
  
  for (const token of potentialTokens) {
    const lowerToken = token.toLowerCase();
    
    const commonWords = ['protocol', 'token', 'coin', 'network', 'chain', 'finance'];
    if (commonWords.includes(lowerToken)) {
      console.log(`⏭️ Skipping common word: ${lowerToken}`);
      continue;
    }
    
    for (const asset of assetList) {
      const assetName = asset.name.toLowerCase();
      const assetSymbol = asset.symbol.toLowerCase();
      
      if (assetSymbol === lowerToken && !foundIds.has(asset.id)) {
        matches.push(asset);
        foundIds.add(asset.id);
        console.log(`🎯 Found exact symbol match in ${listType} data for "${token}": ${asset.name}`);
        break;
      }
      
      if (assetName === lowerToken && !foundIds.has(asset.id)) {
        matches.push(asset);
        foundIds.add(asset.id);
        console.log(`🎯 Found exact name match in ${listType} data for "${token}": ${asset.name}`);
        break;
      }
      
      if (assetName.includes(lowerToken) && lowerToken.length > 2 && !foundIds.has(asset.id)) {
        matches.push(asset);
        foundIds.add(asset.id);
        console.log(`🎯 Found partial match in ${listType} data for "${token}": ${asset.name}`);
        break;
      }
    }
  }
  
  return matches;
}

async function calculateMatchPercentageWithLLM(
  userTokens: string[],
  foundMatches: Array<{ name: string; id: string; symbol: string }>
): Promise<{ isValid: boolean; confidence?: number; suggestions?: Array<{ name: string; id: string; symbol: string }> }> {
  if (foundMatches.length === 0) {
    return { isValid: false };
  }

  const matchAnalysisPrompt = `You are an expert cryptocurrency analyst specializing in token identification and semantic matching.

TASK: Analyze if the user's query tokens semantically match the found cryptocurrency tokens with sufficient confidence for financial analysis.

USER TOKENS: [${userTokens.join(', ')}]

FOUND CRYPTOCURRENCY MATCHES:
${foundMatches.map((match, index) => 
  `${index + 1}. "${match.name}" (${match.symbol.toUpperCase()}) [ID: ${match.id}]`
).join('\n')}

ANALYSIS CRITERIA:
✅ HIGH CONFIDENCE (Accept):
- Exact symbol matches (BTC → Bitcoin)
- Exact name matches (Bitcoin → Bitcoin) 
- Common abbreviations (ETH → Ethereum, SOL → Solana)
- Clear partial matches where user token is contained in crypto name (SHIB → Shiba Inu)
- Well-known alternative names (DOGE → Dogecoin)

❌ LOW CONFIDENCE (Reject):
- Very generic terms without clear crypto reference (coin, token, crypto)
- Random/nonsense strings not matching any known tokens
- Ambiguous partial matches with multiple possible meanings
- User tokens that don't relate to any of the found matches

DECISION THRESHOLD: 60% confidence
- Consider crypto domain knowledge and common user patterns
- Be practical about how real users refer to cryptocurrencies
- Prioritize user intent over strict string matching

RESPONSE FORMAT:
Respond with EXACTLY this format:
CONFIDENCE: [percentage]%
DECISION: [VALID/INVALID]

Example responses:
CONFIDENCE: 85%
DECISION: VALID

CONFIDENCE: 35%
DECISION: INVALID

Provide the confidence percentage (0-100%) based on semantic matching quality, then your decision.`;

  try {
    const agent = await AgentBuilder
      .create("crypto_token_matcher")
      .withModel(openai(config.openai.model))
      .withDescription("Expert cryptocurrency token semantic matching analyst")
      .withInstruction("You are a cryptocurrency expert who determines if user queries match found tokens with high semantic confidence.")
      .build();

    const result = await agent.runner.ask(matchAnalysisPrompt);
    const response = typeof result === 'string' ? result.trim() : 'CONFIDENCE: 0%\nDECISION: INVALID';
    
    const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)%/i);
    const decisionMatch = response.match(/DECISION:\s*(VALID|INVALID)/i);
    
    const confidencePercentage = confidenceMatch ? parseInt(confidenceMatch[1]) : 0;
    const decision = decisionMatch ? decisionMatch[1].toUpperCase() : 'INVALID';
    
    const isValid = decision === 'VALID' && confidencePercentage >= 60;
    
    console.log(`🤖 LLM Semantic Analysis: ${decision} (Confidence: ${confidencePercentage}%)`);
    
    if (!isValid) {
      const suggestions = foundMatches.slice(0, 3);
      return { 
        isValid: false, 
        confidence: confidencePercentage,
        suggestions 
      };
    }
    
    return { isValid: true, confidence: confidencePercentage };
    
  } catch (error) {
    console.error('⚠️ LLM analysis failed, falling back to conservative validation:', error);
    const hasExactMatch = foundMatches.some(match => 
      userTokens.some(token => 
        token.toLowerCase() === match.symbol.toLowerCase() || 
        token.toLowerCase() === match.name.toLowerCase()
      )
    );
    console.log(`🔄 Fallback validation: ${hasExactMatch ? 'ACCEPTED' : 'REJECTED'}`);
    return { isValid: hasExactMatch, confidence: hasExactMatch ? 100 : 0 };
  }
}

export async function retrieveCoinIDs(
  potentialTokens: string[],
  knowledgeBase: Array<{ id: string; symbol: string; name: string }>
): Promise<Array<{ name: string; id: string; symbol: string }> | { error: string; suggestions?: Array<{ name: string; id: string; symbol: string }> }> {
  console.log('🔍 Searching for tokens:', potentialTokens);

  if (potentialTokens.length === 0) {
    return [];
  }

  const matches = findTokenMatches(potentialTokens, knowledgeBase, 'filtered');
  
  if (matches.length === 0) {
    console.log('❌ No matches found in filtered knowledge base');
    return {
      error: "Sorry, we only serve mid to popular coins for now. Please ask about well-known cryptocurrencies."
    };
  }

  console.log('🤖 Analyzing match confidence with LLM...');
  const llmResult = await calculateMatchPercentageWithLLM(potentialTokens, matches);
  
  if (!llmResult.isValid) {
    const confidence = llmResult.confidence || 0;
    console.log(`📉 LLM determined low match confidence (${confidence}%)`);
    
    if (confidence > 0 && confidence < 60 && llmResult.suggestions && llmResult.suggestions.length > 0) {
      const matchedTokens = llmResult.suggestions.map(s => s.name).join(', ');
      console.log(`🎯 Found partial matches: ${matchedTokens}`);
      return {
        error: `Match confidence is ${confidence}% (below 60% threshold). Found these tokens: ${matchedTokens}. Please clarify by using complete token names from this list to improve accuracy.`,
        suggestions: llmResult.suggestions
      };
    } else {
      return {
        error: "Sorry, we only serve mid to popular coins for now. Please ask about well-known cryptocurrencies.",
        suggestions: llmResult.suggestions
      };
    }
  }

  console.log(`✅ LLM validated ${matches.length} matches with ${llmResult.confidence}% confidence`);
  return matches;
}

export async function fetchDetailedCoinData(detectedAssets: Array<{ id: string; name: string }>): Promise<any> {
  if (detectedAssets.length === 0) {
    return {};
  }
  
  const coinIds = detectedAssets.map(asset => asset.id).join(',');
  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}`;
  try {
    console.log(`\n📈 Augmenting data by fetching market details for: ${coinIds}`);
    const { data } = await axios.get(url);
    const augmentedData: Record<string, any> = {};
    for (const item of data) {
      augmentedData[item.id] = {
        name: item.name,
        symbol: item.symbol,
        current_price: item.current_price,
        market_cap: item.market_cap,
        price_change_24h: item.price_change_percentage_24h,
        high_24h: item.high_24h,
        low_24h: item.low_24h
      };
    }
    console.log('✅ Successfully augmented data.');
    return augmentedData;
  } catch (error: any) {
    console.error("⚠️ Could not fetch detailed market data.", error.message);
    return {};
  }
}

export function extractPotentialTokens(query: string | undefined | null): string[] {
  if (typeof query !== 'string') return [];
  
  const words = query.match(/\b[a-zA-Z0-9]{2,20}\b/g) || [];
  
  const withoutStopwords = removeStopwords(words, eng);
  
  const cryptoStopwords = [
    'analysis', 'technical', 'price', 'token', 'coin', 'crypto', 'cryptocurrency', 
    'vs', 'comparison', 'compare', 'latest', 'news', 'market', 'trends', 'about', 
    'please', 'give', 'show', 'tell', 'explain', 'current', 'recent'
  ];
  
  const filtered = withoutStopwords.filter(word => 
    !cryptoStopwords.includes(word.toLowerCase())
  );
  
  return filtered;
}

export class MarketDataService {
  private knowledgeBase: Array<{ id: string; symbol: string; name: string }> = [];

  async setupKnowledgeBase() {
    this.knowledgeBase = await getCachedKnowledgeBase();
    console.log(`🧠 Knowledge base loaded with ${this.knowledgeBase.length} filtered assets.`);
  }

  async retrieveCoinIDs(query: string) {
    if (this.knowledgeBase.length === 0) {
        throw new Error("Knowledge base not initialized. Call setupKnowledgeBase() first.");
    }
    const potentialTokens = extractPotentialTokens(query);
    console.log('🔍 Extracted potential tokens from query:', potentialTokens);
    return await retrieveCoinIDs(potentialTokens, this.knowledgeBase);
  }

  async fetchDetailedCoinData(detectedAssets: Array<{ id: string; name: string }>) {
    return await fetchDetailedCoinData(detectedAssets);
  }
}
