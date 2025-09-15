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
    const fallbackModels = [env.QUERY_LLM_MODEL, env.LLM_MODEL]
      .concat((env.FALLBACK_MODELS || '').split(',').map(s => s.trim()).filter(Boolean))
      .filter((m, idx, arr) => arr.indexOf(m) === idx);

  const buildWithFallback = async <T extends { agent: any; runner: any }>(builder: (model?: string) => Promise<T>, preferred: string) => {
      const tried: string[] = [];
      for (const model of [preferred, ...fallbackModels]) {
        if (tried.includes(model)) continue;
        tried.push(model);
        try {
          const instance = await builder(model);
          return { instance, modelUsed: model };
          } catch (e) {
            continue;
          }
      }
      throw new Error('Unable to build agent with any model variant');
    };

    const { instance: tokenMarket, modelUsed: tokenMarketModel } = await buildWithFallback(require('./agents/token-market-agent/agent').agent, env.LLM_MODEL); // Use main model for token detection
    const { instance: webSearch, modelUsed: webSearchModel } = await buildWithFallback(require('./agents/web-search-agent/agent').agent, env.QUERY_LLM_MODEL); // Use query model for web search
    const { instance: marketData, modelUsed: marketDataModel } = await buildWithFallback(require('./agents/market-data-agent/agent').agent, 'gemini-1.5-flash-8b'); // Use 8b variant for market data
    const { instance: contentScraping, modelUsed: contentScrapingModel } = await buildWithFallback(require('./agents/content-scraping-agent/agent').agent, 'gemini-2.0-flash'); // Use 2.0 for content scraping
    const { instance: analysis, modelUsed: analysisModel } = await buildWithFallback(require('./agents/analysis-agent/agent').agent, env.LLM_MODEL); // Use main model for final analysis
    

    const { pipeline } = await buildPipeline({ 
      tokenMarket: tokenMarketModel, 
      webSearch: webSearchModel, 
      marketData: marketDataModel, 
      contentScraping: contentScrapingModel, 
      analysis: analysisModel 
    });

  console.log('Agents ready');
    
    const testQuery = env.USER_QUERY;
  console.log(`Running query: "${testQuery}"`);
    
    const sessionService = new InMemorySessionService();
    const session = await sessionService.createSession('crypto-analysis-app', 'user-default', {
      original_query: testQuery,
      current_step: 'init'
    });

    const appendState = async (author: string, delta: Record<string, any>, message: string) => {
      const event = new Event({ author, content: { parts: [{ text: message }] }, actions: new EventActions({ stateDelta: delta }), timestamp: Math.floor(Date.now() / 1000) });
      await sessionService.appendEvent(session, event);
    };

    const safeParseJson = (text: string): any => { try { const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/i, '').trim(); return JSON.parse(cleaned); } catch { return { raw: text }; } };

  const askWithModelFallback = async (runnerFactory: (model: string) => Promise<{ runner: any }>, prompt: string, primaryModel: string): Promise<string> => {
      const modelsToTry = [primaryModel, ...fallbackModels].filter((m, i, arr) => arr.indexOf(m) === i);
      let lastError: any;
      for (const model of modelsToTry) {
        try {
          const agentInstance = await runnerFactory(model);
          return await retryWithBackoff(() => agentInstance.runner.ask(prompt), model, env.MAX_RETRIES);
        } catch (err: any) {
          const msg = String(err?.message || '').toLowerCase();
          const code = err?.error?.status || err?.status || '';
          const isQuotaError = msg.includes('quota') || msg.includes('resource_exhausted') || err?.status === 429 || code === 'RESOURCE_EXHAUSTED';
          const isOverloadError = msg.includes('unavailable') || msg.includes('overloaded') || err?.status === 503 || code === 'UNAVAILABLE';
          const isTransient = isQuotaError || isOverloadError;
          if (!isTransient) throw err;
          let suggestedRetryMs = 0;
          if (isQuotaError && err?.error?.details) {
            try { const retryInfo = err.error.details.find((d: any) => d['@type']?.includes('RetryInfo')); if (retryInfo?.retryDelay) { const match = retryInfo.retryDelay.match(/(\d+)s/); if (match) suggestedRetryMs = parseInt(match[1]) * 1000; } } catch (e) {}
          }
          let delayMs = suggestedRetryMs || (modelsToTry.indexOf(model) * 5000 + 5000);
          if (isQuotaError && !suggestedRetryMs) delayMs = Math.max(60000, delayMs);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          lastError = err;
          continue;
        }
      }
      throw lastError || new Error('All models failed');
    };

  console.log('\n1. Token & Market phase...');
    let tokenMarketResultRaw = '';
    try {
      tokenMarketResultRaw = await askWithModelFallback(
        (model) => require('./agents/token-market-agent/agent').agent(model),
        testQuery,
        tokenMarketModel
      );
      const parsed = safeParseJson(tokenMarketResultRaw);
      if ((!parsed.tokens || parsed.tokens.length === 0) && !parsed.market_data_summary) {
        console.warn('⚠️ Token market step returned empty content – attempting one more fallback cycle with all models.');
        for (const model of fallbackModels) {
          if (model === tokenMarketModel) continue;
          try {
            const retryRaw = await retryWithBackoff(
              async () => {
                const rebuilt = await require('./agents/token-market-agent/agent').agent(model);
                return rebuilt.runner.ask(testQuery);
              },
              model,
              env.MAX_RETRIES
            );
            const retryParsed = safeParseJson(retryRaw);
            if (retryParsed.tokens?.length || retryParsed.market_data_summary) {
              tokenMarketResultRaw = retryRaw;
              Object.assign(parsed, retryParsed);
              break;
            }
          } catch (e) {
            console.warn(`Secondary fallback model ${model} also produced empty/failed output.`);
          }
        }
      }
      await appendState('token_market_agent', {
        current_step: 'token_market_done',
        detected_tokens: parsed.tokens || [],
        market_data_summary: parsed.market_data_summary || '',
        token_market_raw: parsed
      }, 'Token & Market data captured');
      console.log('✅ Token/Market step complete');
    } catch (error: any) {
      console.error('❌ Token/Market phase failed:', error?.message);
      await appendState('system', { token_market_error: error?.message, current_step: 'token_market_failed' }, 'Token market step failed');
    }

    console.log('⏳ Adding delay to prevent model overloading...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay

  console.log('\n2. Research Pipeline...');
  let researchResultRaw = '';
    try {
  console.log('   Web Search phase...');
      const webSearchResult = await askWithModelFallback(
        (model) => require('./agents/web-search-agent/agent').agent(model),
        `User Query: ${testQuery}\nDetected Tokens (from state): ${(session.state.detected_tokens || []).join(', ')}`,
        webSearchModel
      );
      
      await new Promise(resolve => setTimeout(resolve, 4000)); // Increased to 4 seconds
      
  console.log('   Market Data phase...');
      const marketDataResult = await askWithModelFallback(
        (model) => require('./agents/market-data-agent/agent').agent(model),
        `User Query: ${testQuery}\nDetected Tokens: ${(session.state.detected_tokens || []).join(', ')}\nWeb Search Results: ${webSearchResult}`,
        marketDataModel
      );
      
      await new Promise(resolve => setTimeout(resolve, 4000)); // Increased to 4 seconds
      
  console.log('   Content Scraping phase...');
      const contentScrapingResult = await askWithModelFallback(
        (model) => require('./agents/content-scraping-agent/agent').agent(model),
        `User Query: ${testQuery}\nWeb Search Results: ${webSearchResult}\nMarket Data: ${marketDataResult}`,
        contentScrapingModel
      );
      
      const safeParseResult = (result: string, name: string) => {
        try {
          return JSON.parse(result || '{}');
        } catch (e) {
          console.warn(`Failed to parse ${name} result, using fallback:`, e);
          return { error: `Failed to parse ${name} result`, raw: result };
        }
      };
      
      researchResultRaw = JSON.stringify({
        web_search: safeParseResult(webSearchResult, 'web search'),
        market_data: safeParseResult(marketDataResult, 'market data'),
        content_scraping: safeParseResult(contentScrapingResult, 'content scraping')
      });
      
      const parsed = safeParseJson(researchResultRaw);
      await appendState('specialized_research_pipeline', {
        current_step: 'research_done',
        web_search_queries: parsed.search_queries_used || [],
        web_top_findings: parsed.top_findings || '',
        web_sources: parsed.sources || [],
        web_scraped_excerpt: parsed.scraped_excerpt || '',
        combined_research_data: parsed
      }, 'Specialized research pipeline complete');
  console.log('✅ Research pipeline complete');
    } catch (error: any) {
      console.error('❌ Research Pipeline phase failed:', error?.message);
      await appendState('system', { research_error: error?.message, current_step: 'research_failed' }, 'Research pipeline failed');
    }

    console.log('⏳ Adding delay before analysis phase...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay before analysis

    console.log('\n3. Analysis phase...');
    let analysisResult: string;
    let marketSummary = '';
    try {
      try {
        console.log('🔎 Fetching CoinGecko market data (including indicators) for tokens...');
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
        } else {
          console.warn('coingecko_market_data tool did not return indicators; continuing without detailed indicators');
        }
      } catch (err: any) {
        console.warn('Failed to fetch market indicators via tool:', err?.message ?? err);
      }

      const researchComposite = `${session.state.market_data_summary || ''}\n\n${session.state.web_top_findings || ''}\n\n${session.state.web_scraped_excerpt || ''}`;
      const dataToAnalyze = researchComposite.trim()
        ? `Perform deep cryptocurrency analysis using the provided research & market context.\n\nRESEARCH CONTEXT:\n${researchComposite}\n\nMarket Indicators Snapshot:${marketSummary}`
        : `Perform a general technical analysis based on your knowledge. Note: earlier research steps returned little data.\n\nMarket Indicators Snapshot:${marketSummary}`;

      analysisResult = await retryWithBackoff(
        () => analysis.runner.ask(dataToAnalyze),
        analysisModel,
        env.MAX_RETRIES
      );
      console.log('✅ Analysis completed');
      await appendState('analysis_agent', {
        current_step: 'analysis_done',
        analysis_summary: analysisResult
      }, 'Analysis completed');
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
      await appendState('system', { analysis_error: analysisResult, current_step: 'analysis_failed' }, 'Analysis step failed');
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log('\n4. Validating analysis quality...');
    const researchData = (session.state.web_top_findings || '') + '\n' + (session.state.web_scraped_excerpt || '');
    const extractedTokens = extractTokensFromQuery(testQuery);
    const validation = validateAnalysisWorkflow(testQuery, researchResultRaw, analysisResult);
    
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
    
    const finalResult: AnalysisResult = {
      timestamp: new Date().toISOString(),
      query: testQuery,
      agents: {
        research: "specialized_research_pipeline",
        analysis: analysis.agent.name,
        pipeline: pipeline.name
      },
      results: {
        research: {
          data: researchData,
          preview: researchData.substring(0, 200) + '...'
        },
        analysis: {
          data: analysisResult,
          preview: analysisResult.substring(0, 200) + '...'
        }
      },
      validation: {
        score: validation.score,
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        extractedTokens: extractedTokens
      },
      ...( { market_snapshot: marketSummary } as any ),
      status: validation.isValid ? 'completed' : 'completed-with-issues',
      duration: duration
    };
    
    const outputDir = path.join(process.cwd(), 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const filename = `crypto-analysis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
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
