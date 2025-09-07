import "dotenv/config";
import { env } from "./env";
import { runDAGPipeline } from "./pipeline/dag-orchestrator";

async function main() {
  try {
    env.validate();
    
    const userQuery = env.USER_QUERY || process.argv[2];
    
    if (!userQuery?.trim()) {
      console.log('❌ No query provided!');
      console.log('📝 Please provide a cryptocurrency analysis query.');
      console.log('💡 Examples:');
      console.log('   • "Technical analysis on Bitcoin and Ethereum"');
      console.log('   • "Price prediction for Solana and Cardano"');
      console.log('   • "Market analysis of DeFi tokens"');
      console.log('\n🔧 Usage:');
      console.log('   npm start "your query here"');
      console.log('   or set USER_QUERY environment variable');
      return;
    }

  console.log(`🚀 Running DAG pipeline for: "${userQuery}"`);
  const ctx = await runDAGPipeline(userQuery);
  const result = ctx.finalReport || 'No report generated.';
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 CRYPTO ANALYSIS RESULTS');
    console.log('='.repeat(80));
    console.log(result);
    if (ctx.errors.length) {
      console.log('\n⚠️ Pipeline Warnings/Errors:');
      ctx.errors.forEach(e => console.log(' - ' + e));
    }
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Missing required environment variables')) {
        console.log('\n💡 Setup Instructions:');
        console.log('1. Copy .env.example to .env');
        console.log('2. Add your API keys to .env file');
        console.log('3. Minimum required: GOOGLE_API_KEY');
      }
    }
    
    process.exit(1);
  }
}

main().catch(console.error);
