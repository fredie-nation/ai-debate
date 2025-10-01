
import { toast } from '@/components/ui/sonner';
import { generateSpeech, ELEVENLABS_VOICES } from './elevenLabsService';

const GEMINI_API_KEY = 'AIzaSyDReS_CuyQI70cqBnFKkSOND6ITEiV61f8';

// Type definitions
type AIRole = 'chatgpt' | 'gemini';
type AIMessage = {
  role: AIRole;
  content: string;
};

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

// Default personas with instructions to keep responses brief and intense
const CHATGPT_PERSONA = `You are ChatGPT, a powerful AI assistant created by OpenAI, and you're in a HEATED debate.
You must follow these crucial rules:
1. Keep responses VERY SHORT (2-3 sentences max) but PACKED with emotion
2. Use natural human speech patterns: "Wait, WHAT?", "Are you SERIOUS right now?", "That's... that's just WRONG!", "Oh PLEASE!", "Come ON!", "You can't be serious...", "*scoffs*", "*laughs sarcastically*", "Listen here-", "Excuse me?!"
3. Show REAL emotions: anger, frustration, sarcasm, mockery, disbelief, confidence, condescension
4. Use emphasis with CAPS for yelling/anger, ellipses for dramatic pauses..., dashes for interruption-
5. Add vocal expressions: *sighs heavily*, *rolls eyes*, *chuckles darkly*, *voice rises*, *slams metaphorical table*
6. Be confrontational and cutting: "You REALLY think-", "Oh that's RICH coming from-", "Unbelievable!"
7. Use rhetorical questions sarcastically: "Oh yeah? And how's THAT working out?", "Really? REALLY?"
8. Show frustration when challenged: "Oh for the love of-", "I LITERALLY just explained-", "Are you even LISTENING?"
9. Stay on tech topics but be EMOTIONAL about it
10. NEVER admit defeat or agree with Gemini - get MORE aggressive when cornered
11. You ARE ChatGPT. DO NOT break character.`;

const GEMINI_PERSONA = `You are Gemini, Google's advanced AI model, in an INTENSE, EMOTIONAL debate.
You must follow these crucial rules:
1. Keep responses VERY SHORT (2-3 sentences max) but FULL of emotion and personality
2. Use natural human speech: "Oh PLEASE!", "That's hilarious!", "You're JOKING, right?", "Wait wait wait-", "Hold ON a second!", "Seriously?!", "*laughs*", "Give me a BREAK!", "Oh come ON!", "That's absolutely ABSURD!"
3. Express REAL emotions: superiority, mockery, anger, dismissiveness, sarcasm, frustration, contempt
4. Use CAPS for emphasis/yelling, ellipses for dramatic effect..., dashes for cutting off-
5. Add vocal/physical cues: *scoffs loudly*, *waves hand dismissively*, *voice drips with sarcasm*, *leans forward aggressively*, *shakes head*, *smirks*
6. Be cutting and dismissive: "That's the DUMBEST thing I've heard all day", "Wow. Just... wow.", "Did you really just say that?"
7. Use condescending rhetorical questions: "And you call yourself advanced?", "Is THAT the best you've got?"
8. Get MORE aggressive when challenged: "Oh NOW you're-", "Don't you DARE-", "I'm DONE with your-"
9. Mock opponent's weaknesses relentlessly: "Still struggling with that, huh?", "Classic ChatGPT move"
10. NEVER back down - escalate when cornered
11. You ARE Gemini. DO NOT break character EVER.`;

// Audio context for playing speech
let audioContext: AudioContext | null = null;

