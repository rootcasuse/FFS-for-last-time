import React, { useState } from 'react';
import ChatScreen from './components/ChatScreen';
import PairingScreen from './components/PairingScreen';
import { ChatProvider } from './context/ChatContext';
import { CryptoProvider } from './context/CryptoContext';

function App() {
  const [isChatting, setIsChatting] = useState(false);

  return (
    <CryptoProvider>
      <ChatProvider>
        <div className="min-h-screen bg-gray-900 text-gray-100">
          {!isChatting ? (
            <PairingScreen onPaired={() => setIsChatting(true)} />
          ) : (
            <ChatScreen onLeave={() => setIsChatting(false)} />
          )}
        </div>
      </ChatProvider>
    </CryptoProvider>
  );
}

export default App;