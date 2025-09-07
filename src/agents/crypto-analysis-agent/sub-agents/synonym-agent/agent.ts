import { AgentBuilder, createTool } from '@iqai/adk';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { config } from '../../../../config';
import { SynonymServiceAdapter } from './tools';

/**
 * Synonym Agent
 * Provides synonym generation and crypto query validation using centralized service logic.
 */
export async function synonymAgent() {
  const synonymService = new SynonymServiceAdapter();

  const synonymTool = createTool({
    name: 'synonym_service',
    description: 'Generate crypto-related synonym search queries or validate a user query',
    schema: z.object({
      action: z.enum(['generateSynonyms', 'validateQuery']).describe('Action to perform'),
      query: z.string().describe('Original user query')
    }),
    fn: async (args) => synonymService.execute(args)
  });

  return await AgentBuilder
    .create('synonym_agent')
    .withModel(openai(config.openai.model))
    .withDescription('Agent for generating diversified crypto search synonym queries and validating crypto-related queries.')
    .withInstruction(`You are a synonym and query validation specialist for crypto research.
Use the provided tool to:
1. Validate the user query (validateQuery) before generating synonyms.
2. Generate segmented, asset-specific search queries (generateSynonyms) following the service rules.
Return concise, JSON-friendly outputs when appropriate.`)
    .withTools(synonymTool)
    .build();
}
