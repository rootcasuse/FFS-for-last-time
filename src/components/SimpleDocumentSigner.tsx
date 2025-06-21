import React, { useState, useRef, useEffect } from 'react';
import { FileText, Upload, Download, Shield, CheckCircle, XCircle, Key, Info, AlertCircle, Copy, Save, Eye, EyeOff } from 'lucide-react';
import Button from './ui/Button';
import { SimpleSignature } from '../utils/simpleSignature';

const SimpleDocumentSigner: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [sessionKey, setSessionKey] = useState<string>('');
  const [verificationKey, setVerificationKey] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [showMechanism, setShowMechanism] = useState(false);
  const [signatureInfo, setSignatureInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [showSessionKey, setShowSessionKey] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Generate session key on component mount
  useEffect(() => {
    const initializeKey = async () => {
      try {
        const key = await SimpleSignature.generateSessionKey();
        setSessionKey(key);
      } catch (error) {
        console.error('Failed to generate session key:', error);
        setError('Failed to initialize signing system');
      }
    };

    initializeKey();

    // Cleanup on unmount
    return () => {
      SimpleSignature.reset();
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
      setVerificationResult(null);
      setSignatureInfo(null);
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

    if (!sessionKey) {
      setError('Session key not available. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const signature = await SimpleSignature.signFile(selectedFile, sessionKey);
      setSignatureInfo(signature);

      // Create and download signature file
      const signatureBlob = SimpleSignature.createSignatureFile(signature);
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

    if (!verificationKey.trim()) {
      setError('Please enter the verification key');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Parse signature file
      const parsedSignature = await SimpleSignature.parseSignatureFile(signatureFile);
      if (!parsedSignature) {
        setError('Invalid signature file format');
        setIsProcessing(false);
        return;
      }

      // Verify document signature
      const isValid = await SimpleSignature.verifyFile(
        selectedFile,
        parsedSignature.signature,
        verificationKey.trim(),
        parsedSignature.timestamp
      );

      setVerificationResult(isValid);
      setSignatureInfo(parsedSignature);

    } catch (err) {
      console.error('Document verification failed:', err);
      setError('Failed to verify document. Please check your files and key.');
      setVerificationResult(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyKey = async () => {
    if (sessionKey) {
      try {
        await navigator.clipboard.writeText(sessionKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy key:', err);
      }
    }
  };

  const saveKey = () => {
    if (sessionKey) {
      const keyBlob = new Blob([sessionKey], { type: 'text/plain' });
      const url = URL.createObjectURL(keyBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'signing-key.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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

  const obfuscateKey = (key: string): string => {
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Document Signer</h1>
        <p className="text-gray-400">Sign and verify documents with session keys</p>
        
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
            Simple Signature Mechanism
          </h2>
          
          <div className="space-y-4 text-gray-300">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">🔐 Signing Process:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li><strong>Session Key Generation:</strong> A unique HMAC-SHA256 key is generated for this session</li>
                <li><strong>File Processing:</strong> The entire file content is read and encoded</li>
                <li><strong>Signature Creation:</strong> File data + metadata is signed with the session key</li>
                <li><strong>Signature File:</strong> A detached .sig file is created with the signature</li>
              </ol>
            </div>
            
            <div className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-2">✅ Verification Process:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li><strong>Key Input:</strong> You must provide the same session key used for signing</li>
                <li><strong>File Comparison:</strong> The current file is processed the same way as during signing</li>
                <li><strong>Signature Verification:</strong> The signature is verified using the provided key</li>
                <li><strong>Result:</strong> Verification succeeds only if the file and key match exactly</li>
              </ol>
            </div>
            
            <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-300 mb-1">Important Notes:</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <strong>Save your key:</strong> You must keep the session key to verify signatures later</li>
                    <li>• <strong>Key Security:</strong> Anyone with the key can create valid signatures</li>
                    <li>• <strong>File Integrity:</strong> Any change to the file will break the signature</li>
                    <li>• <strong>Session Based:</strong> Each session generates a new unique key</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left Column - Document Signing */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-green-500">
            <h2 className="text-2xl font-semibold mb-4 flex items-center text-green-400">
              <Shield className="w-6 h-6 mr-2" />
              Sign Document
            </h2>
            
            {/* Session Key Display */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center">
                <Key className="w-5 h-5 mr-2" />
                Your Session Key
              </h3>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Session Signing Key</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowSessionKey(!showSessionKey)}
                      className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
                      title={showSessionKey ? "Hide Key" : "Show Key"}
                    >
                      {showSessionKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={copyKey}
                      className={`p-2 rounded-lg transition-colors ${
                        copied ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'
                      }`}
                      title="Copy Key"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={saveKey}
                      className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
                      title="Save Key to File"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="bg-gray-900 rounded p-3 font-mono text-sm break-all">
                  {sessionKey ? (showSessionKey ? sessionKey : obfuscateKey(sessionKey)) : 'Generating...'}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-amber-400">
                    ⚠️ Save this key! You'll need it to verify signatures later.
                  </p>
                  {copied && (
                    <span className="text-xs text-green-400">✓ Copied!</span>
                  )}
                </div>
              </div>
            </div>

            {/* File Selection for Signing */}
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="secondary"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choose File to Sign
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

              <Button
                onClick={signDocument}
                disabled={!selectedFile || !sessionKey || isProcessing}
                isLoading={isProcessing}
                className="w-full"
              >
                <Shield className="w-4 h-4 mr-2" />
                {isProcessing ? 'Signing Document...' : 'Sign Document'}
              </Button>

              {signatureInfo && verificationResult === null && (
                <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">Document signed successfully!</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Signature file (.sig) has been downloaded. Keep your session key safe for verification.
                  </p>
                  <div className="mt-3 text-xs text-gray-500">
                    <p><strong>File:</strong> {signatureInfo.filename}</p>
                    <p><strong>Signed At:</strong> {formatDate(signatureInfo.timestamp)}</p>
                    <p><strong>Size:</strong> {formatFileSize(signatureInfo.size)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Document Verification */}
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-xl p-6 border-l-4 border-blue-500">
            <h2 className="text-2xl font-semibold mb-4 flex items-center text-blue-400">
              <CheckCircle className="w-6 h-6 mr-2" />
              Verify Document
            </h2>
            
            <div className="space-y-4">
              {/* Document Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Document to Verify
                </label>
                {!selectedFile && (
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="secondary"
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Document
                  </Button>
                )}
                {selectedFile && (
                  <div className="bg-gray-700 rounded-lg p-3">
                    <p className="text-sm text-white">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">{formatFileSize(selectedFile.size)}</p>
                  </div>
                )}
              </div>

              {/* Signature File Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Signature File
                </label>
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

                {signatureFile && (
                  <div className="bg-gray-700 rounded-lg p-3 mt-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white">{signatureFile.name}</p>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(signatureFile.size)}
                        </p>
                      </div>
                      <Key className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>

              {/* Verification Key Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Verification Key
                </label>
                <input
                  type="text"
                  value={verificationKey}
                  onChange={(e) => setVerificationKey(e.target.value)}
                  placeholder="Enter the session key used for signing"
                  className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">
                  This must be the exact same key that was used to sign the document
                </p>
              </div>

              <Button
                onClick={verifyDocument}
                disabled={!selectedFile || !signatureFile || !verificationKey.trim() || isProcessing}
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
                  
                  {signatureInfo && (
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="text-gray-300">
                        <strong>Original File:</strong> {signatureInfo.filename}
                      </p>
                      <p className="text-gray-300">
                        <strong>Signed:</strong> {formatDate(signatureInfo.timestamp)}
                      </p>
                      <p className="text-gray-300">
                        <strong>Size:</strong> {formatFileSize(signatureInfo.size)}
                      </p>
                      {verificationResult && (
                        <div className="bg-green-800/30 rounded p-2 mt-2">
                          <p className="text-green-300 text-xs">
                            ✓ File integrity verified<br/>
                            ✓ Signature is authentic<br/>
                            ✓ Key matches original signing key
                          </p>
                        </div>
                      )}
                      {!verificationResult && (
                        <div className="bg-red-800/30 rounded p-2 mt-2">
                          <p className="text-red-300 text-xs">
                            ✗ File may have been modified<br/>
                            ✗ Wrong verification key<br/>
                            ✗ Signature does not match
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
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

export default SimpleDocumentSigner;