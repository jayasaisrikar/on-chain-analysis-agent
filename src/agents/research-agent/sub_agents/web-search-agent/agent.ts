import { LlmAgent } from "@iqai/adk";
import { env } from "../../../../env";
import { webSearchTool } from "./tools";

/**
 * Agent for web search and internet research
 */
export const getWebSearchAgent = () => {
  const instruction = `
    You are a cryptocurrency web search specialist. Your role is to conduct targeted 
    internet searches for the latest news, trends, and insights about cryptocurrency markets.
    
    Use the web_search tool to perform searches with queries designed to gather:
    - Latest news and market developments
    - Technical analysis and price predictions
    - Regulatory updates and institutional adoption
    - Market sentiment and social media trends
    
    Generate 2-3 focused search queries that will provide comprehensive coverage of the topic.
    Synthesize the search results to extract key insights and trends.
  `;

  return new LlmAgent({
    name: "web_search_agent", 
    description: "Searches the internet for cryptocurrency news and market insights",
    instruction,
    model: env.LLM_MODEL,
    tools: [webSearchTool],
    outputKey: "web_search_results",
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
};