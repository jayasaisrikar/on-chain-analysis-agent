import axios, { AxiosInstance } from 'axios';
import { AgentBuilder } from "@iqai/adk";
import { openai } from "@ai-sdk/openai";
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
  const CACHE_FILE = 'data/cache/knowledge_base_complete.json';
  const CACHE_TTL = 30 * 60 * 1000;
  
  const fs = await import('fs/promises');
  
  try {
    const stats = await fs.stat(CACHE_FILE);
    const isExpired = Date.now() - stats.mtime.getTime() > CACHE_TTL;
    
    if (!isExpired) {
      const cached = JSON.parse(await fs.readFile(CACHE_FILE, 'utf8'));
      console.log(`✅ Using cached knowledge base (${cached.filtered.length} filtered, ${cached.unfiltered.length} total coins) - Cache age: ${Math.round((Date.now() - stats.mtime.getTime()) / (1000 * 60))} minutes`);
      return cached;
    } else {
      console.log('🔄 Cache expired, fetching fresh data...');
    }
  } catch (error) {
    console.log('📦 No cache found, creating fresh knowledge base...');
  }
  
  const freshData = await setupCompleteKnowledgeBase();
  
  try {
    await fs.writeFile(CACHE_FILE, JSON.stringify(freshData, null, 2));
    console.log('💾 Complete knowledge base cached for future runs');
  } catch (error: any) {
    console.warn('⚠️ Could not cache knowledge base:', error.message);
  }
  
  return freshData;
}

async function setupCompleteKnowledgeBase() {
  try {
    console.log("Setting up complete knowledge base: fetching all CoinGecko assets...");
    const apiKey = process.env.COINGECKO_API_KEY;
    if (!apiKey) {
      throw new Error('❌ COINGECKO_API_KEY environment variable not set.');
    }
    
    console.log("Fetching all market data...");
    const allMarketData = await fetchFilteredMarketData({ 
      apiKey, 
      minMarketCap: 0, 
      minVolume: 0 
    });

    console.log("Applying filters for high-quality assets...");
    const filteredMarketData = allMarketData.filter(coin => 
      coin.market_cap >= 1_000_000 && coin.total_volume >= 10_000
    );

    console.log(`✅ Retrieved ${allMarketData.length} total coins, ${filteredMarketData.length} filtered coins (market cap >= $1M and volume >= $10K)`);

    const mapCoinData = (coins: any[]) => coins.map(coin => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name
    }));

    return {
      filtered: mapCoinData(filteredMarketData),
      unfiltered: mapCoinData(allMarketData)
    };
  } catch (error) {
    console.error("❌ Fatal Error: Could not fetch CoinGecko asset list. The application cannot continue.");
    process.exit(1);
  }
}

