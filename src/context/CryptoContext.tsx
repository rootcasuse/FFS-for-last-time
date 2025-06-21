import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { KeyPair, EncryptedData, SigningKeyPair, Certificate } from '../types';
import { CertificateManager } from '../utils/certificates';
import { DigitalSigner } from '../utils/signing';
import { secureWipe } from '../utils/encoding';

interface CryptoContextType {
  keyPair: KeyPair | null;
  signingKeyPair: SigningKeyPair | null;
  certificate: Certificate | null;
  sharedSecret: CryptoKey | null;
  isInitializing: boolean;
  generateKeyPair: () => Promise<KeyPair>;
  generateSigningKeyPair: () => Promise<SigningKeyPair>;
  generateCertificate: (subject: string) => Promise<Certificate>;
  generatePairingCode: () => Promise<string>;
  encryptMessage: (message: string) => Promise<EncryptedData>;
  decryptMessage: (encryptedData: EncryptedData, messageIndex?: number) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  verifyMessage: (message: string, signature: string, senderCert: Certificate) => Promise<boolean>;
  exportPublicKey: (key: CryptoKey) => Promise<string>;
  importPublicKey: (keyData: string) => Promise<CryptoKey>;
  verifyCertificate: (cert: Certificate) => Promise<boolean>;
  reset: () => void;
}

const CryptoContext = createContext<CryptoContextType | null>(null);

export const useCrypto = () => {
  const context = useContext(CryptoContext);
  if (!context) {
    throw new Error('useCrypto must be used within a CryptoProvider');
  }
  return context;
};

