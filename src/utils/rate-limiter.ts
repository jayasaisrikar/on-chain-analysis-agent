/**
 * Rate limiter utility for Google Gemini API
 * Helps prevent quota exceeded errors by implementing delays and retry logic
 */

interface RateLimitConfig {
  tokensPerMinute: number;
  requestsPerMinute: number;
  retryDelayMs: number;
  maxRetries: number;
}

// Free tier limits for Gemini models
export const FREE_TIER_LIMITS: Record<string, RateLimitConfig> = {
  "gemini-2.5-flash": {
    tokensPerMinute: 250_000,
    requestsPerMinute: 10,
    retryDelayMs: 60_000, // 1 minute
    maxRetries: 3,
  },
  "gemini-2.0-flash": {
    tokensPerMinute: 1_000_000,
    requestsPerMinute: 15,
    retryDelayMs: 60_000, // 1 minute
    maxRetries: 3,
  },
  "gemini-2.5-pro": {
    tokensPerMinute: 250_000,
    requestsPerMinute: 5,
    retryDelayMs: 60_000, // 1 minute
    maxRetries: 3,
  },
  // Optimized models without thinking mode by default
  "gemini-1.5-flash": {
    tokensPerMinute: 250_000,
    requestsPerMinute: 15,
    retryDelayMs: 60_000, // 1 minute
    maxRetries: 3,
  },
  "gemini-1.5-flash-8b": {
    tokensPerMinute: 250_000,
    requestsPerMinute: 15,
    retryDelayMs: 60_000, // 1 minute
    maxRetries: 3,
  },
};

class RateLimiter {
  private requestCounts: Map<string, number[]> = new Map();
  private lastRequestTime: Map<string, number> = new Map();

  /**
   * Check if a request can be made for the given model
   */
  canMakeRequest(model: string): boolean {
    const config = FREE_TIER_LIMITS[model];
    if (!config) return true; // Unknown model, allow request

    const now = Date.now();
    const requests = this.requestCounts.get(model) || [];
    
    // Remove requests older than 1 minute
    const recentRequests = requests.filter(time => now - time < 60_000);
    
    // Check if we're under the request limit
    return recentRequests.length < config.requestsPerMinute;
  }

  /**
   * Record a request for rate limiting
   */
  recordRequest(model: string): void {
    const now = Date.now();
    const requests = this.requestCounts.get(model) || [];
    requests.push(now);
    
    // Keep only requests from the last minute
    const recentRequests = requests.filter(time => now - time < 60_000);
    this.requestCounts.set(model, recentRequests);
    this.lastRequestTime.set(model, now);
  }

  /**
   * Get recommended delay before next request
   */
  getRecommendedDelay(model: string): number {
    const config = FREE_TIER_LIMITS[model];
    if (!config) return 0;

    const lastRequest = this.lastRequestTime.get(model);
    if (!lastRequest) return 0;

    const timeSinceLastRequest = Date.now() - lastRequest;
    const minDelay = 60_000 / config.requestsPerMinute; // Spread requests evenly

    return Math.max(0, minDelay - timeSinceLastRequest);
  }

  /**
   * Wait for the recommended delay
   */
  async waitForNextRequest(model: string): Promise<void> {
    const delay = this.getRecommendedDelay(model);
    if (delay > 0) {
      console.log(`⏳ Rate limiting: waiting ${Math.round(delay / 1000)}s before next ${model} request`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export const rateLimiter = new RateLimiter();

/**
 * Retry function with exponential backoff for quota errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  model: string,
  maxRetries: number = 3
): Promise<T> {
  const config = FREE_TIER_LIMITS[model] || { retryDelayMs: 60_000, maxRetries: 3 };
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Wait for rate limit before making request
      await rateLimiter.waitForNextRequest(model);

      // Record the request
      rateLimiter.recordRequest(model);

      // Make the request
      const result = await fn();
      return result;
    } catch (error: any) {
      // Determine if the error is transient (retryable)
      const msg = String(error?.message || error?.error?.message || "").toLowerCase();
      const isQuotaError = msg.includes("quota") || msg.includes("429") || error?.status === 429;
      const isUnavailable = msg.includes("overload") || msg.includes("overloaded") || error?.status === 503 || error?.error?.code === 503 || error?.error?.status === 'UNAVAILABLE';
      const isServerError = (error?.status && error.status >= 500 && error.status < 600) || isUnavailable;

      const shouldRetry = (isQuotaError || isServerError) && attempt < maxRetries;

      if (shouldRetry) {
        const baseDelay = config.retryDelayMs || 60_000;
        const exponential = baseDelay * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * Math.min(1000, exponential));
        const delay = exponential + jitter;

        const reason = isQuotaError ? 'quota/429' : isUnavailable ? 'service-unavailable/503' : 'server-error';
        console.log(`🚨 Transient error (${reason}) on attempt ${attempt}/${maxRetries}. Retrying in ${Math.round(delay/1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts due to transient errors`);
}

/**
 * Helper to parse retry delay from Google API error response
 */
export function parseRetryDelay(error: any): number {
  try {
    if (error?.details) {
      for (const detail of error.details) {
        if (detail["@type"]?.includes("RetryInfo") && detail.retryDelay) {
          // Parse duration like "41s" to milliseconds
          const match = detail.retryDelay.match(/(\d+)s/);
          if (match) {
            return parseInt(match[1]) * 1000;
          }
        }
      }
    }
  } catch (e) {
    // Ignore parsing errors
  }
  
  return 60_000; // Default to 1 minute
}
