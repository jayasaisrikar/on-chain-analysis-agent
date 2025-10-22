import { createTool } from "@iqai/adk";
import { z } from "zod";

// Web Search Tool (simplified Tavily integration)
export const webSearchTool = createTool({
  name: "web_search",
  description: "Search the internet for cryptocurrency news and information using Tavily API",
  schema: z.object({
    queries: z.array(z.string()).describe("Array of search queries for cryptocurrency research")
  }),
  fn: async ({ queries }) => {
    try {
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          error: "Tavily API key not found. Please set TAVILY_API_KEY environment variable.",
          queries,
          source: "tavily"
        };
      }

      const results: any[] = [];
      for (const query of queries) {
        try {
          const response = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              api_key: apiKey,
              query: query,
              search_depth: "basic",
              include_answer: true,
              max_results: 5,
              include_domains: [],
              exclude_domains: [],
            }),
          });

          if (!response.ok) {
            results.push({
              query,
              error: `Tavily API error (${response.status})`,
              success: false
            });
            continue;
          }

          const data = await response.json() as any;
          if (data?.results?.length) {
            let searchResult = {
              query,
              answer: data.answer || null,
              results: data.results.slice(0, 3).map((result: any) => ({
                title: result.title,
                url: result.url,
                content: result.content?.substring(0, 300) + "...",
                score: result.score
              })),
              success: true,
              result_count: data.results.length
            };
            results.push(searchResult);
          } else {
            results.push({
              query,
              error: "No search results found",
              success: false
            });
          }
        } catch (queryError) {
          results.push({
            query,
            error: `Search failed: ${String(queryError)}`,
            success: false
          });
        }
      }

      return {
        success: true,
        searches: results,
        total_queries: queries.length,
        successful_queries: results.filter(r => r.success).length,
        source: "tavily",
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      const msg = typeof e === "object" && e && "message" in e 
        ? (e as { message: string }).message 
        : String(e);
      return {
        success: false,
        error: `Web search unavailable: ${msg}`,
        queries,
        source: "tavily",
        timestamp: new Date().toISOString()
      };
    }
  }
});