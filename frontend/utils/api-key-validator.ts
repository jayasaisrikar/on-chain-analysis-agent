import { APIKeyValidationResult, AIProvider } from '../types/api-config';

export class APIKeyValidator {
  // Validate OpenAI API Key
  static async validateOpenAIKey(apiKey: string): Promise<APIKeyValidationResult> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Check if GPT models are available
        const hasGPT = data.data?.some((model: any) => 
          model.id?.includes('gpt-4') || model.id?.includes('gpt-3.5')
        );
        
        return {
          isValid: true,
          provider: 'openai',
          model: hasGPT ? 'GPT-4/3.5 Available' : 'Basic Models Available'
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Invalid API key' } }));
        return {
          isValid: false,
          provider: 'openai',
          error: errorData.error?.message || 'Invalid API key'
        };
      }
    } catch (error) {
      return {
        isValid: false,
        provider: 'openai',
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // Validate Gemini API Key
  static async validateGeminiKey(apiKey: string): Promise<APIKeyValidationResult> {
    try {
      // Gemini uses a different endpoint structure
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const hasGemini = data.models?.some((model: any) => 
          model.name?.includes('gemini')
        );
        
        return {
          isValid: true,
          provider: 'gemini',
          model: hasGemini ? 'Gemini Models Available' : 'Basic Models Available'
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Invalid API key' } }));
        return {
          isValid: false,
          provider: 'gemini',
          error: errorData.error?.message || 'Invalid API key'
        };
      }
    } catch (error) {
      return {
        isValid: false,
        provider: 'gemini',
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  // Generic validation method
  static async validateAPIKey(provider: AIProvider, apiKey: string): Promise<APIKeyValidationResult> {
    switch (provider) {
      case 'openai':
        return this.validateOpenAIKey(apiKey);
      case 'gemini':
        return this.validateGeminiKey(apiKey);
      default:
        return {
          isValid: false,
          provider,
          error: 'Unknown provider'
        };
    }
  }

  // Quick format validation (before making API calls)
  static isValidKeyFormat(provider: AIProvider, apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') return false;

    switch (provider) {
      case 'openai':
        // OpenAI keys start with 'sk-' and are typically around 51 characters
        return apiKey.startsWith('sk-') && apiKey.length > 40;
      case 'gemini':
        // Gemini API keys are typically 39 characters long and alphanumeric
        return apiKey.length >= 30 && /^[A-Za-z0-9_-]+$/.test(apiKey);
      default:
        return false;
    }
  }
}