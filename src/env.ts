import { config } from "dotenv";
import { z } from "zod";

config();

export const envSchema = z.object({
	ADK_DEBUG: z.string().default("false"),
	GOOGLE_API_KEY: z.string(),
	EXA_API_KEY: z.string().optional(),
	TAVILY_API_KEY: z.string().optional(),
	COINGECKO_API_KEY: z.string().optional().describe("CoinGecko Pro API key for market data"),
	USER_QUERY: z
		.string()
		.default("Analyze Bitcoin price trends and market sentiment")
		.describe("User query to analyze"),
	LLM_MODEL: z
		.string()
		.default("gemini-2.5-flash")
		.describe("LLM Model common to use by all the agents"),
	QUERY_LLM_MODEL: z
		.string()
		.default("gemini-2.0-flash")
		.describe("LLM Model for faster responses"),
	FALLBACK_MODELS: z
		.string()
		.optional()
		.describe("Comma separated list of fallback models to try on 429/503 errors (e.g. gemini-2.0-flash,gemini-1.5-flash)"),
	REMINDER_POLLING_MS: z
		.number()
		.default(30_000)
		.describe("Polling interval for checking reminders in MS"),
	ENABLE_RATE_LIMITING: z
		.string()
		.default("true")
		.describe("Enable rate limiting to prevent quota errors"),
	MAX_RETRIES: z
		.string()
		.default("3")
		.transform((val) => parseInt(val))
		.describe("Maximum number of retries for quota errors"),
});

export const env = envSchema.parse(process.env);