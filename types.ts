
export interface ModeConfig {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  voiceName: string;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioFrequencyData {
  values: Uint8Array;
}

export enum ToolType {
  VISION = 'VISION',
  THINKING = 'THINKING',
  SEARCH = 'SEARCH',
  MAPS = 'MAPS',
  FAST = 'FAST',
  PLANNER = 'PLANNER',
  CHAT = 'CHAT',
}

export interface ToolResult {
  text: string;
  groundingMetadata?: any;
  audioData?: string; // Base64 audio for TTS
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  isPartial: boolean;
  timestamp: number;
}
