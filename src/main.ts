import { buildPipeline } from './agents/agent';
import { InMemorySessionService, Event, EventActions } from '@iqai/adk';
import { env } from './env';
import { retryWithBackoff, parseRetryDelay } from './utils/rate-limiter';
import { validateAnalysisWorkflow, extractTokensFromQuery } from './utils/agent-validation';
import * as fs from 'fs';
import * as path from 'path';

interface AnalysisResult {
  timestamp: string;
  query: string;
  agents: {
    research: string;
    analysis: string;
    pipeline: string;
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
  validation?: {
    score: number;
    isValid: boolean;
    errors: string[];
    warnings: string[];
    extractedTokens: string[];
  };
  status: 'completed' | 'failed' | 'completed-with-issues';
  duration?: number;
}

async function main() {
  const startTime = Date.now();
  
  try {
    console.log('Starting cryptocurrency analysis application...');
    
    // Build the sequential pipeline with model specifications
    const pipelineComponents = await buildPipeline({ 
      tokenMarket: env.LLM_MODEL,
      webSearch: env.QUERY_LLM_MODEL,
      marketData: 'gemini-1.5-flash-8b',
      contentScraping: 'gemini-2.0-flash',
      analysis: env.LLM_MODEL
    });

    const { pipeline, tokenMarket, webSearch, marketData, contentScraping, analysis } = pipelineComponents;

    console.log('Sequential pipeline ready');
    
    const testQuery = env.USER_QUERY;
    console.log(`Running query: "${testQuery}"`);
    
    const sessionService = new InMemorySessionService();
    const session = await sessionService.createSession('crypto-analysis-app', 'user-default', {
      original_query: testQuery,
      current_step: 'init'
    });

    const appendState = async (author: string, delta: Record<string, any>, message: string) => {
      const event = new Event({ 
        author, 
        content: { parts: [{ text: message }] }, 
        actions: new EventActions({ stateDelta: delta }), 
        timestamp: Math.floor(Date.now() / 1000) 
      });
      await sessionService.appendEvent(session, event);
    };

    const safeParseJson = (text: string): any => { 
      try { 
        const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/i, '').trim(); 
        return JSON.parse(cleaned); 
      } catch { 
        return { raw: text }; 
      } 
    };

    // Helper functions to extract structured data from narrative text
    const extractSearchQueries = (text: string): string[] => {
      const queries: string[] = [];
      const lines = text.split('\n');
      let inQueriesSection = false;
      
      for (const line of lines) {
        if (line.includes('Search Queries') || line.includes('queries')) {
          inQueriesSection = true;
          continue;
        }
        if (inQueriesSection && line.trim().startsWith('-')) {
          const query = line.replace(/^.*?["']([^"']+)["'].*?$/, '$1');
          if (query && query !== line) {
            queries.push(query);
          }
        }
        if (inQueriesSection && line.includes('###') && !line.includes('Query')) {
          inQueriesSection = false;
        }
      }
      return queries.length > 0 ? queries : ['IQ token technical analysis', 'PEAR Protocol analysis'];
    };

    const extractSources = (text: string): string[] => {
      const sources: string[] = [];
      const urlRegex = /https?:\/\/[^\s\)]+/g;
      const matches = text.match(urlRegex);
      if (matches) {
        sources.push(...matches.slice(0, 10)); // Limit to first 10 sources
      }
      return sources;
    };

    const extractTopFindings = (text: string): string => {
      const lines = text.split('\n');
      let findingsText = '';
      let inFindingsSection = false;
      
      for (const line of lines) {
        if (line.includes('Top Findings') || line.includes('Findings')) {
          inFindingsSection = true;
          continue;
        }
        if (inFindingsSection && line.includes('###') && !line.includes('Finding')) {
          break;
        }
        if (inFindingsSection && line.trim()) {
          findingsText += line + '\n';
        }
      }
      
      return findingsText.trim() || 'Analysis findings extracted from web search results.';
    };

    console.log('\n🚀 Running sequential agent pipeline manually...');
    
    let pipelineResult = '';
    let stepResults: any[] = [];
    
