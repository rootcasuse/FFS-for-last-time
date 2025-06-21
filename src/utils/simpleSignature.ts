import { arrayBufferToBase64, base64ToArrayBuffer } from './encoding';

/**
 * Simple signature system using HMAC-SHA256
 * Uses a session key for both signing and verification
 */
export class SimpleSignature {
  private static sessionKey: CryptoKey | null = null;
  private static sessionKeyData: string | null = null;

  /**
   * Generate a new session key for signing
   */
  static async generateSessionKey(): Promise<string> {
    // Generate a random key for HMAC
    const key = await window.crypto.subtle.generateKey(
      {
        name: 'HMAC',
        hash: 'SHA-256',
        length: 256
      },
      true, // extractable
      ['sign', 'verify']
    );

    // Export the key as raw bytes and convert to base64
    const keyData = await window.crypto.subtle.exportKey('raw', key);
    const keyString = arrayBufferToBase64(keyData);

    this.sessionKey = key;
    this.sessionKeyData = keyString;

    return keyString;
  }

  /**
   * Get the current session key
   */
  static getSessionKey(): string | null {
    return this.sessionKeyData;
  }

  /**
   * Import a key from base64 string
   */
  static async importKey(keyString: string): Promise<CryptoKey> {
    const keyData = base64ToArrayBuffer(keyString);
    return await window.crypto.subtle.importKey(
      'raw',
      keyData,
      {
        name: 'HMAC',
        hash: 'SHA-256'
      },
      false,
      ['sign', 'verify']
    );
  }

  /**
   * Sign data with the session key
   */
  static async signData(data: string, keyString?: string): Promise<string> {
    let key = this.sessionKey;
    
    if (keyString) {
      key = await this.importKey(keyString);
    }
    
    if (!key) {
      throw new Error('No signing key available');
    }

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const signature = await window.crypto.subtle.sign('HMAC', key, dataBuffer);
    return arrayBufferToBase64(signature);
  }

  /**
   * Verify data signature
   */
  static async verifySignature(
    data: string,
    signature: string,
    keyString: string
  ): Promise<boolean> {
    try {
      const key = await this.importKey(keyString);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const signatureBuffer = base64ToArrayBuffer(signature);

      return await window.crypto.subtle.verify('HMAC', key, signatureBuffer, dataBuffer);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Sign a file
   */
  static async signFile(file: File, keyString?: string): Promise<{
    filename: string;
    signature: string;
    timestamp: number;
    size: number;
    type: string;
  }> {
    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const fileData = arrayBufferToBase64(arrayBuffer);
    
    // Create signature data
    const signatureData = {
      filename: file.name,
      size: file.size,
      type: file.type,
      timestamp: Date.now(),
      content: fileData
    };

    const dataToSign = JSON.stringify(signatureData);
    const signature = await this.signData(dataToSign, keyString);

    return {
      filename: file.name,
      signature,
      timestamp: signatureData.timestamp,
      size: file.size,
      type: file.type
    };
  }

  /**
   * Verify a file signature
   */
  static async verifyFile(
    file: File,
    signature: string,
    keyString: string,
    originalTimestamp: number
  ): Promise<boolean> {
    try {
      // Read file content
      const arrayBuffer = await file.arrayBuffer();
      const fileData = arrayBufferToBase64(arrayBuffer);
      
      // Recreate the signature data
      const signatureData = {
        filename: file.name,
        size: file.size,
        type: file.type,
        timestamp: originalTimestamp,
        content: fileData
      };

      const dataToVerify = JSON.stringify(signatureData);
      return await this.verifySignature(dataToVerify, signature, keyString);
    } catch (error) {
      console.error('File verification failed:', error);
      return false;
    }
  }

  /**
   * Create a signature file for download
   */
  static createSignatureFile(signatureInfo: {
    filename: string;
    signature: string;
    timestamp: number;
    size: number;
    type: string;
  }): Blob {
    const signatureData = {
      version: '1.0',
      algorithm: 'HMAC-SHA256',
      ...signatureInfo,
      note: 'Use the same session key that was used to create this signature for verification'
    };

    return new Blob([JSON.stringify(signatureData, null, 2)], {
      type: 'application/json'
    });
  }

  /**
   * Parse a signature file
   */
  static async parseSignatureFile(file: File): Promise<{
    filename: string;
    signature: string;
    timestamp: number;
    size: number;
    type: string;
  } | null> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.filename && data.signature && data.timestamp) {
        return {
          filename: data.filename,
          signature: data.signature,
          timestamp: data.timestamp,
          size: data.size || 0,
          type: data.type || 'unknown'
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse signature file:', error);
      return null;
    }
  }

  /**
   * Reset session (cleanup)
   */
  static reset(): void {
    this.sessionKey = null;
    this.sessionKeyData = null;
  }
}