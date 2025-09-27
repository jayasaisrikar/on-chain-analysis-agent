export type AIProvider = 'openai' | 'gemini';

export interface APIConfig {
  provider: AIProvider;
  apiKey: string;
  isValid?: boolean;
  lastValidated?: Date;
}

export interface APIKeySettings {
  openaiKey?: string;
  geminiKey?: string;
  selectedProvider: AIProvider;
  rememberKeys: boolean;
}

export interface APIKeyValidationResult {
  isValid: boolean;
  provider: AIProvider;
  error?: string;
  model?: string;
}