import { BaseTool } from "@iqai/adk";
import { PerformanceTimer } from "../../utils/index";

/**
 * Tool for generating final cryptocurrency analysis
 */
export class AnalysisGenerationTool extends BaseTool {
  constructor() {
    super({
      name: 'generate_analysis',
      description: 'Generates comprehensive cryptocurrency analysis based on provided data'
    });
  }

  getDeclaration() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          analysisPrompt: {
            type: 'string',
            description: 'The comprehensive prompt containing market data, search results, and analysis requirements'
          }
        },
        required: ['analysisPrompt']
      }
    } as any;
  }

  async runAsync(args: { analysisPrompt: string }): Promise<string> {
    const timer = new PerformanceTimer('Analysis Generation Tool');
    
    try {
      // Import the agent here to avoid circular dependencies
      const { analysisGeneratorAgent } = await import('./agent.js');
      const agent = await analysisGeneratorAgent;

      const result = await agent.runner.ask(args.analysisPrompt);
      const finalResult = typeof result === 'string' ? result : JSON.stringify(result);
      
      timer.end();
      
      return finalResult;
    } catch (error) {
      timer.end();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Analysis generation failed: ${errorMessage}`);
    }
  }
}

/**
 * Generates final comprehensive cryptocurrency analysis
 */
export async function generateFinalAnalysis(analysisPrompt: string): Promise<string> {
  const tool = new AnalysisGenerationTool();
  return await tool.runAsync({ analysisPrompt });
}
