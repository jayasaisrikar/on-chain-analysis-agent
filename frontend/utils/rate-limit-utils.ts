/**
 * Utility functions for handling API rate limits and quota management
 */

export interface RateLimitInfo {
  provider: 'openai' | 'gemini';
  requestsPerMinute: number;
  dailyQuota?: number;
  isFreeTier: boolean;
}

export const RATE_LIMITS: Record<string, RateLimitInfo> = {
  'gemini-free': {
    provider: 'gemini',
    requestsPerMinute: 15,
    dailyQuota: 1500,
    isFreeTier: true
  },
  'gemini-paid': {
    provider: 'gemini',
    requestsPerMinute: 1000,
    isFreeTier: false
  },
  'openai-free': {
    provider: 'openai',
    requestsPerMinute: 3,
    dailyQuota: 200,
    isFreeTier: true
  },
  'openai-paid': {
    provider: 'openai',
    requestsPerMinute: 500,
    isFreeTier: false
  }
};

/**
 * Simple client-side rate limiting tracker
 */
class RateLimitTracker {
  private requests: Map<string, number[]> = new Map();

  /**
   * Check if we can make a request without hitting rate limits
   */
  canMakeRequest(provider: 'openai' | 'gemini', isFreeTier: boolean = true): boolean {
    const key = `${provider}-${isFreeTier ? 'free' : 'paid'}`;
    const limit = RATE_LIMITS[key];
    
    if (!limit) return true;

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    // Get recent requests for this provider
    const recentRequests = this.requests.get(provider) || [];
    const requestsInWindow = recentRequests.filter(time => time > windowStart);
    
    return requestsInWindow.length < limit.requestsPerMinute;
  }

  /**
   * Record a new request
   */
  recordRequest(provider: 'openai' | 'gemini'): void {
    const now = Date.now();
    const recentRequests = this.requests.get(provider) || [];
    
    // Add current request and clean old ones
    recentRequests.push(now);
    const windowStart = now - 60000;
    const filteredRequests = recentRequests.filter(time => time > windowStart);
    
    this.requests.set(provider, filteredRequests);
  }

  /**
   * Get estimated wait time until next request is allowed
   */
  getWaitTime(provider: 'openai' | 'gemini', isFreeTier: boolean = true): number {
    const key = `${provider}-${isFreeTier ? 'free' : 'paid'}`;
    const limit = RATE_LIMITS[key];
    
    if (!limit) return 0;

    const now = Date.now();
    const windowStart = now - 60000;
    const recentRequests = this.requests.get(provider) || [];
    const requestsInWindow = recentRequests.filter(time => time > windowStart);
    
    if (requestsInWindow.length < limit.requestsPerMinute) {
      return 0;
    }

    // Find oldest request in window
    const oldestRequest = Math.min(...requestsInWindow);
    const waitTime = (oldestRequest + 60000) - now;
    
    return Math.max(0, waitTime);
  }
}

export const rateLimitTracker = new RateLimitTracker();

/**
 * Get user-friendly error message for quota/rate limit errors
 */
export function getQuotaErrorMessage(provider: 'openai' | 'gemini', error?: any): string {
  if (provider === 'gemini') {
    return `🚫 **Gemini API Quota Exceeded**

**Common causes:**
• Free tier: 15 requests/minute, 1,500/day
• New API key activation delay (up to 5 minutes)
• Billing account not set up

**Quick fixes:**
✅ Switch to OpenAI GPT-4 (more reliable)
✅ Wait 1-2 minutes and try again  
✅ Check Google AI Studio billing
✅ Verify API key is activated

**Alternative:** Use OpenAI instead for better reliability.`;
  } else {
    return `🚫 **OpenAI API Quota Exceeded**

**Quick fixes:**
✅ Check your usage at platform.openai.com
✅ Add billing information if on free tier
✅ Wait for quota reset
✅ Try Gemini as alternative (if available)`;
  }
}

/**
 * Retry logic with exponential backoff for quota errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on quota errors - they need user intervention
      if (error?.message?.includes('quota') || 
          error?.message?.includes('RESOURCE_EXHAUSTED') ||
          error?.status === 429) {
        throw error;
      }
      
      // Don't retry on auth errors
      if (error?.message?.includes('API_KEY') || 
          error?.message?.includes('unauthorized')) {
        throw error;
      }
      
      if (i < maxRetries) {
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}