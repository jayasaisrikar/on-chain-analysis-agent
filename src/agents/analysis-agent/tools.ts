import { createTool } from "@iqai/adk";
import { z } from "zod";

export const analyzeDataTool = createTool({
  name: "analyze_data",
  description: "Analyzes cryptocurrency data and generates insights",
  schema: z.object({
    data: z.string(),
    analysisType: z.enum(["technical", "fundamental", "sentiment", "comprehensive"])
  }),
  fn: async ({ data, analysisType }) => {
    const timestamp = new Date().toISOString();
    
    return {
      analysisType,
      timestamp,
      summary: `${analysisType} analysis completed`,
      insights: [
        `Data received: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`,
        `Analysis type: ${analysisType}`,
        `Timestamp: ${timestamp}`
      ],
      status: 'completed'
    };
  },
});
