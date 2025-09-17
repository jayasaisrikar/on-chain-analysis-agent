import { createTool } from "@iqai/adk";
import { z } from "zod";

function getCurrentMonthYear(): string {
  const d = new Date();
  return `${d.toLocaleString('default', { month: 'long' })} ${d.getFullYear()}`;
}

export const synonymGeneratorTool = createTool({
  name: "synonym_generator",
  description: "Generate numbered synonym search queries for detected crypto tokens",
  schema: z.object({
    tokens: z.array(z.string()).describe('Array of detected token names or symbols'),
    original_query: z.string().optional()
  }),
  fn: async ({ tokens, original_query }) => {
    try {
      const monthYear = getCurrentMonthYear();

      if (!tokens || tokens.length === 0) {
        return {
          success: false,
          error: 'No tokens provided. Synonym generator requires at least one crypto token.',
        };
      }

      const unique = [...new Set(tokens.map(t => t.trim()).filter(Boolean))];

      const out: Record<string, string> = {};
      let idx = 1;

      for (const tk of unique) {
        const base = tk.replace(/\s+/g, ' ');

        const candidates = [
          `${base} price ${monthYear}`,
          `factors driving ${base} price ${monthYear}`,
          `${base} market analysis ${monthYear}`,
        ];

        for (const c of candidates.slice(0, 3)) {
          out[String(idx++)] = c;
        }
      }

      return {
        success: true,
        synonyms: out,
        count: Object.keys(out).length,
        original_query: original_query || null,
        generated_at: new Date().toISOString(),
      };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }
});
