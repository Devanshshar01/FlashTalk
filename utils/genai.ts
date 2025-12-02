
import { GoogleGenAI, Modality } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 1. Audio Transcription (gemini-2.5-flash)
export async function transcribeAudio(audioBase64: string): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
          { text: "Transcribe this audio exactly as spoken." }
        ]
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

// 2. Text to Speech (gemini-2.5-flash-preview-tts)
export async function generateSpeech(text: string): Promise<string | undefined> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: { parts: [{ text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS error:", error);
    // Return undefined to handle gracefully in UI
    return undefined;
  }
}

// 3. Vision Analysis (gemini-3-pro-preview)
export async function analyzeImage(file: File, prompt: string): Promise<string> {
  const imagePart = await fileToGenerativePart(file);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [imagePart, { text: prompt }]
    }
  });
  return response.text || "No analysis generated.";
}

// 4. Thinking Mode (gemini-3-pro-preview with budget)
export async function runDeepThinking(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      thinkingConfig: { thinkingBudget: 32768 } // Max for 3-pro
    }
  });
  return response.text || "No thoughts generated.";
}

// 5. Google Search Grounding (gemini-2.5-flash)
export async function runSearchQuery(prompt: string): Promise<{ text: string; chunks: any[] }> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return {
    text: response.text || "",
    chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

// 6. Google Maps Grounding (gemini-2.5-flash)
export async function runMapsQuery(prompt: string, location?: GeolocationCoordinates): Promise<{ text: string; chunks: any[] }> {
  const config: any = {
    tools: [{ googleMaps: {} }]
  };

  if (location) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: {
          latitude: location.latitude,
          longitude: location.longitude
        }
      }
    };
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config
  });
  
  return {
    text: response.text || "",
    chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}

// 7. Fast Response (gemini-flash-lite-latest)
export async function runFastQuery(prompt: string): Promise<string> {
  // Correct alias for Flash Lite
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest', 
    contents: prompt
  });
  return response.text || "";
}

// 8. Study Planner (gemini-2.5-flash)
export async function runPlannerQuery(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Create a structured study timetable/plan for: "${prompt}". 
    
    Requirements:
    1. Start with a brief, motivating summary (1-2 sentences).
    2. Follow immediately with a Markdown Table.
    3. The table columns must be: | Day | Time | Subject | Topic | Status |.
    4. For 'Status', use empty checkboxes like "[ ]".
    5. Be realistic and detailed.
    6. Do not wrap the table in a code block (like \`\`\`), just raw markdown.`,
  });
  return response.text || "";
}

// 9. Chatbot (gemini-3-pro-preview)
export async function runChatQuery(prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
  });
  return response.text || "";
}
