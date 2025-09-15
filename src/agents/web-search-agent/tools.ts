import { createTool } from "@iqai/adk";
import { z } from "zod";

interface ExaResult {
  url: string;
  title: string;
  publishedDate: string;
  query: string;
}

export const tavilySearch = createTool({
  name: "tavily_search",
  description: "Searches the web using Tavily API for multiple queries with rate limiting",
  schema: z.object({
    queries: z.array(z.string()),
    numResults: z.number().optional().default(5),
    recentDays: z.number().optional()
  }),
  fn: async ({ queries, numResults, recentDays }) => {
    console.debug('[tool:tavily_search] invoked, queries=', queries.length, 'numResults=', numResults, 'recentDays=', recentDays);
    
    if (!process.env.TAVILY_API_KEY) {
      console.warn('[tool:tavily_search] TAVILY_API_KEY not set - returning mocked results for local development');
      const mockResults = queries.map((q, i) => ({
        url: `https://example.com/mock-${i}`,
        title: `Mock result for: ${q}`,
        publishedDate: new Date().toISOString(),
        query: q
      }));
      return { results: mockResults, total: mockResults.length };
    }

    const axios = (await import('axios')).default;
    const allResults: ExaResult[] = [];

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const response = await axios.post('https://api.tavily.com/search', {
          query,
          search_depth: 'basic',
          max_results: Math.min(numResults, 3),
          include_answer: false,
          include_images: false
        }, {
          headers: {
            'Authorization': `Bearer ${process.env.TAVILY_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });

        if (response.data?.results) {
          const results: ExaResult[] = response.data.results.map((result: any) => ({
            url: result.url,
            title: result.title,
            publishedDate: result.published_date || new Date().toISOString(),
            query: query
          }));
          allResults.push(...results);
        }
      } catch (error: any) {
        console.error('[tool:tavily_search] Error searching for query:', query, error?.response?.data || error?.message || error);
        
        if (error?.response?.status === 429 || error?.message?.includes('rate limit')) {
          console.warn('[tool:tavily_search] Rate limit hit, adding longer delay');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
        if (error?.response?.status === 401 || error?.message?.includes('401') || error?.message?.includes('Unauthorized')) {
          console.warn('[tool:tavily_search] API key authentication failed.');
          console.warn('[tool:tavily_search] Response details:', error?.response?.data);
          console.warn('[tool:tavily_search] Make sure TAVILY_API_KEY is valid and has credits remaining');
        }
        
        allResults.push({
          url: `https://error.com/${encodeURIComponent(query)}`,
          title: `Error searching for: ${query} (${error?.response?.status || 'API Error'})`,
          publishedDate: new Date().toISOString(),
          query: query
        });
      }
    }

    return { results: allResults, total: allResults.length };
  },
});