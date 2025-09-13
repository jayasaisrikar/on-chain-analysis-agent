import { agent as researchAgent } from './agents/research-agent/agent';
import { agent as analysisAgent } from './agents/analysis-agent/agent';
import { agent as coordinatorAgent } from './agents/coordinator/agent';
import { env } from './env';
import { retryWithBackoff, parseRetryDelay } from './utils/rate-limiter';
import * as fs from 'fs';
import * as path from 'path';

interface AnalysisResult {
  timestamp: string;
  query: string;
  agents: {
    coordinator: string;
    research: string;
    analysis: string;
  };
  results: {
    research: {
      data: string;
      preview: string;
    };
    analysis: {
      data: string;
      preview: string;
    };
  };
  status: 'completed' | 'failed';
  duration?: number;
}

async function main() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting cryptocurrency analysis application...');
    
    console.log('📋 Testing agent creation...');
    const coordinator = await coordinatorAgent();
    const research = await researchAgent();
    const analysis = await analysisAgent();
    
    console.log('✅ All agents created successfully');
    console.log(`📊 Coordinator: ${coordinator.agent.name}`);
    console.log(`🔍 Research: ${research.agent.name}`);
    console.log(`📈 Analysis: ${analysis.agent.name}`);
    
    const testQuery = env.USER_QUERY;
    console.log(`\n🎯 Running user query: "${testQuery}"`);
    console.log(`📝 Query source: ${process.env.USER_QUERY ? 'Environment variable' : 'Default value'}`);
    
    console.log('\n1. Research phase...');
    let researchResult: string;
    try {
      researchResult = await retryWithBackoff(
        () => research.runner.ask(testQuery),
        env.QUERY_LLM_MODEL, // Use the query model for research
        3 // Max retries
      );
      
      // Check if research result is empty or contains only whitespace
      if (!researchResult || researchResult.trim().length === 0) {
        researchResult = "Research phase completed but returned no data. This may be due to model errors or empty responses.";
      }
      
      console.log('✅ Research completed');
      console.log('Research result preview:', researchResult.substring(0, 200) + '...');
    } catch (error: any) {
      console.error('❌ Research phase failed:', error.message);
      
      // Check if it's a quota error and provide helpful message
      if (error?.message?.includes("quota") || error?.status === 429) {
        const retryDelay = parseRetryDelay(error);
        console.log(`⏰ Quota exceeded. Recommended wait time: ${retryDelay / 1000} seconds`);
        console.log('🔗 To fix this issue permanently, consider upgrading to paid tier at: https://aistudio.google.com/app/apikey');
        researchResult = `Research failed due to API quota limits: ${error.message}`;
      } else {
        researchResult = `Research failed due to error: ${error.message}. This may be due to malformed function calls or model issues.`;
      }
    }

    console.log('\n2. Analysis phase...');
    let analysisResult: string;
    try {
      // Ensure we have meaningful data to analyze
      const dataToAnalyze = researchResult.trim() 
        ? `Analyze this research data: ${researchResult}`
        : `Perform a general technical analysis on IQ token and PEAR Protocol based on your knowledge. Note: Research phase did not return data, so provide analysis based on available information.`;
      
      analysisResult = await retryWithBackoff(
        () => analysis.runner.ask(dataToAnalyze),
        env.LLM_MODEL, // Use the main model for analysis
        3 // Max retries
      );
      console.log('✅ Analysis completed');
      console.log('Analysis result preview:', analysisResult.substring(0, 200) + '...');
    } catch (error: any) {
      console.error('❌ Analysis phase failed due to quota limits');
      
      if (error?.message?.includes("quota") || error?.status === 429) {
        const retryDelay = parseRetryDelay(error);
        console.log(`⏰ Quota exceeded. Recommended wait time: ${retryDelay / 1000} seconds`);
        console.log('🔗 To fix this issue permanently, consider upgrading to paid tier at: https://aistudio.google.com/app/apikey');
      }
      
      analysisResult = `Analysis failed due to API quota limits: ${error.message}`;
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Create the final result object
    const finalResult: AnalysisResult = {
      timestamp: new Date().toISOString(),
      query: testQuery,
      agents: {
        coordinator: coordinator.agent.name,
        research: research.agent.name,
        analysis: analysis.agent.name
      },
      results: {
        research: {
          data: researchResult,
          preview: researchResult.substring(0, 200) + '...'
        },
        analysis: {
          data: analysisResult,
          preview: analysisResult.substring(0, 200) + '...'
        }
      },
      status: 'completed',
      duration: duration
    };
    
    // Save to JSON file
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `crypto-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const outputPath = path.join(outputDir, filename);
    
    fs.writeFileSync(outputPath, JSON.stringify(finalResult, null, 2), 'utf-8');
    
    console.log('\n🎉 Workflow completed successfully!');
    console.log(`💾 Results saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Application failed:', error);
    
    // Save error result to JSON as well
    const errorResult: AnalysisResult = {
      timestamp: new Date().toISOString(),
      query: env.USER_QUERY,
      agents: {
        coordinator: "unknown",
        research: "unknown", 
        analysis: "unknown"
      },
      results: {
        research: {
          data: "",
          preview: ""
        },
        analysis: {
          data: "",
          preview: ""
        }
      },
      status: 'failed',
      duration: Date.now() - startTime
    };
    
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `crypto-analysis-error-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const outputPath = path.join(outputDir, filename);
    
    // Add error details to the result
    (errorResult as any).error = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(errorResult, null, 2), 'utf-8');
    console.log(`💾 Error details saved to: ${outputPath}`);
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
