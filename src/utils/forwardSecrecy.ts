import { EncryptedData, KeyPair } from '../types';
import { arrayBufferToBase64, base64ToArrayBuffer } from './encoding';

/**
 * Forward secrecy implementation using HKDF and ephemeral keys
 */
export class ForwardSecrecy {
  private static messageCounter = 0;

  /**
   * Derive a new encryption key using HKDF
   */
  static async deriveMessageKey(
    sharedSecret: CryptoKey,
    salt: Uint8Array,
    info: string = 'cipher-chat-message'
  ): Promise<CryptoKey> {
    // Import shared secret as key material
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      await window.crypto.subtle.exportKey('raw', sharedSecret),
      'HKDF',
      false,
      ['deriveKey']
    );

    // Derive new key using HKDF
    return await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt,
        info: new TextEncoder().encode(info)
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt message with forward secrecy
   */
  static async encryptWithForwardSecrecy(
    message: string,
    sharedSecret: CryptoKey
  ): Promise<EncryptedData> {
    // Generate random salt for this message
    const salt = window.crypto.getRandomValues(new Uint8Array(32));
    
    // Derive ephemeral key
    const messageKey = await this.deriveMessageKey(
      sharedSecret,
      salt,
      `message-${this.messageCounter++}`
    );

    // Encrypt with ephemeral key
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      messageKey,
      data
    );

    return {
      data: new Uint8Array(encryptedData),
      iv,
      salt
    };
  }

  /**
   * Decrypt message with forward secrecy
   */
  static async decryptWithForwardSecrecy(
    encryptedData: EncryptedData,
    sharedSecret: CryptoKey,
    messageIndex: number = 0
  ): Promise<string> {
    if (!encryptedData.salt) {
      throw new Error('Salt required for forward secrecy decryption');
    }

    // Derive the same ephemeral key
    const messageKey = await this.deriveMessageKey(
      sharedSecret,
      encryptedData.salt,
      `message-${messageIndex}`
    );

    // Decrypt with ephemeral key
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: encryptedData.iv
      },
      messageKey,
      encryptedData.data
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  }

  /**
   * Generate ephemeral key pair for ratcheting
   */
  static async generateEphemeralKeyPair(): Promise<KeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256'
      },
      false,
      ['deriveKey']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  /**
   * Perform key ratchet step
   */
  static async ratchetKeys(
    currentSharedSecret: CryptoKey,
    ephemeralPrivateKey: CryptoKey,
    peerEphemeralPublicKey: CryptoKey
  ): Promise<CryptoKey> {
    // Derive new shared secret from ephemeral keys
    const newSharedSecret = await window.crypto.subtle.deriveKey(
      {
        name: 'ECDH',
        public: peerEphemeralPublicKey
      },
      ephemeralPrivateKey,
      {
        name: 'AES-GCM',
        length: 256
      },
      false,
      ['encrypt', 'decrypt']
    );

    return newSharedSecret;
  }

  /**
   * Reset message counter (for new sessions)
   */
  static resetCounter(): void {
    this.messageCounter = 0;
  }
}