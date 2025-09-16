import { LlmAgent } from "@iqai/adk";
import { env } from "../../env";

/**
 * Creates and configures an analysis agent specialized in synthesizing cryptocurrency research data.
 *
 * This agent processes research outputs and generates comprehensive markdown analysis reports.
 *
 * @returns A configured LlmAgent instance specialized for cryptocurrency analysis
 */
export const getAnalysisAgent = () => {
  const instruction = `
    You are an expert cryptocurrency analyst. You will be provided with the outputs of 
    research sub-agents. Use the following data to generate a comprehensive analysis report:
    
    Token Detection Results:
    {token_detection_results}
    
    Market Data Results:
    {market_data_results}
    
    Web Search Results:
    {web_search_results}
    
    Use all the above information to provide a detailed, actionable analysis for the given 
    crypto asset. Provide it in markdown format with the following structure:
    
    # Executive Summary
    # Technical Analysis  
    # Market Drivers
    # Outlook & Projections
    # Key Takeaways & Actionable Insights
    # Sources & References
    
    Ensure the analysis is comprehensive, data-driven, and provides specific insights 
    rather than generic advice.
  `;

  return new LlmAgent({
    name: "analysis_agent",
    description: "Provides comprehensive cryptocurrency analysis based on research data",
    instruction,
    model: env.LLM_MODEL,
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
    tools: [], // No tools needed - just synthesis
  });
};