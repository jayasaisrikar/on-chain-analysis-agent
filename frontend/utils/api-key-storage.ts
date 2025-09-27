import { APIKeySettings, AIProvider } from '../types/api-config';

// Simple encryption using browser's built-in crypto API
class APIKeyStorage {
  private static readonly STORAGE_KEY = 'crypto-agent-api-keys';
  private static readonly CRYPTO_KEY_NAME = 'crypto-agent-encryption-key';

  // Generate or retrieve encryption key
  private static async getEncryptionKey(): Promise<CryptoKey> {
    // Check if we have a key stored
    const stored = localStorage.getItem(this.CRYPTO_KEY_NAME);
    if (stored) {
      try {
        const keyData = JSON.parse(stored);
        return await crypto.subtle.importKey(
          'raw',
          new Uint8Array(keyData),
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
      } catch (e) {
        // If import fails, generate new key
        console.warn('Failed to import stored key, generating new one');
      }
    }

    // Generate new key
    const key = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Store the key
    const exported = await crypto.subtle.exportKey('raw', key);
    localStorage.setItem(this.CRYPTO_KEY_NAME, JSON.stringify(Array.from(new Uint8Array(exported))));

    return key;
  }

  // Encrypt data
  private static async encrypt(data: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(data);

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const result = {
      data: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv)
    };

    return btoa(JSON.stringify(result));
  }

  // Decrypt data
  private static async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.getEncryptionKey();
      const { data, iv } = JSON.parse(atob(encryptedData));

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(iv) },
        key,
        new Uint8Array(data)
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.error('Failed to decrypt API keys:', e);
      return '';
    }
  }

  // Save API key settings
  static async saveSettings(settings: APIKeySettings): Promise<void> {
    try {
      if (settings.rememberKeys) {
        const dataToEncrypt = JSON.stringify({
          openaiKey: settings.openaiKey || '',
          geminiKey: settings.geminiKey || '',
          selectedProvider: settings.selectedProvider,
          rememberKeys: settings.rememberKeys,
          timestamp: Date.now()
        });

        const encrypted = await this.encrypt(dataToEncrypt);
        localStorage.setItem(this.STORAGE_KEY, encrypted);
      } else {
        // If user doesn't want to remember keys, clear storage
        this.clearSettings();
        // But still store provider preference
        localStorage.setItem(`${this.STORAGE_KEY}-provider`, settings.selectedProvider);
      }
    } catch (e) {
      console.error('Failed to save API key settings:', e);
    }
  }

  // Load API key settings
  static async loadSettings(): Promise<APIKeySettings | null> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        // Check if we at least have provider preference
        const provider = localStorage.getItem(`${this.STORAGE_KEY}-provider`) as AIProvider;
        if (provider) {
          return {
            selectedProvider: provider,
            rememberKeys: false
          };
        }
        return null;
      }

      const decrypted = await this.decrypt(stored);
      if (!decrypted) return null;

      const settings = JSON.parse(decrypted);
      
      // Check if data is not too old (30 days)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      if (settings.timestamp && (Date.now() - settings.timestamp) > maxAge) {
        this.clearSettings();
        return null;
      }

      return settings;
    } catch (e) {
      console.error('Failed to load API key settings:', e);
      this.clearSettings(); // Clear corrupted data
      return null;
    }
  }

  // Clear stored settings
  static clearSettings(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(`${this.STORAGE_KEY}-provider`);
    localStorage.removeItem(this.CRYPTO_KEY_NAME);
  }

  // Check if settings exist
  static hasStoredSettings(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }
}

export default APIKeyStorage;