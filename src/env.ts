import { config } from "dotenv";
import { z } from "zod";

config();

/**
 * Environment variable schema definition for the crypto analysis agent.
 *
 Multiple api keys are given as optional to make the agent model agnostic.
 */
	export const envSchema = z.object({
	ADK_DEBUG: z.coerce.boolean().default(false),
	GOOGLE_API_KEY: z.string().optional(),
	GEMINI_API_KEY: z.string().optional(),
	OPENAI_API_KEY: z.string().optional(),
	TAVILY_API_KEY: z.string().optional(),
	COINGECKO_API_KEY: z.string().optional(),
	LLM_MODEL: z.string().default("gemini-2.5-flash")
});

/**
 * Validated environment variables parsed from process.env.
 * Throws an error if required environment variables are missing or invalid.
 */
export const env = envSchema.parse(process.env);