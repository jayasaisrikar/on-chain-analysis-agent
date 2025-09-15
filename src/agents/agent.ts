import { SequentialAgent } from "@iqai/adk";
import { agent as tokenMarketAgent } from "./token-market-agent/agent";
import { agent as webSearchAgent } from "./web-search-agent/agent";
import { agent as marketDataAgent } from "./market-data-agent/agent";
import { agent as contentScrapingAgent } from "./content-scraping-agent/agent";
import { agent as analysisAgent } from "./analysis-agent/agent";

export async function buildPipeline(models?: { 
  tokenMarket?: string; 
  webSearch?: string; 
  marketData?: string; 
  contentScraping?: string; 
  analysis?: string 
}) {
  const tokenMarket = await tokenMarketAgent(models?.tokenMarket);
  const webSearch = await webSearchAgent(models?.webSearch);
  const marketData = await marketDataAgent(models?.marketData);
  const contentScraping = await contentScrapingAgent(models?.contentScraping);
  const analysis = await analysisAgent(models?.analysis);

  const pipeline = new SequentialAgent({
    name: "crypto_research_pipeline",
    description: "Specialized pipeline: token detection → web search → market data → content scraping → analysis",
    subAgents: [
      tokenMarket.agent, 
      webSearch.agent, 
      marketData.agent, 
      contentScraping.agent, 
      analysis.agent
    ]
  });

  return { pipeline, tokenMarket, webSearch, marketData, contentScraping, analysis };
}

export { tokenMarketAgent, webSearchAgent, marketDataAgent, contentScrapingAgent, analysisAgent };
