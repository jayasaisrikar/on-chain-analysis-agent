export interface AppConfig {
  // API Configuration
  requireUserApiKeys: boolean;
  fallbackToEnvKeys: boolean;
  
  // Feature flags
  enableUserSettings: boolean;
  showApiNotification: boolean;
}

export const defaultAppConfig: AppConfig = {
  requireUserApiKeys: false, // By default, use env keys
  fallbackToEnvKeys: true,   // Fallback to env if user keys fail
  enableUserSettings: true,  // Show settings UI
  showApiNotification: true  // Show notification when not configured
};

// Helper to check if we should use environment keys
export const shouldUseEnvKeys = (config: AppConfig, hasUserConfig: boolean): boolean => {
  // If we require user API keys, don't use env keys (unless fallback is needed)
  if (config.requireUserApiKeys) {
    return !hasUserConfig && config.fallbackToEnvKeys;
  }
  
  // If fallback to env keys is enabled, always use env keys
  if (config.fallbackToEnvKeys) {
    return true;
  }
  
  // Otherwise, only use env keys if user hasn't configured any
  return !hasUserConfig;
};

// Helper to check if we should show the settings UI
export const shouldShowSettings = (config: AppConfig): boolean => {
  // Don't show if explicitly disabled
  if (!config.enableUserSettings) {
    return false;
  }
  
  // Don't show if we're using env keys and not requiring user keys
  if (config.fallbackToEnvKeys && !config.requireUserApiKeys) {
    return false;
  }
  
  return true;
};