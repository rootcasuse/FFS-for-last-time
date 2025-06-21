import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../types';
import { useCrypto } from './CryptoContext';

// Use localStorage for room storage
const getRooms = () => {
  const rooms = localStorage.getItem('chatRooms');
  return rooms ? JSON.parse(rooms) : {};
};

const saveRooms = (rooms: any) => {
  localStorage.setItem('chatRooms', JSON.stringify(rooms));
};

// Setup BroadcastChannel for cross-tab communication
const broadcastChannel = new BroadcastChannel('chat_channel');

interface ChatContextType {
  messages: Message[];
  isConnected: boolean;
  isPaired: boolean;
  pairingCode: string | null;
  sendMessage: (content: string, type: 'text' | 'image' | 'audio' | 'document') => Promise<void>;
  generateCode: () => Promise<string>;
  joinChat: (code: string) => Promise<boolean>;
  leaveChat: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(true);
  const [isPaired, setIsPaired] = useState(false);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [userId] = useState(() => uuidv4());
  const crypto = useCrypto();

  useEffect(() => {
    // Listen for messages from other tabs
    broadcastChannel.onmessage = async (event) => {
      if (event.data.type === 'message' && event.data.roomCode === pairingCode) {
        try {
          // Verify message signature if certificate is provided
          let isVerified = false;
          if (event.data.certificate && event.data.signature && crypto.verifyMessage) {
            try {
              isVerified = await crypto.verifyMessage(
                event.data.content,
                event.data.signature,
                event.data.certificate
              );
            } catch (verifyError) {
              console.warn('Message verification failed:', verifyError);
              isVerified = false;
            }
          }

          const newMessage: Message = {
            id: uuidv4(),
            content: event.data.content,
            type: event.data.messageType,
            timestamp: Date.now(),
            sender: 'peer',
            encrypted: true,
            verified: isVerified,
            signature: event.data.signature,
            senderCert: event.data.certificate
          };

          setMessages(prev => [...prev, newMessage]);
        } catch (error) {
          console.error('Failed to process received message:', error);
          // Still add the message even if verification fails
          const newMessage: Message = {
            id: uuidv4(),
            content: event.data.content,
            type: event.data.messageType,
            timestamp: Date.now(),
            sender: 'peer',
            encrypted: false,
            verified: false,
            signature: event.data.signature,
            senderCert: event.data.certificate
          };
          setMessages(prev => [...prev, newMessage]);
        }
      } else if (event.data.type === 'room_closed' && event.data.roomCode === pairingCode) {
        leaveChat();
      } else if (event.data.type === 'peer_joined' && event.data.roomCode === pairingCode) {
        // When someone joins our room, we become paired
        setIsPaired(true);
      }
    };

    return () => {
      broadcastChannel.onmessage = null;
    };
  }, [pairingCode, crypto]);

  const generateCode = async (): Promise<string> => {
    try {
      // Generate a simple 6-character code
      const code = Math.random().toString(36).substr(2, 6).toUpperCase();
      
      // Save room to localStorage with user certificate info
      const rooms = getRooms();
      rooms[code] = {
        creator: userId,
        creatorCert: crypto.certificate,
        created: Date.now(),
        active: true
      };
      saveRooms(rooms);
      
      setPairingCode(code);
      // Don't set paired yet - wait for someone to join
      setIsPaired(false);
      return code;
    } catch (error) {
      console.error('Failed to generate code:', error);
      throw error;
    }
  };

  const joinChat = async (code: string): Promise<boolean> => {
    try {
      const rooms = getRooms();
      const room = rooms[code];
      
      if (!room || !room.active) {
        console.log('Room not found or inactive:', code);
        return false;
      }

      // Don't allow creator to join their own room
      if (room.creator === userId) {
        console.log('Cannot join your own room');
        return false;
      }

      setPairingCode(code);
      setIsPaired(true);
      
      // Notify the room creator that someone joined
      broadcastChannel.postMessage({
        type: 'peer_joined',
        roomCode: code,
        joiner: userId
      });
      
      return true;
    } catch (error) {
      console.error('Failed to join chat:', error);
      return false;
    }
  };

  const sendMessage = async (
    content: string,
    type: 'text' | 'image' | 'audio' | 'document'
  ): Promise<void> => {
    if (!isPaired || !pairingCode) {
      throw new Error('Not connected or paired');
    }

    try {
      let signature = '';
      
      // Sign the message if we have a certificate and signing capability
      if (crypto.certificate && crypto.signMessage) {
        try {
          signature = await crypto.signMessage(content);
        } catch (signError) {
          console.warn('Failed to sign message, sending without signature:', signError);
        }
      }

      const message: Message = {
        id: uuidv4(),
        content,
        type,
        timestamp: Date.now(),
        sender: 'self',
        encrypted: true,
        verified: true, // Self messages are always verified
        signature,
        senderCert: crypto.certificate
      };

      setMessages(prev => [...prev, message]);

      // Broadcast message to other tabs
      broadcastChannel.postMessage({
        type: 'message',
        roomCode: pairingCode,
        content,
        messageType: type,
        signature,
        certificate: crypto.certificate
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const leaveChat = () => {
    if (pairingCode) {
      const rooms = getRooms();
      if (rooms[pairingCode]) {
        if (rooms[pairingCode].creator === userId) {
          // If we're the creator, mark room as inactive
          rooms[pairingCode].active = false;
          saveRooms(rooms);
          
          // Notify other tabs that the room is closed
          broadcastChannel.postMessage({
            type: 'room_closed',
            roomCode: pairingCode
          });
        }
      }
    }
    setMessages([]);
    setIsPaired(false);
    setPairingCode(null);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        isConnected,
        isPaired,
        pairingCode,
        sendMessage,
        generateCode,
        joinChat,
        leaveChat
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};