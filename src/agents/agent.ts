import { analysisGeneratorAgent } from "./analysis-generator/agent";
import { queryValidatorAgent } from "./query-validator/agent";
import { synonymGeneratorAgent } from "./synonym-generator/agent";
import { tokenIdentifierAgent } from "./token-identifier/agent";

/**
 * Root agent aggregator
 * Exports a single root object that exposes the individual agents.
 * Each property is the promise exported by the sub-agent modules so
 * the application can `await` them as before.
 */
export const rootAgent = {
	queryValidatorAgent,
	synonymGeneratorAgent,
	analysisGeneratorAgent,
	tokenIdentifierAgent,
};

export default rootAgent;
