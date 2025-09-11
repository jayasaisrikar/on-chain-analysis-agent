import { BaseTool } from "@iqai/adk";
import { SynonymResponse } from "../../types/index";
import { PerformanceTimer } from "../../utils/index";

/**
 * Tool for generating synonym search queries for crypto analysis
 */
export class SynonymGenerationTool extends BaseTool {
  constructor() {
    super({
      name: 'generate_synonyms',
      description: 'Generates synonym search queries for comprehensive crypto analysis'
    });
  }

  getDeclaration() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          originalQuery: {
            type: 'string',
            description: 'The original query to generate synonyms for'
          }
        },
        required: ['originalQuery']
      }
    } as any;
  }

  async runAsync(args: { originalQuery: string }): Promise<SynonymResponse> {
    const timer = new PerformanceTimer('Synonym Generation Tool');
    
    try {
  const { synonymGeneratorAgent } = await import('./agent');
  const agent = await synonymGeneratorAgent;

  const result = await agent.runner.ask(`Generate synonym search queries for: "${args.originalQuery}"`);
      const content = typeof result === 'string' ? result : JSON.stringify(result);
      
      console.log('🔍 Generated synonyms response:', content);
      
      let synonyms: string[] = [];
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonData = JSON.parse(jsonMatch[0]);
          for (const key in jsonData) {
            if (jsonData.hasOwnProperty(key) && typeof jsonData[key] === 'string') {
              const synonym = jsonData[key].trim();
              if (synonym && synonym !== args.originalQuery) {
                synonyms.push(synonym);
              }
            }
          }
        }
      } catch (error) {
        synonyms = [`${args.originalQuery} analysis`, `${args.originalQuery} trends`, `${args.originalQuery} news`];
      }

      timer.end();

      return {
        synonyms,
        originalQuery: args.originalQuery
      };
    } catch (error) {
      timer.end();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Synonym generation failed: ${errorMessage}`);
    }
  }
}

export async function generateSynonyms(originalQuery: string): Promise<SynonymResponse> {
  const tool = new SynonymGenerationTool();
  return await tool.runAsync({ originalQuery });
}
