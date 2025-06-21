import React, { useState, useRef } from 'react';
import { FileText, Upload, Download, Shield, CheckCircle, XCircle, Key, Info, AlertCircle } from 'lucide-react';
import Button from './ui/Button';
import { useCrypto } from '../context/CryptoContext';
import { DigitalSigner } from '../utils/signing';
import { DocumentSignature } from '../types';

const DocumentSigner: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [documentSignature, setDocumentSignature] = useState<DocumentSignature | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [showMechanism, setShowMechanism] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const crypto = useCrypto();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setVerificationResult(null);
      setDocumentSignature(null);
    }
  };

  const handleSignatureFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSignatureFile(file);
      setError('');
    }
  };

  const signDocument = async () => {
    if (!selectedFile) {
      setError('Please select a file to sign');
      return;
    }

    if (!crypto.signingKeyPair?.privateKey) {
      setError('Signing key not available. Please refresh and try again.');
      return;
    }

    if (!crypto.certificate) {
      setError('Digital certificate not available. Please ensure you have set a username.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const signature = await DigitalSigner.signDocument(
        selectedFile,
        crypto.signingKeyPair.privateKey,
        crypto.certificate
      );

      setDocumentSignature(signature);

      // Create and download signature file
      const signatureBlob = DigitalSigner.createSignatureFile(signature);
      const url = URL.createObjectURL(signatureBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedFile.name}.sig`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Document signing failed:', err);
      setError(`Failed to sign document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const verifyDocument = async () => {
    if (!selectedFile || !signatureFile) {
      setError('Please select both a document and its signature file');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Parse signature file
      const parsedSignature = await DigitalSigner.parseSignatureFile(signatureFile);
      if (!parsedSignature) {
        setError('Invalid signature file format');
        setIsProcessing(false);
        return;
      }

      // Verify certificate
      const isCertValid = await crypto.verifyCertificate(parsedSignature.certificate);
      if (!isCertValid) {
        setError('Invalid or expired certificate');
        setVerificationResult(false);
        setIsProcessing(false);
        return;
      }

      // Import signer's public key
      const signerPublicKey = await crypto.importPublicKey(parsedSignature.certificate.publicKey);

      // Verify document signature
      const isValid = await DigitalSigner.verifyDocumentSignature(
        selectedFile,
        parsedSignature,
        signerPublicKey
      );

      setVerificationResult(isValid);
      setDocumentSignature(parsedSignature);

    } catch (err) {
      console.error('Document verification failed:', err);
      setError('Failed to verify document. Please check your files and try again.');
      setVerificationResult(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Document Signer</h1>
        <p className="text-gray-400">Sign and verify documents with digital certificates</p>
        
        <button
          onClick={() => setShowMechanism(!showMechanism)}
          className="mt-4 flex items-center space-x-2 mx-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
        >
          <Info className="w-4 h-4" />
          <span>{showMechanism ? 'Hide' : 'How it works'}</span>
        </button>
      </div>

      {/* Mechanism Explanation */}
      {showMechanism && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-400" />
            Digital Signature Mechanism
          </h2>
          
          <div className="space-y-4 text-gray-300">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">🔐 Signing Process:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li><strong>Document Hashing:</strong> SHA-256 hash is computed from the entire document</li>
                <li><strong>Digital Signing:</strong> Hash is signed with your ECDSA private key (P-256 curve)</li>
                <li><strong>Certificate Attachment:</strong> Your digital certificate is included for identity verification</li>
                <li><strong>Signature File:</strong> A detached .sig file is created containing the signature and certificate</li>
              </ol>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">✅ Verification Process:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li><strong>Certificate Validation:</strong> Verifies the signer's certificate is valid and not expired</li>
                <li><strong>Document Integrity:</strong> Computes SHA-256 hash of the current document</li>
                <li><strong>Hash Comparison:</strong> Compares current hash with the signed hash</li>
                <li><strong>Signature Verification:</strong> Uses signer's public key to verify the ECDSA signature</li>
              </ol>
            </div>
            
            <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-indigo-300 mb-1">Security Guarantees:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Authenticity:</strong> Proves the document came from the certificate holder</li>
                    <li>• <strong>Integrity:</strong> Detects any changes to the document after signing</li>
                    <li>• <strong>Non-repudiation:</strong> Signer cannot deny having signed the document</li>
                    <li>• <strong>Timestamp:</strong> Records when the document was signed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Selection */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Upload className="w-5 h-5 mr-2" />
          Select Document
        </h2>
        
        <div className="space-y-4">
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.zip,.json"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="secondary"
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose File to Sign/Verify
            </Button>
          </div>

          {selectedFile && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{selectedFile.name}</p>
                  <p className="text-sm text-gray-400">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Signing */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Sign Document
        </h2>
        
        <div className="space-y-4">
          {crypto.certificate && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <Key className="w-5 h-5 text-green-400" />
                <div>
                  <p className="font-medium text-white">Certificate: {crypto.certificate.subject.split('-')[0]}</p>
                  <p className="text-sm text-gray-400">
                    Session Started: {formatDate(crypto.certificate.issuedAt)} • 
                    Valid Until: {formatDate(crypto.certificate.expiresAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={signDocument}
            disabled={!selectedFile || !crypto.certificate || !crypto.signingKeyPair || isProcessing}
            isLoading={isProcessing}
            className="w-full"
          >
            <Shield className="w-4 h-4 mr-2" />
            {isProcessing ? 'Signing Document...' : 'Sign Document'}
          </Button>

          {documentSignature && verificationResult === null && (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-medium">Document signed successfully!</span>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Signature file (.sig) has been downloaded. Share it along with your document for verification.
              </p>
              <div className="mt-3 text-xs text-gray-500">
                <p><strong>Document Hash:</strong> {documentSignature.documentHash.slice(0, 32)}...</p>
                <p><strong>Signed At:</strong> {formatDate(documentSignature.timestamp)}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Verification */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          Verify Document
        </h2>
        
        <div className="space-y-4">
          <div>
            <input
              type="file"
              ref={signatureInputRef}
              onChange={handleSignatureFileSelect}
              className="hidden"
              accept=".sig,.json"
            />
            <Button
              onClick={() => signatureInputRef.current?.click()}
              variant="secondary"
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Choose Signature File (.sig)
            </Button>
          </div>

          {signatureFile && (
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">{signatureFile.name}</p>
                  <p className="text-sm text-gray-400">
                    {formatFileSize(signatureFile.size)}
                  </p>
                </div>
                <Key className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          )}

          <Button
            onClick={verifyDocument}
            disabled={!selectedFile || !signatureFile || isProcessing}
            isLoading={isProcessing}
            className="w-full"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isProcessing ? 'Verifying Document...' : 'Verify Document'}
          </Button>

          {/* Verification Result */}
          {verificationResult !== null && (
            <div className={`border rounded-lg p-4 ${
              verificationResult 
                ? 'bg-green-900/20 border-green-700' 
                : 'bg-red-900/20 border-red-700'
            }`}>
              <div className="flex items-center space-x-2">
                {verificationResult ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400" />
                )}
                <span className={`font-medium ${
                  verificationResult ? 'text-green-400' : 'text-red-400'
                }`}>
                  {verificationResult ? 'Document verification successful!' : 'Document verification failed!'}
                </span>
              </div>
              
              {documentSignature && (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-gray-300">
                    <strong>Signer:</strong> {documentSignature.certificate.subject.split('-')[0]}
                  </p>
                  <p className="text-gray-300">
                    <strong>Signed:</strong> {formatDate(documentSignature.timestamp)}
                  </p>
                  <p className="text-gray-300">
                    <strong>Document Hash:</strong> 
                    <span className="font-mono text-xs ml-2 break-all">
                      {documentSignature.documentHash}
                    </span>
                  </p>
                  {verificationResult && (
                    <div className="bg-green-800/30 rounded p-2 mt-2">
                      <p className="text-green-300 text-xs">
                        ✓ Certificate is valid and not expired<br/>
                        ✓ Document integrity verified<br/>
                        ✓ Digital signature is authentic
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400 font-medium">Error</span>
          </div>
          <p className="text-red-300 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
};

export default DocumentSigner;