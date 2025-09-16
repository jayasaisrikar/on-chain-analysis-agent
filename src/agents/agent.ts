import { AgentBuilder } from "@iqai/adk";
import { env } from "../env";
import { getAnalysisAgent } from "./analysis-agent/agent";
import { getResearchAgent } from "./research-agent/agent";

/**
 * Creates and configures the root agent for crypto analysis orchestration.
 *
 * This agent serves as the main orchestrator that runs research agents in sequence
 * and then passes their outputs to the analysis agent for a final report.
 *
 * @returns The fully constructed root agent instance ready to process requests
 */
export const getRootAgent = async () => {
  const researchAgent = getResearchAgent();
  const analysisAgent = getAnalysisAgent();

  return await AgentBuilder.create("root_agent")
    .withDescription(
      "Root agent that coordinates research and analysis agents for crypto asset analysis."
    )
    .withInstruction(
      "Coordinate research and analysis agents to process user requests and deliver results."
    )
    .withModel(env.LLM_MODEL)
    .asSequential([researchAgent, analysisAgent])
    .build();
};