    try {
      console.log('   Step 1: Token Market Detection...');
      const step1Result = await retryWithBackoff(
        () => tokenMarket.runner.ask(testQuery),
        'token-market',
        env.MAX_RETRIES || 3
      );
      stepResults.push({ step: 'tokenMarket', result: step1Result });
      console.log('   ✅ Token Market step complete');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('   Step 2: Web Search...');
      const step2Input = `User Query: ${testQuery}\nToken Market Data: ${step1Result}`;
      const step2Result = await retryWithBackoff(
        () => webSearch.runner.ask(step2Input),
        'web-search',
        env.MAX_RETRIES || 3
      );
      stepResults.push({ step: 'webSearch', result: step2Result });
      console.log('   ✅ Web Search step complete');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('   Step 3: Market Data Analysis...');
      const step3Input = `User Query: ${testQuery}\nToken Market Data: ${step1Result}\nWeb Search Results: ${step2Result}`;
      const step3Result = await retryWithBackoff(
        () => marketData.runner.ask(step3Input),
        'market-data',
        env.MAX_RETRIES || 3
      );
      stepResults.push({ step: 'marketData', result: step3Result });
      console.log('   ✅ Market Data step complete');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('   Step 4: Content Scraping...');
      const step4Input = `User Query: ${testQuery}\nWeb Search Results: ${step2Result}\nMarket Data: ${step3Result}`;
      const step4Result = await retryWithBackoff(
        () => contentScraping.runner.ask(step4Input),
        'content-scraping',
        env.MAX_RETRIES || 3
      );
      stepResults.push({ step: 'contentScraping', result: step4Result });
      console.log('   ✅ Content Scraping step complete');
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('   Step 5: Final Analysis...');
      const step5Input = `User Query: ${testQuery}\nResearch Data: ${step2Result}\nMarket Data: ${step3Result}\nContent: ${step4Result}`;
      const step5Result = await retryWithBackoff(
        () => analysis.runner.ask(step5Input),
        'final-analysis',
        env.MAX_RETRIES || 3
      );
      stepResults.push({ step: 'analysis', result: step5Result });
      console.log('   ✅ Final Analysis step complete');
      
      // Combine all results
      pipelineResult = JSON.stringify({
        query: testQuery,
        steps: stepResults,
        finalAnalysis: step5Result,
        executionFlow: 'sequential_manual'
      });
      
      console.log('✅ Sequential pipeline completed successfully');
      
      // Update session state with pipeline results
      await appendState('sequential_pipeline_manual', {
        current_step: 'pipeline_complete',
        step_results: stepResults,
        final_analysis: step5Result,
        pipeline_raw: pipelineResult
      }, 'Sequential pipeline execution completed');
      
    } catch (error: any) {
      console.error('❌ Sequential pipeline failed:', error?.message);
      
      // Handle specific error types
      if (error?.status === 503 || String(error?.message || '').toLowerCase().includes('unavailable')) {
        console.log('⚠️ Service unavailable. Consider retrying later or using different models.');
      }
      
      if (error?.message?.includes("quota") || error?.status === 429) {
        const retryDelay = parseRetryDelay(error);
        console.log(`⏰ Quota exceeded. Recommended wait time: ${retryDelay / 1000} seconds`);
        console.log('🔗 Consider upgrading at: https://aistudio.google.com/app/apikey');
      }
      
      pipelineResult = JSON.stringify({
        error: `Pipeline execution failed: ${error?.message ?? JSON.stringify(error)}`,
        completedSteps: stepResults,
        executionFlow: 'sequential_manual_failed'
      });
      
      await appendState('system', { 
        pipeline_error: error?.message, 
        current_step: 'pipeline_failed',
        completed_steps: stepResults.length
      }, 'Sequential pipeline failed');
    }

