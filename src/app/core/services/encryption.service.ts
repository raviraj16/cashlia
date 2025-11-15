import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  private readonly ENCRYPTION_KEY_STORAGE = 'encryption_key';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 128;

  /**
   * Generate or retrieve encryption key
   */
  async getOrCreateEncryptionKey(): Promise<string> {
    const existingKey = await Preferences.get({ key: this.ENCRYPTION_KEY_STORAGE });
    
    if (existingKey.value) {
      return existingKey.value;
    }

    // Generate a new key
    const key = this.generateKey();
    await Preferences.set({ key: this.ENCRYPTION_KEY_STORAGE, value: key });
    return key;
  }

  /**
   * Generate a random encryption key
   */
  private generateKey(): string {
    return CryptoJS.lib.WordArray.random(this.KEY_LENGTH / 8).toString();
  }

  /**
   * Encrypt data using AES-256
   */
  async encrypt(data: string): Promise<string> {
    const key = await this.getOrCreateEncryptionKey();
    const iv = CryptoJS.lib.WordArray.random(this.IV_LENGTH / 8);
    
    const encrypted = CryptoJS.AES.encrypt(data, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    // Combine IV and encrypted data
    return iv.concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64);
  }

  /**
   * Decrypt data using AES-256
   */
  async decrypt(encryptedData: string): Promise<string> {
    const key = await this.getOrCreateEncryptionKey();
    
    // Extract IV and ciphertext
    const combined = CryptoJS.enc.Base64.parse(encryptedData);
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, this.IV_LENGTH / 32));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(this.IV_LENGTH / 32));
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as any,
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Hash password using SHA-256 (for local auth)
   */
  hashPassword(password: string, salt?: string): string {
    const saltToUse = salt || CryptoJS.lib.WordArray.random(128 / 8).toString();
    const hash = CryptoJS.PBKDF2(password, saltToUse, {
      keySize: 256 / 32,
      iterations: 10000
    });
    return saltToUse + ':' + hash.toString();
  }

  /**
   * Verify password
   */
  verifyPassword(password: string, hash: string): boolean {
    const [salt, storedHash] = hash.split(':');
    const computedHash = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations: 10000
    });
    return computedHash.toString() === storedHash;
  }
}

