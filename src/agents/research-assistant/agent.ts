import { LlmAgent } from "@iqai/adk";
import { env } from "../../env";
import { tavilySearch, universalScraper, tokenDetector, conductResearchTool } from "./tools";
import { readFileSync } from 'fs';
import { join } from 'path';

const instruction = readFileSync(join(__dirname, 'instructions.md'), 'utf-8');

/**
 * Creates and configures a research assistant agent for cryptocurrency data collection.
 */
export const getResearchAssistantAgent = () => {
  const researchAssistantAgent = new LlmAgent({
    name: "research_assistant",
    description: "Gathers cryptocurrency research data from web sources using search and scraping tools",
    model: env.QUERY_LLM_MODEL,
    instruction,
  tools: [tavilySearch, universalScraper, tokenDetector, conductResearchTool],
  });

  return researchAssistantAgent;
};