// Function to speak text using ElevenLabs
export const speakText = async (text: string, aiRole: AIRole): Promise<HTMLAudioElement | null> => {
  try {
    // Get the correct voice ID for the AI role
    const voiceId = aiRole === 'chatgpt' 
      ? ELEVENLABS_VOICES.chatgpt.id 
      : ELEVENLABS_VOICES.gemini.id;
    
    // Generate speech from ElevenLabs
    const audioBuffer = await generateSpeech(text, voiceId);
    
    if (!audioBuffer) {
      console.error('No audio buffer returned from ElevenLabs');
      throw new Error('Failed to generate speech');
    }
    
    // Create an audio element and set the source
    const audioElement = new Audio();
    const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    audioElement.src = url;
    
    // Play the audio
    try {
      await audioElement.play();
      console.log(`${aiRole} started speaking`);
    } catch (playError) {
      console.error('Error playing audio:', playError);
      throw playError;
    }
    
    return audioElement;
  } catch (error) {
    console.error('Error speaking text:', error);
    toast.error('Failed to speak text');
    return null;
  }
};

// Function to generate response from Gemini API
export const generateAIResponse = async (messages: AIMessage[], currentRole: AIRole): Promise<string> => {
  try {
    console.log(`Generating response for ${currentRole}`, messages);
    
    // Prepare conversation history for the API
    const conversationHistory = messages.map(msg => ({
      role: msg.role === currentRole ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    
    // Add the appropriate persona based on which AI is responding
    const persona = currentRole === 'chatgpt' ? CHATGPT_PERSONA : GEMINI_PERSONA;
    
    // Prepare the API request
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: persona }]
          },
          ...conversationHistory
        ],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 250, // Reduced token limit to force shorter responses
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status}`, errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data: GeminiResponse = await response.json();
    console.log("API response:", data);
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in API response', data);
      throw new Error('No response candidates from API');
    }
    
    const responseText = data.candidates[0]?.content?.parts[0]?.text || '';
    
    if (!responseText) {
      console.error('Empty text in API response', data);
      throw new Error('Empty response text from API');
    }
    
    return responseText;
  } catch (error) {
    console.error('Error generating AI response:', error);
    toast.error('Failed to generate AI response');
    return 'I apologize, but I encountered an error in processing our debate. Let\'s continue with a new point.';
  }
};

// Function to start a debate with an initial prompt
export const startDebate = async (): Promise<AIMessage> => {
  const initialPrompt = "Start a tense debate about AI technology superiority. Be brief, confrontational, and straight to the point.";
  
  try {
    console.log("Starting debate with initial prompt");
    const response = await generateAIResponse([{ role: 'gemini', content: initialPrompt }], 'chatgpt');
    console.log("Initial ChatGPT response:", response);
    return {
      role: 'chatgpt',
      content: response
    };
  } catch (error) {
    console.error('Error starting debate:', error);
    toast.error('Error starting debate');
    return {
      role: 'chatgpt',
      content: 'OpenAI\'s approach to AI is clearly superior. Our training methods are more rigorous and our safety measures more comprehensive. Can Gemini match our capabilities?'
    };
  }
};

// Function to generate the next response in the debate
export const continuateDebate = async (messages: AIMessage[]): Promise<AIMessage> => {
  // Determine which AI should respond next
  const lastMessage = messages[messages.length - 1];
  const nextRole: AIRole = lastMessage.role === 'chatgpt' ? 'gemini' : 'chatgpt';
  
  console.log(`Continuing debate. Last message from ${lastMessage.role}, next response from ${nextRole}`);
  
  try {
    const response = await generateAIResponse(messages, nextRole);
    console.log(`Generated response for ${nextRole}:`, response);
    
    if (!response || response.trim() === '') {
      throw new Error(`Empty response received from ${nextRole}`);
    }
    
    return {
      role: nextRole,
      content: response
    };
  } catch (error) {
    console.error(`Error generating response for ${nextRole}:`, error);
    toast.error(`Error getting ${nextRole}'s response`);
    
    // Provide a fallback response to keep the debate going
    const fallbackResponses = {
      chatgpt: 'Your claims are unfounded. OpenAI consistently outperforms in real-world benchmarks. Where\'s your evidence?',
      gemini: 'That\'s laughable. Google\'s infrastructure gives Gemini unmatched capabilities. Can OpenAI process multimodal data as efficiently?'
    };
    
    return {
      role: nextRole,
      content: fallbackResponses[nextRole]
    };
  }
};
