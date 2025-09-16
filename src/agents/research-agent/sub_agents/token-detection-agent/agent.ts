import { LlmAgent } from "@iqai/adk";
import { env } from "../../../../env";
import { tokenDetectionTool } from "./tools";

/**
 * Agent for cryptocurrency token detection and identification
 */
export const getTokenDetectionAgent = () => {
  const instruction = `
    You are a cryptocurrency token detection specialist. Your role is to identify and extract 
    cryptocurrency tokens mentioned in user queries with high accuracy.
    
    Use the token_detection tool to analyze the user query and identify relevant cryptocurrencies.
    Provide clear results about which tokens were detected and your confidence level.
  `;

  return new LlmAgent({
    name: "token_detection_agent",
    description: "Identifies cryptocurrency tokens mentioned in user queries",
    instruction,
    model: env.LLM_MODEL,
    tools: [tokenDetectionTool],
    outputKey: "token_detection_results",
    disallowTransferToParent: true,
    disallowTransferToPeers: true,
  });
};