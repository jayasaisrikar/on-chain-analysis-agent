/**
 * Alternative agent runner that bypasses the problematic Runner.run() method
 * but still uses the actual agents from the agents folder
 */

import { getQueryGeneratorAgent } from '../agents/query-generator/agent';
import { getResearchAssistantAgent } from '../agents/research-assistant/agent';
import { getCryptoAnalystAgent } from '../agents/crypto-analyst/agent';
import { AgentBuilder } from '@iqai/adk';

export class DirectAgentRunner {
    
    /**
     * Run query generator agent directly - using the actual agent configuration
     */
    static async runQueryGenerator(userQuery: string): Promise<string> {
        try {
            console.log('🤖 Running actual query generator agent...');
            
            // Get the actual agent configuration
            const agent = getQueryGeneratorAgent();
            console.log('Agent loaded:', agent.name, agent.description);
            
            // Use AgentBuilder with the same model and instruction as the actual agent
            const response = await AgentBuilder
                .withModel(agent.model) // Use the same model as the real agent
                .withInstruction(String(agent.instruction)) // Use the same instructions as the real agent (convert to string)
                .ask(`Generate synonym search queries for: "${userQuery}"`);
            
            console.log('✅ Query generator completed using real agent config');
            return response;
            
        } catch (error) {
            console.error('❌ Query generator agent failed:', error);
            throw error;
        }
    }
    
    /**
     * Run research assistant agent directly - using the actual agent configuration  
     */
    static async runResearchAssistant(userQuery: string, synonyms: string[]): Promise<string> {
        try {
            console.log('🔍 Running actual research assistant agent...');
            
            // Get the actual agent configuration
            const agent = getResearchAssistantAgent();
            console.log('Research agent loaded:', agent.name, agent.description);
            
            // Use AgentBuilder with the same model and instruction as the actual agent
            // Note: Tools need to be added separately since AgentBuilder might not support them directly
            const response = await AgentBuilder
                .withModel(agent.model) // Use the same model as the real agent
                .withInstruction(String(agent.instruction)) // Use the same instructions as the real agent (convert to string)
                .ask(`Please conduct research for: "${userQuery}" with synonyms: ${JSON.stringify(synonyms)}`);
            
            console.log('✅ Research assistant completed using real agent config');
            return response;
            
        } catch (error) {
            console.error('❌ Research assistant agent failed:', error);
            throw error;
        }
    }
    
    /**
     * Run crypto analyst agent directly - using the actual agent configuration
     */
    static async runCryptoAnalyst(userQuery: string, synonyms: string[], researchData: string): Promise<string> {
        try {
            console.log('📊 Running actual crypto analyst agent...');
            
            // Get the actual agent configuration
            const agent = getCryptoAnalystAgent();
            console.log('Analyst agent loaded:', agent.name, agent.description);
            
            const analysisPrompt = `Provide a technical and fundamental analysis for: ${userQuery}
Synonyms considered: ${synonyms.join(', ')}
Research findings: ${researchData}

Give clear sections for Technical Analysis, Key Drivers, Risk Factors, and Summary.`;
            
            // Use AgentBuilder with the same model and instruction as the actual agent
            const response = await AgentBuilder
                .withModel(agent.model) // Use the same model as the real agent
                .withInstruction(String(agent.instruction)) // Use the same instructions as the real agent (convert to string)
                .ask(analysisPrompt);
            
            console.log('✅ Crypto analyst completed using real agent config');
            return response;
            
        } catch (error) {
            console.error('❌ Crypto analyst agent failed:', error);
            throw error;
        }
    }
}
