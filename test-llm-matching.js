import { MarketDataService } from './src/services/market-data.js';

async function testLLMMatching() {
  console.log('🧪 Testing LLM-based token matching...\n');
  
  const marketDataService = new MarketDataService();
  
  // Initialize knowledge base
  console.log('📦 Setting up knowledge base...');
  await marketDataService.setupKnowledgeBase();
  
  // Test cases
  const testCases = [
    {
      description: "Exact symbol match (should be VALID)",
      query: "BTC analysis"
    },
    {
      description: "Exact name match (should be VALID)", 
      query: "Bitcoin price prediction"
    },
    {
      description: "Partial name match (should be VALID)",
      query: "ETH technical analysis"
    },
    {
      description: "Common abbreviation (should be VALID)",
      query: "SOL price trends"
    },
    {
      description: "Obscure or non-existent token (should be INVALID)",
      query: "RANDOMCOIN123 analysis"
    },
    {
      description: "Generic term (should be INVALID)", 
      query: "coin price prediction"
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🔍 Test: ${testCase.description}`);
    console.log(`Query: "${testCase.query}"`);
    
    try {
      const result = await marketDataService.retrieveCoinIDs(testCase.query);
      
      if ('error' in result) {
        console.log(`❌ Result: REJECTED - ${result.error}`);
        if (result.suggestions) {
          console.log(`💡 Suggestions: ${result.suggestions.map(s => s.name).join(', ')}`);
        }
      } else {
        console.log(`✅ Result: ACCEPTED - Found ${result.length} tokens`);
        console.log(`🪙 Tokens: ${result.map(r => `${r.name} (${r.symbol})`).join(', ')}`);
      }
    } catch (error) {
      console.error(`💥 Error: ${error}`);
    }
  }
  
  console.log('\n🎉 Testing completed!');
}

// Run the test
testLLMMatching().catch(console.error);
