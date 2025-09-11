import { getQueryGeneratorAgent } from './agents/query-generator/agent';
import { getResearchAssistantAgent } from './agents/research-assistant/agent';
import { getCryptoAnalystAgent } from './agents/crypto-analyst/agent';
import { Runner, InMemorySessionService } from '@iqai/adk';

export class DirectAgentRunner {
    private static sessionService = new InMemorySessionService();
    private static readonly APP_NAME = 'crypto-research-app';
    private static readonly USER_ID = 'user-001';
    
    /**
     * Helper method to run an agent with the proper Runner setup
     */
    private static async runAgentWithRunner(agent: any, message: string, sessionId: string): Promise<string> {
        console.log(`🔧 Setting up runner for session: ${sessionId}`);
        
        // Create session if it doesn't exist
        try {
            console.log(`📝 Creating session: ${sessionId}`);
            await this.sessionService.createSession(this.APP_NAME, this.USER_ID, {}, sessionId);
            console.log(`✅ Session created successfully: ${sessionId}`);
        } catch (error) {
            console.log(`ℹ️  Session might already exist: ${sessionId}`, error);
        }
        
        // Create a runner with the agent configuration
        console.log(`🏃 Creating runner for agent: ${agent.name}`);
        const runner = new Runner({
            agent: agent,
            appName: this.APP_NAME,
            sessionService: this.sessionService
        });
        console.log(`✅ Runner created successfully`);
        
        // Create user content in the correct format
        const userContent = {
            role: 'user' as const,
            parts: [{ text: message }]
        };
        console.log(`💬 User content prepared:`, JSON.stringify(userContent, null, 2));
        
        let finalResponse = '';
        let eventCount = 0;
        
        try {
            console.log(`🚀 Starting runAsync for session: ${sessionId}`);
            
            // Use the runner to process the message with correct parameters
            const eventStream = runner.runAsync({
                userId: this.USER_ID,
                sessionId: sessionId,
                newMessage: userContent
            });
            
            console.log(`📡 Event stream created, processing events...`);
            
            // Process the event stream with timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Runner timeout after 60 seconds')), 60000);
            });
            
            const processEvents = async () => {
                for await (const event of eventStream) {
                    eventCount++;
                    console.log(`📨 Event ${eventCount}: type=${event.type}, author=${event.author}`);
                    
                    // Log more event details for debugging
                    if (event.content) {
                        console.log(`   Content parts count: ${event.content.parts?.length || 0}`);
                    }
                    
                    // Fix: Call isFinalResponse() method instead of checking the property
                    const isFinal = event.isFinalResponse();
                    console.log(`   Is final response: ${isFinal}`);
                    
                    if (isFinal && event.content && event.content.parts) {
                        finalResponse = event.content.parts[0].text || '';
                        console.log(`🎯 Final response received (length: ${finalResponse.length})`);
                        break;
                    }
                }
            };
            
            // Race between event processing and timeout
            await Promise.race([processEvents(), timeoutPromise]);
            
