import { Certificate, CertificateAuthority, SigningKeyPair } from '../types';
import { arrayBufferToBase64, base64ToArrayBuffer } from './encoding';

/**
 * Certificate management utilities
 */
export class CertificateManager {
  private static instance: CertificateManager;
  private ca: CertificateAuthority | null = null;

  static getInstance(): CertificateManager {
    if (!CertificateManager.instance) {
      CertificateManager.instance = new CertificateManager();
    }
    return CertificateManager.instance;
  }

  /**
   * Initialize a self-signed Certificate Authority
   */
  async initializeCA(): Promise<CertificateAuthority> {
    const keyPair = await this.generateSigningKeyPair();
    const publicKeyData = await this.exportPublicKey(keyPair.publicKey);
    const privateKeyData = await this.exportPrivateKey(keyPair.privateKey);

    this.ca = {
      id: 'cipher-ca-' + Date.now(),
      name: 'Cipher Chat CA',
      publicKey: publicKeyData,
      privateKey: privateKeyData
    };

    return this.ca;
  }

  /**
   * Generate ECDSA key pair for signing
   */
  async generateSigningKeyPair(): Promise<SigningKeyPair> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign', 'verify']
    );

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    };
  }

  /**
   * Issue a certificate for a user
   */
  async issueCertificate(
    subject: string,
    publicKey: CryptoKey,
    validityDays: number = 30
  ): Promise<Certificate> {
    if (!this.ca) {
      await this.initializeCA();
    }

    const publicKeyData = await this.exportPublicKey(publicKey);
    const now = Date.now();
    const expiresAt = now + (validityDays * 24 * 60 * 60 * 1000);

    const certData = {
      subject,
      publicKey: publicKeyData,
      issuer: this.ca!.id,
      issuedAt: now,
      expiresAt
    };

    // Sign the certificate data
    const signature = await this.signCertificate(certData);

    const certificate: Certificate = {
      id: 'cert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      ...certData,
      signature
    };

    return certificate;
  }

  /**
   * Sign certificate data with CA private key
   */
  private async signCertificate(certData: any): Promise<string> {
    if (!this.ca?.privateKey) {
      throw new Error('CA not initialized');
    }

    const caPrivateKey = await this.importPrivateKey(this.ca.privateKey);
    const dataToSign = JSON.stringify(certData);
    const encoder = new TextEncoder();
    const data = encoder.encode(dataToSign);

    const signature = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      caPrivateKey,
      data
    );

    return arrayBufferToBase64(signature);
  }

  /**
   * Verify a certificate's signature
   */
  async verifyCertificate(certificate: Certificate): Promise<boolean> {
    try {
      if (!this.ca) {
        return false;
      }

      const caPublicKey = await this.importPublicKey(this.ca.publicKey);
      const certData = {
        subject: certificate.subject,
        publicKey: certificate.publicKey,
        issuer: certificate.issuer,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt
      };

      const dataToVerify = JSON.stringify(certData);
      const encoder = new TextEncoder();
      const data = encoder.encode(dataToVerify);
      const signature = base64ToArrayBuffer(certificate.signature);

      const isValid = await window.crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-256'
        },
        caPublicKey,
        signature,
        data
      );

      // Check expiration
      const now = Date.now();
      const isNotExpired = now < certificate.expiresAt;

      return isValid && isNotExpired;
    } catch (error) {
      console.error('Certificate verification failed:', error);
      return false;
    }
  }

  /**
   * Export public key as base64
   */
  async exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('raw', key);
    return arrayBufferToBase64(exported);
  }

  /**
   * Export private key as base64
   */
  async exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey('pkcs8', key);
    return arrayBufferToBase64(exported);
  }

  /**
   * Import public key from base64
   */
  async importPublicKey(keyData: string): Promise<CryptoKey> {
    const binaryKey = base64ToArrayBuffer(keyData);
    return window.crypto.subtle.importKey(
      'raw',
      binaryKey,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['verify']
    );
  }

  /**
   * Import private key from base64
   */
  async importPrivateKey(keyData: string): Promise<CryptoKey> {
    const binaryKey = base64ToArrayBuffer(keyData);
    return window.crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'ECDSA',
        namedCurve: 'P-256'
      },
      true,
      ['sign']
    );
  }

  /**
   * Get CA public key for verification
   */
  getCAPublicKey(): string | null {
    return this.ca?.publicKey || null;
  }

  /**
   * Reset CA (for cleanup)
   */
  reset(): void {
    this.ca = null;
  }
}