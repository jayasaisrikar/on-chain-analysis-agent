import { BaseTool } from "@iqai/adk";
import { QueryValidationResult } from "../../types/index";
import { PerformanceTimer } from "../../utils/index";

/**
 * Tool for validating if queries are crypto-related and sanitizing them for security
 */
export class CryptoQueryValidationTool extends BaseTool {
  constructor() {
    super({
      name: 'validate_crypto_query',
      description: 'Validates if a query is crypto-related and sanitizes it for security'
    });
  }

  getDeclaration() {
    return {
      name: this.name,
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The user query to validate and sanitize'
          }
        },
        required: ['query']
      }
    } as any;
  }

  async runAsync(args: { query: string }): Promise<QueryValidationResult> {
    const timer = new PerformanceTimer('Query Validation Tool');
    
    try {
      const { queryValidatorAgent } = await import('./agent');
      const agent = await queryValidatorAgent;
      
      const result = await agent.runner.ask(args.query);
      const content = typeof result === 'string' ? result.trim() : JSON.stringify(result);
      
      const isValid = !/^sorry, please ask about crypto-related insights\.?$/i.test(content);
      
      timer.end();
      
      return {
        isValid,
        sanitizedQuery: content
      };
    } catch (error) {
      timer.end();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Query validation failed: ${errorMessage}`);
    }
  }
}

export async function validateCryptoQuery(query: string): Promise<QueryValidationResult> {
  const tool = new CryptoQueryValidationTool();
  return await tool.runAsync({ query });
}
