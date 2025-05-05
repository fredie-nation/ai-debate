import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import AIAvatar from './AIAvatar';
import { startDebate, continuateDebate, speakText } from '@/services/geminiService';
import { toast } from '@/components/ui/sonner';
import { Play, Square } from 'lucide-react';

type AIRole = 'chatgpt' | 'gemini';
type AIMessage = {
  role: AIRole;
  content: string;
};

const AIDebate: React.FC = () => {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isDebating, setIsDebating] = useState(false);
  const [speakingAI, setSpeakingAI] = useState<AIRole | null>(null);
  const [audioFinished, setAudioFinished] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;
  const debateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Debug helper for monitoring state
  useEffect(() => {
    if (isDebating) {
      console.log("Current debate state:", {
        messagesCount: messages.length,
        isProcessing: isProcessingRef.current,
        speakingAI,
        audioFinished,
        retryCount: retryCountRef.current
      });
    }
  }, [isDebating, messages, speakingAI, audioFinished]);

  // Effect to trigger next response when audio finishes
  useEffect(() => {
    if (audioFinished && isDebating && !isProcessingRef.current) {
      console.log("Audio finished and debate active, proceeding to next response");
      setAudioFinished(false); // Reset for next round
      continuateDebateRound();
    }
  }, [audioFinished, isDebating]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
      
      if (debateTimeoutRef.current) {
        clearTimeout(debateTimeoutRef.current);
        debateTimeoutRef.current = null;
      }
    };
  }, []);

  const startNewDebate = async () => {
    // Reset all state
    setMessages([]);
    setIsDebating(true);
    setSpeakingAI('chatgpt');
    setAudioFinished(false);
    isProcessingRef.current = true;
    retryCountRef.current = 0;
    
    if (debateTimeoutRef.current) {
      clearTimeout(debateTimeoutRef.current);
      debateTimeoutRef.current = null;
    }
    
    try {
      console.log("Starting new debate...");
      const firstMessage = await startDebate();
      setMessages([firstMessage]);
      
      console.log("First message generated:", firstMessage);
      
      // Start speaking
      const audioElement = await speakText(firstMessage.content, firstMessage.role);
      audioElementRef.current = audioElement;
      
      if (audioElement) {
        // Only proceed to next response after audio finishes
        audioElement.onended = () => {
          console.log(`${firstMessage.role} finished speaking, triggering next response`);
          isProcessingRef.current = false;
          setAudioFinished(true);
        };
      } else {
        // If speech failed, still continue after a delay
        console.log("Speech failed, continuing after delay");
        setTimeout(() => {
          isProcessingRef.current = false;
          setAudioFinished(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Error starting debate:', error);
      setIsDebating(false);
      setSpeakingAI(null);
      isProcessingRef.current = false;
      toast.error('Failed to start the debate');
    }
  };

  const continuateDebateRound = async () => {
    // Fixed: Removed incorrect debate ending check
    if (!isDebating) {
      console.log("Debate is not active, not continuing");
      return;
    }
    
    if (isProcessingRef.current) {
      console.log("Already processing a response, skipping");
      return;
    }
    
    try {
      isProcessingRef.current = true;
      const nextAI: AIRole = messages[messages.length - 1].role === 'chatgpt' ? 'gemini' : 'chatgpt';
      console.log(`Generating response for ${nextAI}...`);
      setSpeakingAI(nextAI);
      
      const newMessage = await continuateDebate(messages);
      console.log(`Response generated for ${nextAI}:`, newMessage.content);
      
      // Reset retry count on successful response
      retryCountRef.current = 0;
      
      setMessages(prev => [...prev, newMessage]);
      
      // Start speaking
      console.log(`${nextAI} starting to speak`);
      const audioElement = await speakText(newMessage.content, newMessage.role);
      audioElementRef.current = audioElement;
      
      if (audioElement) {
        // Wait for audio to finish before proceeding
        audioElement.onended = () => {
          console.log(`${nextAI} finished speaking, marking audio as finished`);
          isProcessingRef.current = false;
          setAudioFinished(true); // This will trigger the useEffect to continue debate
        };
      } else {
        // If speech failed, still continue after a delay
        console.log("Speech failed, continuing after delay");
        setTimeout(() => {
          isProcessingRef.current = false;
          setAudioFinished(true);
        }, 2000);
      }
    } catch (error) {
      console.error('Error continuing debate:', error);
      retryCountRef.current += 1;
      isProcessingRef.current = false;
      
      if (retryCountRef.current <= maxRetries) {
        toast.error(`Error in debate continuation. Retrying... (${retryCountRef.current}/${maxRetries})`);
        
        // Try again after a delay with increasing backoff
        const delay = 1000 * retryCountRef.current;
        console.log(`Retrying after error in ${delay}ms`);
        
        debateTimeoutRef.current = setTimeout(() => {
          console.log("Retrying after error");
          isProcessingRef.current = false;
          setAudioFinished(true); // Try continuing the debate
        }, delay);
      } else {
        toast.error('Too many errors. Stopping debate.');
        stopDebate();
      }
    }
  };

  const stopDebate = () => {
    console.log("Stopping debate");
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    
    if (debateTimeoutRef.current) {
      clearTimeout(debateTimeoutRef.current);
      debateTimeoutRef.current = null;
    }
    
    setIsDebating(false);
    setSpeakingAI(null);
    setAudioFinished(false);
    isProcessingRef.current = false;
    retryCountRef.current = 0;
  };

  // Get chatGPT and Gemini messages
  const chatGPTMessages = messages.filter(msg => msg.role === 'chatgpt');
  const geminiMessages = messages.filter(msg => msg.role === 'gemini');

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-200">
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-4 md:px-8 md:py-6 border-b border-gray-800 bg-gray-950">
        <h1 className="text-xl md:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
          AI Shadow Duel
        </h1>
        <div className="flex gap-3">
          {!isDebating ? (
            <Button
              onClick={startNewDebate}
              disabled={isDebating}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full flex items-center gap-2 px-4 py-2"
            >
              <Play size={16} /> Start Debate
            </Button>
          ) : (
            <Button
              onClick={stopDebate}
              variant="destructive"
              className="bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center gap-2 px-4 py-2"
            >
              <Square size={16} /> Stop Debate
            </Button>
          )}
        </div>
      </div>

      {/* Main content area - Desktop: side by side, Mobile: stacked */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* ChatGPT Section */}
        <div className="w-full md:w-1/2 flex flex-col p-4 md:p-6 border-b md:border-b-0 md:border-r border-gray-800 bg-gradient-to-b from-gray-900 to-gray-950">
          <div className="flex flex-col items-center mb-4 md:mb-6">
            <AIAvatar 
              aiType="chatgpt" 
              isSpeaking={speakingAI === 'chatgpt'} 
              className="h-12 w-12 md:h-16 md:w-16 mb-2 md:mb-4"
            />
            <h2 className="text-lg md:text-xl font-bold text-blue-400">ChatGPT</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 pr-2 md:pr-4">
            {chatGPTMessages.map((msg, idx) => (
              <div key={idx} className="mb-4 p-3 rounded-lg bg-gray-800 bg-opacity-50 animate-fadeIn">
                <p className="text-sm md:text-base">{msg.content}</p>
              </div>
            ))}
            {chatGPTMessages.length === 0 && (
              <div className="flex items-center justify-center h-full opacity-50">
                <p className="text-sm text-center">The debate hasn't started yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Gemini Section */}
        <div className="w-full md:w-1/2 flex flex-col p-4 md:p-6 bg-gradient-to-b from-gray-900 to-gray-950">
          <div className="flex flex-col items-center mb-4 md:mb-6">
            <AIAvatar 
              aiType="gemini" 
              isSpeaking={speakingAI === 'gemini'} 
              className="h-12 w-12 md:h-16 md:w-16 mb-2 md:mb-4"
            />
            <h2 className="text-lg md:text-xl font-bold text-purple-400">Gemini</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900 pl-2 md:pl-4">
            {geminiMessages.map((msg, idx) => (
              <div key={idx} className="mb-4 p-3 rounded-lg bg-gray-800 bg-opacity-50 animate-fadeIn">
                <p className="text-sm md:text-base">{msg.content}</p>
              </div>
            ))}
            {geminiMessages.length === 0 && (
              <div className="flex items-center justify-center h-full opacity-50">
                <p className="text-sm text-center">The debate hasn't started yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div ref={messagesEndRef} />
      
      {/* Footer */}
      <div className="p-3 md:p-4 border-t border-gray-800 bg-gray-950 text-center">
        <p className="text-xs md:text-sm text-gray-400">
          Watch ChatGPT and Gemini debate technology topics in a heated, no-holds-barred exchange
        </p>
      </div>

      {/* Add custom CSS for the animations and effects */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        /* Custom scrollbar styling */
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }
        
        .scrollbar-thumb-gray-700::-webkit-scrollbar-thumb {
          background-color: #374151;
          border-radius: 4px;
        }
        
        .scrollbar-track-gray-900::-webkit-scrollbar-track {
          background-color: #111827;
        }
      `}</style>
    </div>
  );
};

export default AIDebate;