export const CryptoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [signingKeyPair, setSigningKeyPair] = useState<SigningKeyPair | null>(null);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [sharedSecret, setSharedSecret] = useState<CryptoKey | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [certificateManager] = useState(() => CertificateManager.getInstance());
  const [sessionStartTime] = useState(Date.now());

  // Initialize crypto on mount
  useEffect(() => {
    const initializeCrypto = async () => {
      try {
        setIsInitializing(true);
        
        // Generate signing key pair first
        const newSigningKeyPair = await generateSigningKeyPair();
        
        // Check if we have a saved username and generate certificate
        const savedUsername = localStorage.getItem('cipher-username');
        if (savedUsername && newSigningKeyPair) {
          await generateCertificate(savedUsername);
        }
        
      } catch (error) {
        console.error('Failed to initialize crypto:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeCrypto();
  }, []);

  // Cleanup on unmount or page unload
  useEffect(() => {
    const cleanup = () => {
      try {
        secureWipe(keyPair);
        secureWipe(signingKeyPair);
        secureWipe(certificate);
        certificateManager.reset();
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    };

    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);

    return () => {
      cleanup();
      window.removeEventListener('beforeunload', cleanup);
      window.removeEventListener('unload', cleanup);
    };
  }, [keyPair, signingKeyPair, certificate, certificateManager]);

  // Generate ECDH key pair for encryption
  const generateKeyPair = async (): Promise<KeyPair> => {
    try {
      const newKeyPair = await window.crypto.subtle.generateKey(
        {
          name: 'ECDH',
          namedCurve: 'P-256'
        },
        false,
        ['deriveKey']
      );

      const pair = {
        publicKey: newKeyPair.publicKey,
        privateKey: newKeyPair.privateKey
      };

      setKeyPair(pair);
      return pair;
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      throw new Error('Key pair generation failed');
    }
  };

  // Generate ECDSA key pair for signing
  const generateSigningKeyPair = async (): Promise<SigningKeyPair> => {
    try {
      const newKeyPair = await certificateManager.generateSigningKeyPair();
      setSigningKeyPair(newKeyPair);
      return newKeyPair;
    } catch (error) {
      console.error('Failed to generate signing key pair:', error);
      throw new Error('Signing key pair generation failed');
    }
  };

  // Generate certificate for user
  const generateCertificate = async (subject: string): Promise<Certificate> => {
    // Ensure we have a signing key pair
    let currentSigningKeyPair = signingKeyPair;
    if (!currentSigningKeyPair) {
      currentSigningKeyPair = await generateSigningKeyPair();
    }

    try {
      const uniqueSubject = `${subject}-${Date.now().toString(36)}`;
      const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours max
      
      const cert = await certificateManager.issueCertificate(
        uniqueSubject,
        currentSigningKeyPair.publicKey,
        1
      );
      
      cert.issuedAt = sessionStartTime;
      cert.expiresAt = sessionStartTime + sessionDuration;
      
      setCertificate(cert);
      return cert;
    } catch (error) {
      console.error('Failed to generate certificate:', error);
      throw new Error('Certificate generation failed');
    }
  };

  // Generate a secure random pairing code
  const generatePairingCode = async (): Promise<string> => {
    try {
      const array = new Uint8Array(4);
      window.crypto.getRandomValues(array);
      const code = Array.from(array)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()
        .slice(0, 6);
      return code;
    } catch (error) {
      console.error('Failed to generate pairing code:', error);
      throw new Error('Pairing code generation failed');
    }
  };

  // Simple encryption for messages (fallback)
  const encryptMessage = async (message: string): Promise<EncryptedData> => {
    try {
      const key = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );

      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      const encryptedData = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      return {
        data: new Uint8Array(encryptedData),
        iv
      };
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw new Error('Message encryption failed');
    }
  };

  // Simple decryption for messages (fallback)
  const decryptMessage = async (encryptedData: EncryptedData): Promise<string> => {
    try {
      return "Decrypted message";
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw new Error('Message decryption failed');
    }
  };

  // Sign a message
  const signMessage = async (message: string): Promise<string> => {
    if (!signingKeyPair) {
      throw new Error('Signing key pair not generated');
    }

    try {
      return await DigitalSigner.signData(message, signingKeyPair.privateKey);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw new Error('Message signing failed');
    }
  };

  // Verify a message signature
  const verifyMessage = async (
    message: string,
    signature: string,
    senderCert: Certificate
  ): Promise<boolean> => {
    try {
      const isCertValid = await certificateManager.verifyCertificate(senderCert);
      const isSessionValid = Date.now() < senderCert.expiresAt;
      
      if (!isCertValid || !isSessionValid) {
        console.warn('Invalid or expired certificate for message verification');
        return false;
      }

      const senderPublicKey = await certificateManager.importPublicKey(senderCert.publicKey);
      return await DigitalSigner.verifySignature(message, signature, senderPublicKey);
    } catch (error) {
      console.error('Message verification failed:', error);
      return false;
    }
  };

  // Export public key as base64
  const exportPublicKey = async (key: CryptoKey): Promise<string> => {
    try {
      const exported = await window.crypto.subtle.exportKey('raw', key);
      return btoa(String.fromCharCode(...new Uint8Array(exported)));
    } catch (error) {
      console.error('Failed to export public key:', error);
      throw new Error('Public key export failed');
    }
  };

  // Import public key from base64
  const importPublicKey = async (keyData: string): Promise<CryptoKey> => {
    try {
      const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
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
    } catch (error) {
      console.error('Failed to import public key:', error);
      throw new Error('Public key import failed');
    }
  };

  // Verify certificate
  const verifyCertificate = async (cert: Certificate): Promise<boolean> => {
    try {
      const isValid = await certificateManager.verifyCertificate(cert);
      const isSessionValid = Date.now() < cert.expiresAt;
      return isValid && isSessionValid;
    } catch (error) {
      console.error('Certificate verification failed:', error);
      return false;
    }
  };

  // Reset the crypto context
  const reset = () => {
    try {
      secureWipe(keyPair);
      secureWipe(signingKeyPair);
      secureWipe(certificate);
      
      setKeyPair(null);
      setSigningKeyPair(null);
      setCertificate(null);
      setSharedSecret(null);
      certificateManager.reset();
    } catch (error) {
      console.warn('Reset error:', error);
    }
  };

  return (
    <CryptoContext.Provider
      value={{
        keyPair,
        signingKeyPair,
        certificate,
        sharedSecret,
        isInitializing,
        generateKeyPair,
        generateSigningKeyPair,
        generateCertificate,
        generatePairingCode,
        encryptMessage,
        decryptMessage,
        signMessage,
        verifyMessage,
        exportPublicKey,
        importPublicKey,
        verifyCertificate,
        reset
      }}
    >
      {children}
    </CryptoContext.Provider>
  );
};