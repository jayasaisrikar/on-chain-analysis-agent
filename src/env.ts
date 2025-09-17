import { config } from "dotenv";
import { z } from "zod";

config();

/**
 * Environment variable schema definition for the crypto analysis agent.
 *
 * Simplified configuration following Token-Analyzer architecture:
 * - ADK_DEBUG: Optional debug mode flag (defaults to false)
 * - GOOGLE_API_KEY: Required API key for Google/Gemini model access
 * - COINGECKO_API_KEY: Optional API key for CoinGecko market data access
 * - TAVILY_API_KEY: Optional API key for web search functionality
 * - LLM_MODEL: Model selection for analysis
 */
export const envSchema = z.object({
	ADK_DEBUG: z.coerce.boolean().default(false),
	GOOGLE_API_KEY: z.string(),
	TAVILY_API_KEY: z.string().optional(),
	COINGECKO_API_KEY: z.string().optional(),
	LLM_MODEL: z.string().default("gemini-2.5-flash")
});

/**
 * Validated environment variables parsed from process.env.
 * Throws an error if required environment variables are missing or invalid.
 */
export const env = envSchema.parse(process.env);