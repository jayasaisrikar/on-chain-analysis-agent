import { LlmAgent } from "@iqai/adk";
import { conductResearchTool } from "../research-assistant/tools";
import { readFileSync } from 'fs';
import { join } from 'path';
import { env } from "../../env";

const instruction = readFileSync(join(__dirname, 'instructions.md'), 'utf-8');

/**
 * Creates and configures a coordinator agent for cryptocurrency research workflow.
 */
export const getCoordinatorAgent = () => {
  const coordinatorAgent = new LlmAgent({
    name: "coordinator",
    description: "Orchestrates cryptocurrency research workflow and coordinates between agents",
    model: env.LLM_MODEL,
    instruction,
    tools: [conductResearchTool],
  });

  return coordinatorAgent;
};