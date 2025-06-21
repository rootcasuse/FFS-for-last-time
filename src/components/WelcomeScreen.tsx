import React from 'react';
import { Lock, Shield, ArrowRight } from 'lucide-react';
import Button from './ui/Button';

interface WelcomeScreenProps {
  onStart: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <div className="mb-6 flex justify-center">
        <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-white" />
        </div>
      </div>
      
      <h1 className="text-4xl font-bold mb-3 text-white">Cipher</h1>
      <p className="text-xl mb-8 text-indigo-300">Secure, Anonymous Messaging</p>
      
      <div className="max-w-md mb-10">
        <p className="text-gray-300 mb-6">
          End-to-end encrypted chat with no accounts, no history, and no tracking.
          Your messages disappear when you close the app.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-700 p-4 rounded-lg">
            <Shield className="w-6 h-6 text-green-400 mb-2" />
            <h3 className="font-semibold text-lg mb-1">End-to-End Encryption</h3>
            <p className="text-sm text-gray-400">All messages are encrypted using military-grade cryptography</p>
          </div>
          
          <div className="bg-gray-700 p-4 rounded-lg">
            <Lock className="w-6 h-6 text-green-400 mb-2" />
            <h3 className="font-semibold text-lg mb-1">Zero Storage</h3>
            <p className="text-sm text-gray-400">No message history or data is ever stored on our servers</p>
          </div>
        </div>
      </div>
      
      <Button 
        onClick={onStart}
        className="group"
      >
        Start Secure Chat
        <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
      </Button>
    </div>
  );
};

export default WelcomeScreen;