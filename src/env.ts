import { env as processEnv } from "node:process";

export const env = {
  // Required API Keys
  OPENAI_API_KEY: processEnv.OPENAI_API_KEY!,
  GOOGLE_API_KEY: processEnv.GOOGLE_API_KEY!,
  
  // Optional API Keys
  EXA_API_KEY: processEnv.EXA_API_KEY,
  TAVILY_API_KEY: processEnv.TAVILY_API_KEY,
  COINGECKO_API_KEY: processEnv.COINGECKO_API_KEY,
  
  // Configuration
  LLM_MODEL: processEnv.LLM_MODEL || "gemini-2.5-flash",
  SEARCH_ENGINE: processEnv.SEARCH_ENGINE || "tavily",
  USER_QUERY: processEnv.USER_QUERY,
  
  // Validation
  validate() {
    const required = ['OPENAI_API_KEY', 'GOOGLE_API_KEY'];
    const missing = required.filter(key => !processEnv[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    console.log('✅ Environment variables validated');
  }
};
