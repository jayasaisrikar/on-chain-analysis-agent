import CryptoDashboard from '../components/CryptoDashboard';
import CryptoBackground from '../components/3d/CryptoBackground';
import type { AppConfig } from '../types/app-config';

// Configuration for the app - modify these settings as needed
const appConfig: Partial<AppConfig> = {
  // Set to false to require user API keys, true to allow fallback to env keys
  fallbackToEnvKeys: true,
  
  // Set to false to disable user settings UI completely
  enableUserSettings: true,
  
  // Set to true to always require user API keys (overrides fallbackToEnvKeys)
  requireUserApiKeys: false
};

export default function Page() {
  return (
    <>
      <CryptoBackground />
      <CryptoDashboard appConfig={appConfig} />
    </>
  );
}
