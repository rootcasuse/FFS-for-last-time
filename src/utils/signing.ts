import { arrayBufferToBase64, base64ToArrayBuffer } from './encoding';
import { SigningKeyPair, DocumentSignature, Certificate } from '../types';

/**
 * Digital signing utilities
 */
export class DigitalSigner {
  /**
   * Sign data with ECDSA private key
   */
  static async signData(data: string, privateKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    const signature = await window.crypto.subtle.sign(
      {
        name: 'ECDSA',
        hash: 'SHA-256'
      },
      privateKey,
      dataBuffer
    );

    return arrayBufferToBase64(signature);
  }

  /**
   * Verify data signature with ECDSA public key
   */
  static async verifySignature(
    data: string,
    signature: string,
    publicKey: CryptoKey
  ): Promise<boolean> {
    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const signatureBuffer = base64ToArrayBuffer(signature);

      return await window.crypto.subtle.verify(
        {
          name: 'ECDSA',
          hash: 'SHA-256'
        },
        publicKey,
        signatureBuffer,
        dataBuffer
      );
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Hash document with SHA-256
   */
  static async hashDocument(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    return arrayBufferToBase64(hashBuffer);
  }

  /**
   * Sign a document
   */
  static async signDocument(
    file: File,
    privateKey: CryptoKey,
    certificate: Certificate
  ): Promise<DocumentSignature> {
    const documentHash = await this.hashDocument(file);
    const signature = await this.signData(documentHash, privateKey);

    return {
      documentHash,
      signature,
      certificate,
      timestamp: Date.now()
    };
  }

  /**
   * Verify a document signature
   */
  static async verifyDocumentSignature(
    file: File,
    documentSignature: DocumentSignature,
    publicKey: CryptoKey
  ): Promise<boolean> {
    try {
      // Verify the document hash matches
      const currentHash = await this.hashDocument(file);
      if (currentHash !== documentSignature.documentHash) {
        return false;
      }

      // Verify the signature
      return await this.verifySignature(
        documentSignature.documentHash,
        documentSignature.signature,
        publicKey
      );
    } catch (error) {
      console.error('Document verification failed:', error);
      return false;
    }
  }

  /**
   * Create a detached signature file
   */
  static createSignatureFile(documentSignature: DocumentSignature): Blob {
    const signatureData = {
      version: '1.0',
      algorithm: 'ECDSA-SHA256',
      ...documentSignature
    };

    return new Blob([JSON.stringify(signatureData, null, 2)], {
      type: 'application/json'
    });
  }

  /**
   * Parse a signature file
   */
  static async parseSignatureFile(file: File): Promise<DocumentSignature | null> {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.documentHash && data.signature && data.certificate) {
        return {
          documentHash: data.documentHash,
          signature: data.signature,
          certificate: data.certificate,
          timestamp: data.timestamp || Date.now()
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse signature file:', error);
      return null;
    }
  }
}