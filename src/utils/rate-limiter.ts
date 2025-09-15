interface RateLimitConfig {
  tokensPerMinute: number;
  requestsPerMinute: number;
  retryDelayMs: number;
  maxRetries: number;
}

export const FREE_TIER_LIMITS: Record<string, RateLimitConfig & { dailyLimit?: number }> = {
  "gemini-2.5-flash": {
    tokensPerMinute: 250_000,
    requestsPerMinute: 10,
    retryDelayMs: 60_000,
    maxRetries: 3,
    dailyLimit: 50,
  },
  "gemini-2.0-flash": {
    tokensPerMinute: 1_000_000,
    requestsPerMinute: 15,
    retryDelayMs: 60_000,
    maxRetries: 3,
    dailyLimit: 50,
  },
  "gemini-2.5-pro": {
    tokensPerMinute: 250_000,
    requestsPerMinute: 5,
    retryDelayMs: 60_000,
    maxRetries: 3,
    dailyLimit: 50,
  },
  "gemini-1.5-flash": {
    tokensPerMinute: 250_000,
    requestsPerMinute: 15,
    retryDelayMs: 60_000,
    maxRetries: 3,
    dailyLimit: 50,
  },
  "gemini-1.5-flash-8b": {
    tokensPerMinute: 250_000,
    requestsPerMinute: 15,
    retryDelayMs: 60_000,
    maxRetries: 3,
    dailyLimit: 50,
  },
};

class RateLimiter {
  private requestCounts: Map<string, number[]> = new Map();
  private dailyRequestCounts: Map<string, { date: string; count: number }> = new Map();
  private lastRequestTime: Map<string, number> = new Map();

  private getCurrentDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  getDailyRequestCount(model: string): number {
    const today = this.getCurrentDateString();
    const dailyData = this.dailyRequestCounts.get(model);
    
    if (!dailyData || dailyData.date !== today) {
      return 0;
    }
    
    return dailyData.count;
  }

  hasDailyQuotaAvailable(model: string): boolean {
    const config = FREE_TIER_LIMITS[model];
    if (!config?.dailyLimit) return true;
    
    const dailyCount = this.getDailyRequestCount(model);
    return dailyCount < config.dailyLimit;
  }

  canMakeRequest(model: string): boolean {
    const config = FREE_TIER_LIMITS[model];
    if (!config) return true;

    if (!this.hasDailyQuotaAvailable(model)) {
      return false;
    }

    const now = Date.now();
    const requests = this.requestCounts.get(model) || [];
    const recentRequests = requests.filter(time => now - time < 60_000);
    
    return recentRequests.length < config.requestsPerMinute;
  }

  recordRequest(model: string): void {
    const now = Date.now();
    const today = this.getCurrentDateString();
    
    const requests = this.requestCounts.get(model) || [];
    requests.push(now);
    
    const recentRequests = requests.filter(time => now - time < 60_000);
    this.requestCounts.set(model, recentRequests);
    this.lastRequestTime.set(model, now);
    
    const dailyData = this.dailyRequestCounts.get(model);
    if (!dailyData || dailyData.date !== today) {
      this.dailyRequestCounts.set(model, { date: today, count: 1 });
    } else {
      dailyData.count++;
    }
  }

  getRecommendedDelay(model: string): number {
    const config = FREE_TIER_LIMITS[model];
    if (!config) return 0;

    const lastRequest = this.lastRequestTime.get(model);
    if (!lastRequest) return 0;

    const timeSinceLastRequest = Date.now() - lastRequest;
    const minDelay = 60_000 / config.requestsPerMinute;

    return Math.max(0, minDelay - timeSinceLastRequest);
  }

  async waitForNextRequest(model: string): Promise<void> {
    const delay = this.getRecommendedDelay(model);
    if (delay > 0) {
      console.log(`⏳ Rate limiting: waiting ${Math.round(delay / 1000)}s before next ${model} request`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

export const rateLimiter = new RateLimiter();

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  model: string,
  maxRetries: number = 3
): Promise<T> {
  const config = FREE_TIER_LIMITS[model] || { retryDelayMs: 60_000, maxRetries: 3 };
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await rateLimiter.waitForNextRequest(model);
      rateLimiter.recordRequest(model);
      const result = await fn();
      return result;
    } catch (error: any) {
      const msg = String(error?.message || error?.error?.message || "").toLowerCase();
      const isQuotaError = msg.includes("quota") || msg.includes("429") || error?.status === 429;
      const isUnavailable = msg.includes("overload") || msg.includes("overloaded") || error?.status === 503 || error?.error?.code === 503 || error?.error?.status === 'UNAVAILABLE';
      const isServerError = (error?.status && error.status >= 500 && error.status < 600) || isUnavailable;

      const shouldRetry = (isQuotaError || isServerError) && attempt < maxRetries;

      if (shouldRetry) {
        let delay = config.retryDelayMs || 60_000;
        
        if (isQuotaError && error?.error?.details) {
          try {
            const retryInfo = error.error.details.find((d: any) => d['@type']?.includes('RetryInfo'));
            if (retryInfo?.retryDelay) {
              const match = retryInfo.retryDelay.match(/(\d+)s/);
              if (match) {
                delay = parseInt(match[1]) * 1000;
                console.log(`🕒 API suggested retry delay: ${delay/1000}s`);
              }
            }
          } catch (e) {
            // ignore parsing errors
          }
        }
        
        if (!isQuotaError) {
          const exponential = delay * Math.pow(2, attempt - 1);
          const jitter = Math.floor(Math.random() * Math.min(1000, exponential));
          delay = exponential + jitter;
        }

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

export function parseRetryDelay(error: any): number {
  try {
    if (error?.details) {
      for (const detail of error.details) {
        if (detail["@type"]?.includes("RetryInfo") && detail.retryDelay) {
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
  
  return 60_000;
}