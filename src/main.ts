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
      
      if (!researchResult || researchResult.trim().length === 0) {
        researchResult = "Research phase completed but returned no data. This may be due to model errors or empty responses.";
      }
      
      console.log('✅ Research completed');
      console.log('Research result preview:', researchResult.substring(0, 200) + '...');
    } catch (error: any) {
      console.error('❌ Research phase failed:', error.message);
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
    
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `crypto-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const outputPath = path.join(outputDir, filename);
    
    fs.writeFileSync(outputPath, JSON.stringify(finalResult, null, 2), 'utf-8');

    // Also save a plain-text summary alongside the JSON
    const textFilename = filename.replace(/\.json$/, '.txt');
    const textOutputPath = path.join(outputDir, textFilename);

    const textContent = [
      `Timestamp: ${finalResult.timestamp}`,
      `Query: ${finalResult.query}`,
      `Agents: Coordinator=${finalResult.agents.coordinator}, Research=${finalResult.agents.research}, Analysis=${finalResult.agents.analysis}`,
      `Status: ${finalResult.status}`,
      `Duration(ms): ${finalResult.duration}`,
      '',
      '--- Research (preview) ---',
      finalResult.results.research.preview,
      '',
      '--- Analysis (preview) ---',
      finalResult.results.analysis.preview,
      '',
      '--- Full Research ---',
      finalResult.results.research.data,
      '',
      '--- Full Analysis ---',
      finalResult.results.analysis.data,
    ].join('\n');

    fs.writeFileSync(textOutputPath, textContent, 'utf-8');
    console.log('\n🎉 Workflow completed successfully!');
    console.log(`💾 Results saved to: ${outputPath}`);
    console.log(`💾 Plain text summary saved to: ${textOutputPath}`);
    
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
    (errorResult as any).error = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(errorResult, null, 2), 'utf-8');
    console.log(`💾 Error details saved to: ${outputPath}`);

    const errorMdFilename = filename.replace(/\.json$/, '.md');
    const errorMdOutputPath = path.join(outputDir, errorMdFilename);

    const errorMdContent = [
      `Timestamp: ${errorResult.timestamp}`,
      `Query: ${errorResult.query}`,
      `Status: ${errorResult.status}`,
      `Duration(ms): ${errorResult.duration}`,
      '',
      '--- Error ---',
      `Message: ${(errorResult as any).error?.message ?? 'unknown'}`,
      `Stack: ${(errorResult as any).error?.stack ?? 'none'}`,
    ].join('\n');

    fs.writeFileSync(errorMdOutputPath, errorMdContent, 'utf-8');
    console.log(`💾 Error plain md saved to: ${errorMdOutputPath}`);

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