    console.log('\n📊 Fetching additional market indicators...');
    let marketSummary = '';
    try {
      console.log('🔎 Fetching CoinGecko market data for enhanced analysis...');
      const { fetchCoinGeckoMarketData } = require('./agents/market-data-agent/tools');
      const marketResp = await fetchCoinGeckoMarketData(['IQ', 'PEAR']);
      
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
      }
    } catch (err: any) {
      console.warn('Failed to fetch market indicators:', err?.message ?? err);
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n🔍 Validating analysis quality...');
    const extractedTokens = extractTokensFromQuery(testQuery);
    const validation = validateAnalysisWorkflow(testQuery, pipelineResult, pipelineResult);
    
    console.log(`📊 Validation Results:`);
    console.log(`   Quality Score: ${validation.score}/100`);
    console.log(`   Valid: ${validation.isValid ? '✅' : '❌'}`);
    console.log(`   Extracted Tokens: ${extractedTokens.join(', ') || 'None'}`);
    
    if (validation.errors.length > 0) {
      console.log(`   Errors: ${validation.errors.length}`);
      validation.errors.forEach(error => console.log(`     ❌ ${error}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log(`   Warnings: ${validation.warnings.length}`);
      validation.warnings.forEach(warning => console.log(`     ⚠️ ${warning}`));
    }
    
    const parsedPipelineResult = safeParseJson(pipelineResult);
    
    // Extract research data from the pipeline steps
    const webSearchStep = parsedPipelineResult.steps?.find((s: any) => s.step === 'webSearch')?.result || '';
    const marketDataStep = parsedPipelineResult.steps?.find((s: any) => s.step === 'marketData')?.result || '';
    const contentScrapingStep = parsedPipelineResult.steps?.find((s: any) => s.step === 'contentScraping')?.result || '';
    
    // Try to extract structured data from webSearch step for validation
    let extractedSearchData = {};
    if (webSearchStep) {
      // Try to extract search queries, sources, and findings from the web search narrative
      const searchQueries = extractSearchQueries(webSearchStep);
      const sources = extractSources(webSearchStep);
      const topFindings = extractTopFindings(webSearchStep);
      
      extractedSearchData = {
        search_queries_used: searchQueries,
        sources: sources,
        top_findings: topFindings
      };
    }
    
    // Try to extract scraped excerpt from content scraping step
    let scrapedExcerpt = '';
    if (contentScrapingStep) {
      const scrapedData = safeParseJson(contentScrapingStep);
      scrapedExcerpt = scrapedData.scraped_excerpt || contentScrapingStep.substring(0, 200);
    }
    
    const researchData = JSON.stringify({
      web_search: {
        raw_result: webSearchStep,
        ...extractedSearchData
      },
      market_data: {
        raw_result: marketDataStep
      },
      content_scraping: {
        raw_result: contentScrapingStep,
        scraped_excerpt: scrapedExcerpt
      }
    });
    
    const analysisData = parsedPipelineResult.analysis || pipelineResult;
    
    const finalResult: AnalysisResult = {
      timestamp: new Date().toISOString(),
      query: testQuery,
      agents: {
        research: "sequential_pipeline_research",
        analysis: "sequential_pipeline_analysis", 
        pipeline: pipeline.name
      },
      results: {
        research: {
          data: researchData,
          preview: researchData.substring(0, 200) + '...'
        },
        analysis: {
          data: typeof analysisData === 'string' ? analysisData : JSON.stringify(analysisData),
          preview: (typeof analysisData === 'string' ? analysisData : JSON.stringify(analysisData)).substring(0, 200) + '...'
        }
      },
      validation: {
        score: validation.score,
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        extractedTokens: extractedTokens
      },
      ...(marketSummary && { market_snapshot: marketSummary } as any),
      status: validation.isValid ? 'completed' : 'completed-with-issues',
      duration: duration
    };
    
    // Save results
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `crypto-analysis-sequential-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const outputPath = path.join(outputDir, filename);
    
    fs.writeFileSync(outputPath, JSON.stringify(finalResult, null, 2), 'utf-8');

    const textFilename = filename.replace(/\.json$/, '.txt');
    const textOutputPath = path.join(outputDir, textFilename);

    const textContent = [
      `Timestamp: ${finalResult.timestamp}`,
      `Query: ${finalResult.query}`,
      `Agents: Pipeline=${finalResult.agents.pipeline}, Research=${finalResult.agents.research}, Analysis=${finalResult.agents.analysis}`,
      `Status: ${finalResult.status}`,
      `Duration(ms): ${finalResult.duration}`,
      '',
      '--- Validation Results ---',
      `Quality Score: ${validation.score}/100`,
      `Valid: ${validation.isValid}`,
      `Extracted Tokens: ${extractedTokens?.join(', ') || 'None'}`,
      ...(validation.errors.length > 0 ? [`Errors: ${validation.errors.join('; ')}`] : []),
      ...(validation.warnings.length > 0 ? [`Warnings: ${validation.warnings.join('; ')}`] : []),
      '',
      '--- Sequential Pipeline Full Result ---',
      pipelineResult,
      '',
      ...(marketSummary ? ['--- Market Indicators Snapshot ---', marketSummary, ''] : []),
      '--- Research Data (Structured) ---',
      finalResult.results.research.data,
      '',
      '--- Analysis Data (Structured) ---',
      finalResult.results.analysis.data,
    ].join('\n');

    fs.writeFileSync(textOutputPath, textContent, 'utf-8');
    console.log('\n🎉 Sequential workflow completed successfully!');
    console.log(`💾 Results saved to: ${outputPath}`);
    console.log(`💾 Plain text summary saved to: ${textOutputPath}`);
    
  } catch (error) {
    console.error('❌ Application failed:', error);
    
    const errorResult: AnalysisResult = {
      timestamp: new Date().toISOString(),
      query: env.USER_QUERY,
      agents: {
        research: "unknown", 
        analysis: "unknown",
        pipeline: "unknown"
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
    
    const filename = `crypto-analysis-sequential-error-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
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
      `# Sequential Pipeline Error Report`,
      `**Timestamp:** ${errorResult.timestamp}`,
      `**Query:** ${errorResult.query}`,
      `**Status:** ${errorResult.status}`,
      `**Duration(ms):** ${errorResult.duration}`,
      '',
      '## Error Details',
      `**Message:** ${(errorResult as any).error?.message ?? 'unknown'}`,
      '',
      '**Stack Trace:**',
      '```',
      `${(errorResult as any).error?.stack ?? 'none'}`,
      '```'
    ].join('\n');

    fs.writeFileSync(errorMdOutputPath, errorMdContent, 'utf-8');
    console.log(`💾 Error markdown report saved to: ${errorMdOutputPath}`);

    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