            console.log(`📊 Event processing completed. Total events: ${eventCount}`);
            
        } catch (error) {
            console.error(`❌ Error in runAgentWithRunner:`, error);
            throw error;
        }
        
        if (!finalResponse) {
            console.warn(`⚠️  No final response received after ${eventCount} events`);
            return 'No response received from agent';
        }
        
        console.log(`✅ Final response ready (length: ${finalResponse.length})`);
        return finalResponse;
    }
    
    /**
     * Run query generator agent directly - using the actual agent configuration
     */
    static async runQueryGenerator(userQuery: string): Promise<string> {
        try {
            console.log('🤖 Running actual query generator agent...');
            
            // Get the LlmAgent instance
            const agent = getQueryGeneratorAgent();
            console.log('Agent loaded:', agent.name, agent.description);
            
            // Use the runner to execute the agent
            const result = await this.runAgentWithRunner(
                agent,
                `Generate synonym search queries for: "${userQuery}"`,
                'query-generator-session'
            );
            
            console.log('✅ Query generator completed using real agent config');
            return result;
            
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
            
            // Get the LlmAgent instance
            const agent = getResearchAssistantAgent();
            console.log('Research agent loaded:', agent.name, agent.description);
            
            // Use the runner to execute the agent
            const result = await this.runAgentWithRunner(
                agent,
                `Please conduct research for: "${userQuery}" with synonyms: ${JSON.stringify(synonyms)}`,
                'research-assistant-session'
            );
            
            console.log('✅ Research assistant completed using real agent config');
            return result;
            
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
            
            // Get the LlmAgent instance
            const agent = getCryptoAnalystAgent();
            console.log('Analyst agent loaded:', agent.name, agent.description);
            
            const analysisPrompt = `Provide a technical and fundamental analysis for: ${userQuery}
Synonyms considered: ${synonyms.join(', ')}
Research findings: ${researchData}

Give clear sections for Technical Analysis, Key Drivers, Risk Factors, and Summary.`;
            
            // Use the runner to execute the agent
            const result = await this.runAgentWithRunner(
                agent,
                analysisPrompt,
                'crypto-analyst-session'
            );
            
            console.log('✅ Crypto analyst completed using real agent config');
            return result;
            
        } catch (error) {
            console.error('❌ Crypto analyst agent failed:', error);
            throw error;
        }
    }
    
    /**
     * Extract synonyms from query generator response
     */
    private static extractSynonyms(response: string): string[] {
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(response);
            if (Array.isArray(parsed)) {
                return parsed;
            }
            if (parsed.queries && Array.isArray(parsed.queries)) {
                return parsed.queries;
            }
            if (parsed.synonyms && Array.isArray(parsed.synonyms)) {
                return parsed.synonyms;
            }
            if (typeof parsed === 'object') {
                // Extract all string values from the object
                return Object.values(parsed).filter(
                    (value): value is string => typeof value === 'string'
                );
            }
        } catch (e) {
            // If not JSON, try to extract from text response
            console.log('Response is not JSON, extracting from text...');
        }
        
        // Fallback: extract queries from text response
        const lines = response.split('\n');
        const synonyms: string[] = [];
        
        for (const line of lines) {
            const cleanLine = line.trim();
            // Skip empty lines and code blocks
            if (!cleanLine || cleanLine.startsWith('```')) continue;
            
            // Look for quoted text
            const quotedMatch = cleanLine.match(/"([^"]+)"/) || cleanLine.match(/'([^']+)'/);
            if (quotedMatch) {
                synonyms.push(quotedMatch[1]);
            } 
            // Look for bullet points or numbered lists
            else if (cleanLine.match(/^[-•*]\s+/)) {
                synonyms.push(cleanLine.replace(/^[-•*]\s+/, ''));
            }
            // Look for numbered items
            else if (cleanLine.match(/^\d+\.\s+/)) {
                synonyms.push(cleanLine.replace(/^\d+\.\s+/, ''));
            }
            // Accept any non-empty line that doesn't look like metadata
            else if (cleanLine.length > 3 && !cleanLine.toLowerCase().includes('query') && 
                     !cleanLine.toLowerCase().includes('synonym')) {
                synonyms.push(cleanLine);
            }
        }
        
        return synonyms.length > 0 ? synonyms : [response.trim()];
    }
    
    /**
     * Execute complete multi-agent workflow
     */
    static async executeFullWorkflow(userQuery: string): Promise<{
        synonyms: string[];
        research: string;
        analysis: string;
    }> {
        try {
            console.log('🔄 Starting multi-agent workflow...');
            
            // Step 1: Generate search queries
            const queryResponse = await this.runQueryGenerator(userQuery);
            const synonyms = this.extractSynonyms(queryResponse);
            console.log('📋 Generated synonyms:', synonyms);
            
            // Step 2: Conduct research
            const research = await this.runResearchAssistant(userQuery, synonyms);
            
            // Step 3: Perform analysis
            const analysis = await this.runCryptoAnalyst(userQuery, synonyms, research);
            
            console.log('🎉 Multi-agent workflow completed successfully');
            
            return {
                synonyms,
                research,
                analysis
            };
            
        } catch (error) {
            console.error('❌ Multi-agent workflow failed:', error);
            throw error;
        }
    }
}

// Utility function for easy usage
export async function runCryptoAnalysis(userQuery: string) {
    try {
        const result = await DirectAgentRunner.executeFullWorkflow(userQuery);
        return result;
    } catch (error) {
        console.error('Analysis failed:', error);
        throw error;
    }
}