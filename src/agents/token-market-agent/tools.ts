import { createTool } from "@iqai/adk";
import { z } from "zod";

// Central mapping of common token symbols/names to CoinGecko IDs
export const TOKEN_ID_MAP: Record<string, string> = {
  iq: 'everipedia',
  pear: 'pear-protocol',
  bitcoin: 'bitcoin',
  btc: 'bitcoin',
  ethereum: 'ethereum',
  eth: 'ethereum'
};

// Regex patterns for lightweight token detection
export const TOKEN_DETECTION_PATTERNS: Record<string, RegExp[]> = {
  bitcoin: [/bitcoin|btc(?!\w)/i],
  ethereum: [/ethereum|eth(?!\w)/i],
  dogecoin: [/dogecoin|doge(?!\w)/i],
  shiba: [/shiba[\s\-_]?inu|shib(?!\w)/i],
  iq: [/\biq\s+token\b|\biq(?!\w)/i],
  pear: [/pear\s+protocol\b|\bpear(?!\w)/i],
  cardano: [/cardano|ada(?!\w)/i],
  solana: [/solana|sol(?!\w)/i],
  chainlink: [/chainlink|link(?!\w)/i],
  polygon: [/polygon|matic(?!\w)/i],
  uniswap: [/uniswap|uni(?!\w)/i]
};

export function detectTokens(query: string): string[] {
  return Object.entries(TOKEN_DETECTION_PATTERNS)
    .filter(([, pats]) => pats.some(p => p.test(query)))
    .map(([k]) => k);
}

export const tokenDetector = createTool({
  name: "token_detector",
  description: "Detects cryptocurrency tokens mentioned in queries using pattern matching",
  schema: z.object({
    query: z.string()
  }),
  fn: async ({ query }) => {
    try {
      const detected = detectTokens(query);
      return {
        tokens: detected,
        patterns: Object.fromEntries(detected.map(k => [k, TOKEN_DETECTION_PATTERNS[k].map(p => p.toString())])),
        query
      };
    } catch (error) {
      console.warn('[token_detector] detection failed', error);
      return { tokens: [], patterns: {}, query };
    }
  }
});
