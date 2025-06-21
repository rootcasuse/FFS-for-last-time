// Message types
export type MessageType = 'text' | 'image' | 'audio' | 'document';

export interface Message {
  id: string;
  type: MessageType;
  content: string; // For text messages or data URLs for media
  timestamp: number;
  sender: 'self' | 'peer';
  encrypted: boolean;
  verified: boolean;
  signature?: string; // ECDSA signature
  senderCert?: Certificate; // Sender's certificate
  documentInfo?: DocumentInfo; // For document messages
}

export interface DocumentInfo {
  name: string;
  size: number;
  hash: string; // SHA-256 hash
  signature: string; // Document signature
}

// Crypto types
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface SigningKeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

export interface EncryptedData {
  iv: Uint8Array;
  data: Uint8Array;
  salt?: Uint8Array; // For HKDF
}

export interface SignedData {
  data: any;
  signature: Uint8Array;
}

// PKI types
export interface Certificate {
  id: string;
  subject: string; // User identifier
  publicKey: string; // Base64 encoded public key
  issuer: string; // CA identifier
  issuedAt: number;
  expiresAt: number;
  signature: string; // CA signature
}

export interface CertificateAuthority {
  id: string;
  name: string;
  publicKey: string;
  privateKey?: string; // Only for self-signed CA
}

// Socket message types
export interface PairingRequest {
  type: 'pairing-request';
  pairingCode: string;
  publicKey: string; // Base64 encoded public key
  certificate: Certificate;
}

export interface PairingResponse {
  type: 'pairing-response';
  publicKey: string; // Base64 encoded public key
  certificate: Certificate;
  accepted: boolean;
}

export interface ChatMessage {
  type: 'chat-message';
  data: string; // Encrypted and Base64 encoded message
  iv: string; // Base64 encoded initialization vector
  signature: string; // Base64 encoded signature
  certificate: Certificate; // Sender's certificate
  salt?: string; // For forward secrecy
}

export interface DisconnectMessage {
  type: 'disconnect';
}

export interface DocumentSignature {
  documentHash: string;
  signature: string;
  certificate: Certificate;
  timestamp: number;
}