
import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import AIAvatar from './AIAvatar';
import { startDebate, continuateDebate, speakText } from '@/services/geminiService';
import { toast } from '@/components/ui/sonner';

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between px-8 py-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">AI Shadow Duel: ChatGPT vs Gemini</h1>
        <div className="flex gap-4">
          {!isDebating ? (
            <Button
              onClick={startNewDebate}
              disabled={isDebating}
              className="bg-gradient-to-r from-chatgpt to-gemini text-white"
            >
              Start Debate
            </Button>
          ) : (
            <Button
              onClick={stopDebate}
              variant="destructive"
            >
              Stop Debate
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ChatGPT Side */}
        <div className="w-1/2 flex flex-col p-6 border-r border-gray-800 chatgpt-shadow">
          <div className="flex flex-col items-center mb-6">
            <AIAvatar 
              aiType="chatgpt" 
              isSpeaking={speakingAI === 'chatgpt'} 
              className="mb-4"
            />
            <h2 className="text-xl font-bold text-chatgpt">ChatGPT</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-4">
            {messages.filter(msg => msg.role === 'chatgpt').map((msg, idx) => (
              <div key={idx} className="mb-4 fade-in">
                <p className="text-sm text-left">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Gemini Side */}
        <div className="w-1/2 flex flex-col p-6 gemini-shadow">
          <div className="flex flex-col items-center mb-6">
            <AIAvatar 
              aiType="gemini" 
              isSpeaking={speakingAI === 'gemini'} 
              className="mb-4"
            />
            <h2 className="text-xl font-bold text-gemini">Gemini</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto pl-4">
            {messages.filter(msg => msg.role === 'gemini').map((msg, idx) => (
              <div key={idx} className="mb-4 fade-in">
                <p className="text-sm text-left">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div ref={messagesEndRef} />
      
      <div className="p-4 border-t border-gray-800 text-center text-sm text-gray-500">
        <p>
          AI Shadow Duel: Watch ChatGPT and Gemini debate technology topics in a heated, no-holds-barred exchange
        </p>
      </div>
    </div>
  );
};

export default AIDebate;
