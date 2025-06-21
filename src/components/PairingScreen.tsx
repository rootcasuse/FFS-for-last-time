import React, { useState, useEffect } from 'react';
import { KeyRound, Copy, ArrowRight, Shield, Award, Key, User } from 'lucide-react';
import Button from './ui/Button';
import { useChat } from '../context/ChatContext';
import { useCrypto } from '../context/CryptoContext';

interface PairingScreenProps {
  onPaired: () => void;
}

const PairingScreen: React.FC<PairingScreenProps> = ({ onPaired }) => {
  const { generateCode, joinChat, pairingCode, isPaired } = useChat();
  const { certificate, isInitializing, generateCertificate } = useCrypto();
  const [inputCode, setInputCode] = useState('');
  const [username, setUsername] = useState('');
  const [showUsernameInput, setShowUsernameInput] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Check if we need to show username input
  useEffect(() => {
    const savedUsername = localStorage.getItem('cipher-username');
    if (savedUsername && certificate) {
      setUsername(savedUsername);
      setShowUsernameInput(false);
    } else if (savedUsername) {
      setUsername(savedUsername);
    }
  }, [certificate]);

  // Auto-navigate to chat when paired
  useEffect(() => {
    if (isPaired) {
      onPaired();
    }
  }, [isPaired, onPaired]);

  const handleSetUsername = async () => {
    if (!username.trim()) {
      setError('Please enter a valid username');
      return;
    }
    
    if (username.length < 2 || username.length > 20) {
      setError('Username must be between 2-20 characters');
      return;
    }

    try {
      localStorage.setItem('cipher-username', username.trim());
      
      // Generate certificate with the username
      await generateCertificate(username.trim());
      
      setShowUsernameInput(false);
      setError('');
    } catch (error) {
      setError('Failed to create digital identity. Please try again.');
      console.error('Certificate generation failed:', error);
    }
  };

  const handleGenerateCode = async () => {
    if (showUsernameInput) {
      await handleSetUsername();
      return;
    }

    if (!certificate) {
      setError('Digital certificate not ready. Please wait or refresh the page.');
      return;
    }

    setIsGenerating(true);
    setError('');
    try {
      await generateCode();
    } catch (err) {
      setError('Failed to generate code. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleJoinChat = async () => {
    if (showUsernameInput) {
      await handleSetUsername();
      return;
    }

    if (!inputCode.trim()) {
      setError('Please enter a valid code');
      return;
    }

    if (!certificate) {
      setError('Digital certificate not ready. Please wait or refresh the page.');
      return;
    }

    setIsJoining(true);
    setError('');
    try {
      const success = await joinChat(inputCode.trim().toUpperCase());
      if (success) {
        // onPaired will be called automatically via useEffect when isPaired becomes true
      } else {
        setError('Invalid code or room not found. Make sure someone has created the room first.');
      }
    } catch (err) {
      setError('Failed to join chat. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const copyToClipboard = async () => {
    if (pairingCode) {
      try {
        await navigator.clipboard.writeText(pairingCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const resetUsername = () => {
    localStorage.removeItem('cipher-username');
    setUsername('');
    setShowUsernameInput(true);
  };

  // Show loading state while crypto is initializing
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-900 flex flex-col items-center justify-center p-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-10 h-10 text-white animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold mb-3 text-white">Cipher Chat</h1>
          <p className="text-xl text-indigo-300 mb-6">Initializing Security...</p>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce"></div>
              <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-4 h-4 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
            <p className="text-gray-300 text-sm">
              Generating cryptographic keys...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-indigo-900 flex flex-col items-center justify-center p-8">
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold mb-3 text-white">Cipher Chat</h1>
        <p className="text-xl text-indigo-300">PKI-Secured Anonymous Messaging</p>
        
        {/* Username Display */}
        {!showUsernameInput && username && (
          <div className="mt-6 bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <User className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Signed in as: {username}</span>
            </div>
            <button
              onClick={resetUsername}
              className="text-xs text-gray-400 hover:text-white transition-colors"
            >
              Change username
            </button>
          </div>
        )}
        
        {/* Certificate Status */}
        {certificate && !showUsernameInput && (
          <div className="mt-4 bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 max-w-md mx-auto">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Award className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">Digital Identity Ready</span>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <p><strong>Certificate:</strong> {certificate.subject.split('-')[0]}</p>
              <p><strong>Expires:</strong> {formatDate(certificate.expiresAt)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="w-full max-w-md space-y-6">
        {/* Username Input */}
        {showUsernameInput && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <User className="w-5 h-5 mr-2" />
              Choose Your Identity
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full p-4 bg-gray-900/50 rounded-lg border border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                maxLength={20}
                onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
              />
              <p className="text-sm text-gray-400">
                This will be your identity in the chat and on your digital certificate
              </p>
              <Button
                onClick={handleSetUsername}
                className="w-full"
                disabled={!username.trim()}
              >
                Create Digital Identity
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Chat Controls - Only show when username is set */}
        {!showUsernameInput && (
          <>
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700">
              {pairingCode ? (
                <div className="text-center">
                  <h2 className="text-xl font-semibold mb-4">Your Secure Code</h2>
                  <div className="bg-gray-900/50 p-4 rounded-lg mb-4 flex items-center justify-center space-x-3">
                    <span className="text-3xl font-mono tracking-wider text-green-400">
                      {pairingCode}
                    </span>
                    <button
                      onClick={copyToClipboard}
                      className={`p-2 rounded-lg transition-colors ${
                        copied ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-400 mb-4">
                    Share this code with someone to start a secure, signed conversation
                  </p>
                  <div className="bg-indigo-900/30 border border-indigo-700 rounded-lg p-3 mb-4">
                    <div className="flex items-center space-x-2 text-sm text-indigo-300">
                      <Key className="w-4 h-4" />
                      <span>Messages will be digitally signed with your certificate</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    Waiting for someone to join...
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-4">Start New Chat</h2>
                  <Button
                    onClick={handleGenerateCode}
                    isLoading={isGenerating}
                    className="w-full"
                    disabled={!certificate}
                  >
                    Generate Secure Code
                  </Button>
                  {!certificate && (
                    <p className="text-sm text-amber-400 mt-2 text-center">
                      Creating digital certificate...
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 shadow-xl border border-gray-700">
              <h2 className="text-xl font-semibold mb-4">Join Existing Chat</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="Enter secure code"
                  className="w-full p-4 bg-gray-900/50 rounded-lg border border-gray-600 text-white text-center text-xl font-mono tracking-wider placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  maxLength={6}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinChat()}
                />
                <Button
                  onClick={handleJoinChat}
                  isLoading={isJoining}
                  className="w-full"
                  disabled={!inputCode.trim() || !certificate}
                >
                  Join Chat
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                {!certificate && (
                  <p className="text-sm text-amber-400 text-center">
                    Waiting for certificate initialization...
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-900/50 backdrop-blur-sm border border-red-700 text-red-200 p-4 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Security Features - Only show when not setting username */}
        {!showUsernameInput && (
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-center">Security Features</h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center space-x-3">
                <Shield className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>End-to-end encryption with forward secrecy</span>
              </div>
              <div className="flex items-center space-x-3">
                <Award className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <span>Digital signatures with PKI certificates</span>
              </div>
              <div className="flex items-center space-x-3">
                <Key className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span>Document signing and verification</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PairingScreen;