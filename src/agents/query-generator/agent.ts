import { LlmAgent } from "@iqai/adk";
import { env } from "../../env";
import { readFileSync } from 'fs';
import { join } from 'path';

const instruction = readFileSync(join(__dirname, 'instructions.md'), 'utf-8');

/**
 * Creates and configures a query generator agent specialized in cryptocurrency search optimization.
 *
 * This agent generates synonym search queries for cryptocurrency research, handling
 * both single and multiple asset queries with proper segmentation and JSON formatting.
 * Uses GPT-4o for creative query generation with structured output.
 */
export const getQueryGeneratorAgent = () => {
  const queryGeneratorAgent = new LlmAgent({
    name: "query_generator",
    description: "Generates search query synonyms for cryptocurrency research with JSON formatting",
    model: env.QUERY_LLM_MODEL,
    instruction,
  });

  return queryGeneratorAgent;
};