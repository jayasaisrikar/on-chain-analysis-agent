import { LlmAgent } from "@iqai/adk";
import { readFileSync } from 'fs';
import { join } from 'path';
import { env } from "../../env";

const instruction = readFileSync(join(__dirname, 'instructions.md'), 'utf-8');

/**
 * Creates and configures a cryptocurrency analysis agent for comprehensive market insights.
 *
 * This agent provides detailed technical and fundamental analysis of cryptocurrency data,
 * synthesizing information from multiple sources to deliver actionable insights and
 * market predictions using Gemini 2.5 Flash for advanced reasoning capabilities.
 */
export const getCryptoAnalystAgent = () => {
  const cryptoAnalystAgent = new LlmAgent({
    name: "crypto_analyst",
    description: "Provides comprehensive cryptocurrency analysis based on research data with market insights",
    model: env.LLM_MODEL,
    instruction,
  });

  return cryptoAnalystAgent;
};