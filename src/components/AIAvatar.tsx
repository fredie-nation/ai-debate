
import React from 'react';
import { cn } from "@/lib/utils";
import AudioVisualizer from './AudioVisualizer';

interface AIAvatarProps {
  aiType: 'chatgpt' | 'gemini';
  isSpeaking: boolean;
  className?: string;
}

const AIAvatar: React.FC<AIAvatarProps> = ({ aiType, isSpeaking, className }) => {
  const isGemini = aiType === 'gemini';
  
  return (
    <div 
      className={cn(
        "relative rounded-full overflow-hidden w-32 h-32 flex items-center justify-center ai-avatar",
        isGemini ? "gemini-shadow" : "chatgpt-shadow",
        isSpeaking && "speaking",
        className
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        {isGemini ? (
          <svg viewBox="0 0 24 24" width="60%" height="60%" fill="#8e44ef">
            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10zM4 12c0-4.42 3.58-8 8-8s8 3.58 8 8-3.58 8-8 8-8-3.58-8-8zm12.71-3.29c-.39-.39-1.02-.39-1.41 0L12 11.01l-3.29-3.29c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41L10.59 12l-3.29 3.29c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l3.29 3.29c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l3.29-3.29c.39-.38.39-1.01.01-1.4z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="60%" height="60%" fill="#10a37f">
            <path d="M21 12c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9 9-4.03 9-9zm-9 7c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7z"/>
            <path d="M12 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 3.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-4-3.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 3.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm8-3.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0 3.5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
          </svg>
        )}
      </div>
      <div className="absolute -bottom-2 w-full flex justify-center">
        <AudioVisualizer 
          isActive={isSpeaking} 
          color={isGemini ? "#8e44ef" : "#10a37f"} 
        />
      </div>
    </div>
  );
};

export default AIAvatar;
