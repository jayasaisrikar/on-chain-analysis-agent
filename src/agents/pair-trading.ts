import { AgentBuilder } from "@iqai/adk";
import { openai } from "@ai-sdk/openai";
import { config } from "../config.js";
import { CorrelationService, CorrelationData } from "../services/correlation.js";
import { MarketDataService } from "../services/market-data.js";

export interface PairSignal {
  id: string;
  timestamp: string;
  longAsset: AssetInfo;
  shortAsset: AssetInfo;
  signalType: 'mean_reversion' | 'correlation_breakdown' | 'fundamental_divergence';
  confidence: number;
  expectedDuration: '1d' | '1w' | '1m';
  entryRatio: number;
  targetRatio: number;
  stopLossRatio: number;
  reasoning: string;
  historicalCorrelation: number;
  currentCorrelation: number;
  fundamentalCatalysts: string[];
}

export interface AssetInfo {
  id: string;
  symbol: string;
  name: string;
  currentPrice: number;
}

export class PairTradingAnalyzer {
  private correlationService: CorrelationService;
  public marketDataService: MarketDataService;

  constructor() {
    this.correlationService = new CorrelationService();
    this.marketDataService = new MarketDataService();
  }

  async setup(): Promise<void> {
    await this.marketDataService.setupKnowledgeBase();
  }

  async analyzePair(asset1Id: string, asset2Id: string): Promise<PairSignal | null> {
    try {
      const [correlations, marketData] = await Promise.all([
        this.getMultiTimeframeCorrelations(asset1Id, asset2Id),
        this.marketDataService.fetchDetailedCoinData([
          { id: asset1Id, name: asset1Id },
          { id: asset2Id, name: asset2Id }
        ])
      ]);

      if (!correlations || Object.keys(marketData).length < 2) {
        return null;
      }

      const signal = await this.generatePairSignal(correlations, marketData);
      return signal;
    } catch (error) {
      console.error('Error analyzing pair:', error);
      return null;
    }
  }

  private async getMultiTimeframeCorrelations(
    asset1Id: string, 
    asset2Id: string
  ): Promise<{ [key: string]: CorrelationData } | null> {
    const periods: Array<'30d' | '90d' | '1y'> = ['30d', '90d', '1y'];
    const correlations: { [key: string]: CorrelationData } = {};

    for (const period of periods) {
      const correlation = await this.correlationService.analyzeCorrelation(asset1Id, asset2Id, period);
      if (correlation) {
        correlations[period] = correlation;
      }
    }

    return Object.keys(correlations).length > 0 ? correlations : null;
  }

  private async generatePairSignal(
    correlations: { [key: string]: CorrelationData },
    marketData: any
  ): Promise<PairSignal | null> {
    const correlation30d = correlations['30d'];
    const correlation90d = correlations['90d'];
    const correlation1y = correlations['1y'];

    if (!correlation30d || !marketData[correlation30d.asset1] || !marketData[correlation30d.asset2]) {
      return null;
    }

    const asset1Data = marketData[correlation30d.asset1];
    const asset2Data = marketData[correlation30d.asset2];

    const signalAnalysisPrompt = `
You are an expert pair trading analyst. Analyze the following correlation data and market information to generate a pair trading signal.

CORRELATION ANALYSIS:
30-day correlation: ${correlation30d.correlation.toFixed(3)}
90-day correlation: ${correlation90d?.correlation.toFixed(3) || 'N/A'}
1-year correlation: ${correlation1y?.correlation.toFixed(3) || 'N/A'}

PAIR RATIO ANALYSIS:
Current ratio: ${correlation30d.priceRatio.toFixed(4)}
Mean ratio (30d): ${correlation30d.meanPriceRatio.toFixed(4)}
Z-score: ${correlation30d.zscore.toFixed(2)}

MARKET DATA:
${asset1Data.name}: $${asset1Data.current_price} (24h: ${asset1Data.price_change_24h?.toFixed(2)}%)
${asset2Data.name}: $${asset2Data.current_price} (24h: ${asset2Data.price_change_24h?.toFixed(2)}%)

SIGNAL GENERATION RULES:
1. Mean Reversion: Z-score > 2 or < -2 indicates strong divergence
2. Correlation Breakdown: 30d correlation significantly different from longer-term
3. Confidence: Rate 1-10 based on statistical significance and market conditions

Respond with a JSON object containing:
{
  "hasSignal": boolean,
  "signalType": "mean_reversion" | "correlation_breakdown" | "fundamental_divergence",
  "confidence": number (1-10),
  "longAsset": "${correlation30d.asset1}" or "${correlation30d.asset2}",
  "shortAsset": "${correlation30d.asset2}" or "${correlation30d.asset1}",
  "expectedDuration": "1d" | "1w" | "1m",
  "targetRatio": number,
  "stopLossRatio": number,
  "reasoning": "Detailed explanation of the signal"
}`;

    const agent = await AgentBuilder
      .create("pair_signal_generator")
      .withModel(openai(config.openai.model))
      .withDescription("Expert pair trading signal generator")
      .withInstruction("Generate pair trading signals based on correlation analysis and market data")
      .build();

    const result = await agent.runner.ask(signalAnalysisPrompt);
    const response = typeof result === 'string' ? result : JSON.stringify(result);

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const signalData = JSON.parse(jsonMatch[0]);
      
      if (!signalData.hasSignal) return null;

      const signal: PairSignal = {
        id: `${correlation30d.asset1}-${correlation30d.asset2}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        longAsset: {
          id: signalData.longAsset,
          symbol: marketData[signalData.longAsset].symbol,
          name: marketData[signalData.longAsset].name,
          currentPrice: marketData[signalData.longAsset].current_price
        },
        shortAsset: {
          id: signalData.shortAsset,
          symbol: marketData[signalData.shortAsset].symbol,
          name: marketData[signalData.shortAsset].name,
          currentPrice: marketData[signalData.shortAsset].current_price
        },
        signalType: signalData.signalType,
        confidence: signalData.confidence,
        expectedDuration: signalData.expectedDuration,
        entryRatio: correlation30d.priceRatio,
        targetRatio: signalData.targetRatio,
        stopLossRatio: signalData.stopLossRatio,
        reasoning: signalData.reasoning,
        historicalCorrelation: correlation90d?.correlation || correlation30d.correlation,
        currentCorrelation: correlation30d.correlation,
        fundamentalCatalysts: []
      };

      return signal;
    } catch (error) {
      console.error('Error parsing signal response:', error);
      return null;
    }
  }

  async analyzeMultiplePairs(assetIds: string[]): Promise<PairSignal[]> {
    const signals: PairSignal[] = [];
    
    for (let i = 0; i < assetIds.length; i++) {
      for (let j = i + 1; j < assetIds.length; j++) {
        const signal = await this.analyzePair(assetIds[i], assetIds[j]);
        if (signal) {
          signals.push(signal);
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return signals.sort((a, b) => b.confidence - a.confidence);
  }
}
