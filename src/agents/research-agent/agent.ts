import { ParallelAgent } from "@iqai/adk";
import { getTokenDetectionAgent } from "./sub_agents/token-detection-agent/agent";
import { getMarketDataAgent } from "./sub_agents/market-data-agent/agent";
import { getWebSearchAgent } from "./sub_agents/web-search-agent/agent";

/**
 * Creates and configures a research agent specialized in gathering cryptocurrency research data.
 *
 * This agent is equipped with sub-agents to fetch and analyze various aspects of cryptocurrency markets,
 * including token detection, market data, and web search running in parallel.
 *
 * @returns A configured ParallelAgent instance specialized for cryptocurrency research
 */
export const getResearchAgent = () => {
  return new ParallelAgent({
    name: "research_agent",
    description: "Gathers cryptocurrency research data using multiple sub-agents in parallel",
    subAgents: [
      getTokenDetectionAgent(),
      getMarketDataAgent(), 
      getWebSearchAgent(),
    ],
  });
};