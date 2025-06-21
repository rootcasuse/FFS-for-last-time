# Cipher Chat - Secure Web-Based Communication Platform

A comprehensive secure messaging application with PKI-based digital signatures, end-to-end encryption, and document signing capabilities.

## 🔒 Security Features

### Core Security Architecture
- **End-to-End Encryption**: All messages are encrypted using AES-GCM with 256-bit keys
- **Digital Signatures**: ECDSA P-256 signatures for message authentication
- **Forward Secrecy**: HKDF-based key derivation for ephemeral message keys
- **PKI Integration**: Self-signed certificate authority for identity management
- **Session-Based Security**: Temporary certificates that expire with the session

### Cryptographic Primitives
- **Encryption**: AES-GCM-256 for symmetric encryption
- **Key Exchange**: ECDH P-256 for key agreement
- **Digital Signatures**: ECDSA P-256 for authentication
- **Hashing**: SHA-256 for integrity verification
- **Key Derivation**: HKDF-SHA256 for forward secrecy
- **Document Signing**: HMAC-SHA256 for simple file signatures

## 🏗️ Technical Stack

### Frontend Technologies
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS for responsive design
- **Icons**: Lucide React icon library
- **Build Tool**: Vite for fast development and optimized builds

### Browser APIs & Standards
- **Web Crypto API**: All cryptographic operations
- **MediaDevices API**: Audio recording functionality
- **Permissions API**: Microphone access management
- **BroadcastChannel API**: Cross-tab communication
- **FileReader API**: File processing and data URLs
- **LocalStorage**: Session data persistence

### Cryptographic Libraries
- **Native Web Crypto**: No external crypto dependencies
- **UUID**: Unique identifier generation
- **Base64 Encoding**: Data serialization

## 🔐 Cryptographic Implementation Details

### Message Encryption Flow
1. **Key Generation**: ECDH P-256 key pairs generated per session
2. **Shared Secret**: ECDH key agreement between participants
3. **Message Keys**: HKDF derives unique keys per message
4. **Encryption**: AES-GCM with 96-bit IV and authentication tag
5. **Signature**: ECDSA signature over encrypted payload

### Digital Certificate System
- **Certificate Authority**: Self-signed root CA per session
- **User Certificates**: Issued with ECDSA P-256 public keys
- **Validity**: Certificates expire when session ends
- **Verification**: Full certificate chain validation

### Document Signing Process
- **Simple Mode**: HMAC-SHA256 with session keys
- **PKI Mode**: ECDSA signatures with certificate attachment
- **File Integrity**: SHA-256 hash of complete file content
- **Metadata**: Timestamp, filename, and size included in signature

## 🎯 Key Features

### Secure Messaging
- Real-time encrypted chat between two participants
- Message integrity verification with digital signatures
- Forward secrecy ensures past messages remain secure
- No server-side message storage or logging

### Audio Messages
- WebRTC-based audio recording with MediaRecorder API
- Multiple codec support (Opus, WebM, MP4, OGG)
- Automatic microphone permission handling
- Compressed audio with 128kbps bitrate

### Document Signing & Verification
- Two-tier signing system (simple HMAC and full PKI)
- Detached signature files for document portability
- Comprehensive verification with integrity checks
- Support for any file type and size

### User Experience
- Anonymous sessions with temporary identities
- No account creation or persistent data
- Cross-tab synchronization for multi-window usage
- Responsive design for desktop and mobile

## 🔧 Security Best Practices Implemented

### Key Management
- **Ephemeral Keys**: All keys are session-based and non-persistent
- **Secure Generation**: Web Crypto API ensures cryptographically secure randomness
- **Memory Cleanup**: Explicit key material wiping on session end
- **No Key Reuse**: Fresh keys generated for each message

### Data Protection
- **No Persistent Storage**: Messages deleted when session ends
- **Secure Transport**: All data encrypted before transmission
- **Integrity Verification**: HMAC/ECDSA prevents tampering
- **Forward Secrecy**: Compromised keys don't affect past messages

### Browser Security
- **Content Security Policy**: Strict CSP headers prevent XSS
- **CORS Headers**: Proper cross-origin resource sharing
- **Secure Contexts**: HTTPS required for crypto operations
- **Permission Management**: Explicit user consent for device access

## 🚀 Performance Optimizations

### Build Optimizations
- **Code Splitting**: Vendor, crypto, and UI chunks separated
- **Tree Shaking**: Unused code eliminated from bundles
- **Minification**: ESBuild for fast, optimized builds
- **Caching**: Immutable assets with long-term caching

### Runtime Performance
- **Lazy Loading**: Components loaded on demand
- **Memory Management**: Explicit cleanup of crypto materials
- **Efficient Rendering**: React hooks for optimal re-renders
- **Background Processing**: Web Workers for heavy crypto operations

## 🔍 Security Considerations

### Threat Model
- **Passive Eavesdropping**: Protected by end-to-end encryption
- **Active MITM**: Prevented by certificate verification
- **Message Tampering**: Detected by digital signatures
- **Replay Attacks**: Mitigated by timestamps and nonces

### Known Limitations
- **Trust on First Use**: No pre-shared certificate validation
- **Session-Based CA**: Certificate authority is temporary
- **Browser Dependency**: Security relies on Web Crypto API implementation
- **No Perfect Forward Secrecy**: Simple document signing uses symmetric keys

## 📋 Browser Compatibility

### Minimum Requirements
- **Chrome/Edge**: Version 60+ (Web Crypto API support)
- **Firefox**: Version 55+ (Full crypto primitives)
- **Safari**: Version 11+ (ECDH and ECDSA support)
- **Mobile**: iOS Safari 11+, Chrome Mobile 60+

### Required Features
- Web Crypto API with ECDH, ECDSA, AES-GCM, HKDF
- MediaDevices API for audio recording
- BroadcastChannel API for cross-tab communication
- ES2020+ JavaScript features

## 🛠️ Development & Deployment

### Development Setup
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Security Headers
The application includes comprehensive security headers:
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: Restrictive device access

## 📄 License & Disclaimer

This is a demonstration application showcasing modern web cryptography. While it implements industry-standard cryptographic primitives, it should be thoroughly audited before use in production environments where security is critical.

The application is designed for educational purposes and proof-of-concept implementations of secure web communication protocols.