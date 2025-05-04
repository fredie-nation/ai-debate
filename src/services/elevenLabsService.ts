
import { toast } from '@/components/ui/sonner';

const ELEVENLABS_API_KEY = 'sk_69945b3dca0a41f83a6a02b6d9627f32672ca6573ecde61b';

type VoiceSettings = {
  stability: number;
  similarity_boost: number;
};

// Function to generate speech using ElevenLabs API
export const generateSpeech = async (
  text: string, 
  voiceId: string
): Promise<ArrayBuffer | null> => {
  try {
    const voiceSettings: VoiceSettings = {
      stability: 0.5,
      similarity_boost: 0.75
    };

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          voice_settings: voiceSettings,
          model_id: 'eleven_multilingual_v2',
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Error generating speech:', error);
    toast.error('Failed to generate speech');
    return null;
  }
};

// ElevenLabs Female Voices
export const ELEVENLABS_VOICES = {
  chatgpt: {
    id: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    name: 'Sarah'
  },
  gemini: {
    id: 'XB0fDUnXU5powFXDhCwa', // Charlotte
    name: 'Charlotte'
  }
};