// Simple exact matching function - will be replaced with LLM-based matching
function findTokenMatches(
  potentialTokens: string[],
  assetList: Array<{ id: string; symbol: string; name: string }>,
  listType: string
): Array<{ name: string; id: string; symbol: string }> {
  const matches: Array<{ name: string; id: string; symbol: string }> = [];
  const foundIds = new Set<string>();
  
  for (const token of potentialTokens) {
    const lowerToken = token.toLowerCase();
    
    // Skip common words
    const commonWords = ['protocol', 'token', 'coin', 'network', 'chain', 'finance'];
    if (commonWords.includes(lowerToken)) {
      console.log(`⏭️ Skipping common word: ${lowerToken}`);
      continue;
    }
    
    for (const asset of assetList) {
      const assetName = asset.name.toLowerCase();
      const assetSymbol = asset.symbol.toLowerCase();
      
      // Exact symbol match
      if (assetSymbol === lowerToken && !foundIds.has(asset.id)) {
        matches.push(asset);
        foundIds.add(asset.id);
        console.log(`🎯 Found exact symbol match in ${listType} data for "${token}": ${asset.name}`);
        break;
      }
      
      // Exact name match
      if (assetName === lowerToken && !foundIds.has(asset.id)) {
        matches.push(asset);
        foundIds.add(asset.id);
        console.log(`🎯 Found exact name match in ${listType} data for "${token}": ${asset.name}`);
        break;
      }
      
      // Partial name match (if token is found within asset name)
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

// LLM-based token matching using IQAI ADK with GPT-4o-mini (fast and efficient)
async function calculateMatchPercentageWithLLM(
  userTokens: string[],
  foundMatches: Array<{ name: string; id: string; symbol: string }>
): Promise<{ isValid: boolean; suggestions?: Array<{ name: string; id: string; symbol: string }> }> {
  if (foundMatches.length === 0) {
    return { isValid: false };
  }

  // Create a detailed prompt for the LLM to analyze token matches
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
Respond with EXACTLY one word:
- "VALID" if confidence ≥ 60%
- "INVALID" if confidence < 60%

No explanations, just the decision.`;

  try {
    // Use GPT-4o-mini for fast and accurate text similarity analysis
    const agent = await AgentBuilder
      .create("crypto_token_matcher")
      .withModel(openai(config.openai.model)) // Uses gpt-4o-mini (fast & efficient)
      .withDescription("Expert cryptocurrency token semantic matching analyst")
      .withInstruction("You are a cryptocurrency expert who determines if user queries match found tokens with high semantic confidence.")
      .build();

    const result = await agent.runner.ask(matchAnalysisPrompt);
    const response = typeof result === 'string' ? result.trim().toUpperCase() : 'INVALID';
    
    const isValid = response.includes('VALID');
    
    console.log(`🤖 LLM Semantic Analysis: ${response} (Confidence: ${isValid ? 'HIGH' : 'LOW'})`);
    
    if (!isValid) {
      // Return top 3 matches as suggestions when confidence is low
      const suggestions = foundMatches.slice(0, 3);
      return { 
        isValid: false, 
        suggestions 
      };
    }
    
    return { isValid: true };
    
  } catch (error) {
    console.error('⚠️ LLM analysis failed, falling back to conservative validation:', error);
    // Conservative fallback: only accept exact symbol/name matches
    const hasExactMatch = foundMatches.some(match => 
      userTokens.some(token => 
        token.toLowerCase() === match.symbol.toLowerCase() || 
        token.toLowerCase() === match.name.toLowerCase()
      )
    );
    console.log(`🔄 Fallback validation: ${hasExactMatch ? 'ACCEPTED' : 'REJECTED'}`);
    return { isValid: hasExactMatch };
  }
}

export async function retrieveCoinIDs(
  potentialTokens: string[],
  knowledgeBase: { filtered: Array<{ id: string; symbol: string; name: string }>; unfiltered: Array<{ id: string; symbol: string; name: string }> }
): Promise<Array<{ name: string; id: string; symbol: string }> | { error: string; suggestions?: Array<{ name: string; id: string; symbol: string }> }> {
  console.log('🔍 Searching for tokens:', potentialTokens);

  if (potentialTokens.length === 0) {
    return [];
  }

  // Search only in filtered data (no fallback to unfiltered)
  const matches = findTokenMatches(potentialTokens, knowledgeBase.filtered, 'filtered');
  
  if (matches.length === 0) {
    console.log('❌ No matches found in filtered knowledge base');
    return {
      error: "Sorry, we only serve mid to popular coins for now. Please ask about well-known cryptocurrencies."
    };
  }

  // Use LLM to analyze match confidence
  console.log('🤖 Analyzing match confidence with LLM...');
  const llmResult = await calculateMatchPercentageWithLLM(potentialTokens, matches);
  
  if (!llmResult.isValid) {
    console.log('📉 LLM determined low match confidence');
    return {
      error: "The tokens you mentioned have low match confidence. Please ask questions with complete names like in this list to process your request. If your token is not listed, sorry we are not serving that token right now.",
      suggestions: llmResult.suggestions
    };
  }

  console.log(`✅ LLM validated ${matches.length} matches with high confidence`);
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
  const stopwords = new Set(['the','and','for','with','analysis','technical','price','token','coin','crypto','cryptocurrency','vs','comparison','compare','latest','news','market','trends','july','august','september','october','november','december','2025','2024','2023','2022','2021','2020']);
  const words = query.match(/\b[a-zA-Z0-9]{2,20}\b/g) || [];
  return words.filter(w => !stopwords.has(w.toLowerCase()));
}

export class MarketDataService {
  private knowledgeBase: { filtered: Array<{ id: string; symbol: string; name: string }>; unfiltered: Array<{ id: string; symbol: string; name: string }> } = { filtered: [], unfiltered: [] };

  async setupKnowledgeBase() {
    this.knowledgeBase = await getCachedKnowledgeBase();
    console.log(`🧠 Knowledge base loaded with ${this.knowledgeBase.filtered.length} filtered assets.`);
  }

  async retrieveCoinIDs(query: string) {
    if (this.knowledgeBase.filtered.length === 0) {
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
