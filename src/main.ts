import { agent as researchAgent } from './agents/research-agent/agent';
import { agent as analysisAgent } from './agents/analysis-agent/agent';
import { agent as coordinatorAgent } from './agents/coordinator/agent';
import { coinGeckoMarketData } from './agents/research-agent/tools';
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
        env.MAX_RETRIES
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
    // marketSummary is declared here so it's available when building finalResult
    let marketSummary = '';
    try {
      // Fetch structured market data (including indicators) for tokens mentioned in query
      try {
        console.log('🔎 Fetching CoinGecko market data (including indicators) for tokens...');
        // Call the coingecko market data tool directly (avoid relying on runner internals)
        const marketResp = await (coinGeckoMarketData as any).fn({ tokens: ['IQ', 'PEAR'] });
        if (marketResp && marketResp.success && marketResp.market_data) {
          for (const [id, coinRaw] of Object.entries(marketResp.market_data as any)) {
            const coin: any = coinRaw as any;
            const ind = coin.indicators;
            marketSummary += `\n- ${coin.name} (${String(coin.symbol || '').toUpperCase()}): price=${coin.current_price} USD`;
            if (ind) {
              marketSummary += `, RSI14=${ind.rsi_14?.toFixed ? ind.rsi_14.toFixed(2) : ind.rsi_14}`;
              marketSummary += `, MA20=${ind.ma_20?.toFixed ? ind.ma_20.toFixed(6) : ind.ma_20}`;
              marketSummary += `, MA50=${ind.ma_50?.toFixed ? ind.ma_50.toFixed(6) : ind.ma_50}`;
              marketSummary += `, MACD_hist=${ind.macd?.hist?.toFixed ? ind.macd.hist.toFixed(8) : ind.macd?.hist}`;
            } else if ((coin as any).indicators_error) {
              marketSummary += `, indicators_error=${(coin as any).indicators_error}`;
            }
            marketSummary += '\n';
          }
        } else {
          console.warn('coingecko_market_data tool did not return indicators; continuing without detailed indicators');
        }
      } catch (err: any) {
        console.warn('Failed to fetch market indicators via tool:', err?.message ?? err);
      }

      const dataToAnalyze = researchResult.trim()
        ? `Analyze this research data: ${researchResult}\n\nMarket Indicators Snapshot:${marketSummary}`
        : `Perform a general technical analysis on IQ token and PEAR Protocol based on your knowledge. Note: Research phase did not return data, so provide analysis based on available information.\n\nMarket Indicators Snapshot:${marketSummary}`;
      
      analysisResult = await retryWithBackoff(
        () => analysis.runner.ask(dataToAnalyze),
        env.LLM_MODEL, // Use the main model for analysis
        env.MAX_RETRIES
      );
      console.log('✅ Analysis completed');
      console.log('Analysis result preview:', analysisResult.substring(0, 200) + '...');
    } catch (error: any) {
      console.error('❌ Analysis phase failed. Error:', error?.message ?? error);
      if (error?.status === 503 || String(error?.message || '').toLowerCase().includes('unavailable') || String(error?.message || '').toLowerCase().includes('overload')) {
        console.log('⚠️ Detected service unavailable / overloaded model (503). Consider retrying later or using a smaller/less-busy model.');
      }

      if (error?.message?.includes("quota") || error?.status === 429) {
        const retryDelay = parseRetryDelay(error);
        console.log(`⏰ Quota exceeded. Recommended wait time: ${retryDelay / 1000} seconds`);
        console.log('🔗 To fix this issue permanently, consider upgrading to paid tier at: https://aistudio.google.com/app/apikey');
      }

      analysisResult = `Analysis failed due to API error: ${error?.message ?? JSON.stringify(error)}`;
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
      ...( { market_snapshot: marketSummary } as any ),
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
