import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState, ModeConfig, TranscriptMessage } from '../types';
import { createPcmBlob, decodeBase64, decodeAudioData, PCM_SAMPLE_RATE, OUTPUT_SAMPLE_RATE } from '../utils/audio';

export const useLiveGemini = (activeMode: ModeConfig, voiceName: string) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputNodeRef = useRef<GainNode | null>(null);
  
  // Audio Processing Nodes (New)
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  
  // Analyzers for Visualizer
  const inputAnalyzerRef = useRef<AnalyserNode | null>(null);
  const outputAnalyzerRef = useRef<AnalyserNode | null>(null);
  
  // Playback State
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  // API Session
  const sessionRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Transcription State
  const currentInputTransRef = useRef<string>("");
  const currentOutputTransRef = useRef<string>("");

  const cleanup = useCallback(() => {
    // Stop all active sources
    activeSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) { /* ignore */ }
    });
    activeSourcesRef.current.clear();

    // Close microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close AudioContexts
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    // Reset State
    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume(0);
    sessionRef.current = null;
    currentInputTransRef.current = "";
    currentOutputTransRef.current = "";
    nextStartTimeRef.current = 0;
  }, []);

  const connect = useCallback(async () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      setError("API Key is missing. Please check your environment configuration.");
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      setError(null);

      const ai = new GoogleGenAI({ apiKey });
      
      // Initialize Audio Contexts with Interactive Latency
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        inputAudioContextRef.current = new AudioContextClass({ 
          sampleRate: PCM_SAMPLE_RATE,
          latencyHint: 'interactive' 
        });
        outputAudioContextRef.current = new AudioContextClass({ 
          sampleRate: OUTPUT_SAMPLE_RATE,
          latencyHint: 'interactive' 
        });
      } catch (e) {
        throw new Error("Could not initialize AudioContext. Your browser may not support it.");
      }
      
      // Setup Output Pipeline with Compressor for "Crisp" Audio
      if (outputAudioContextRef.current) {
        const ctx = outputAudioContextRef.current;
        
        // 1. Create Gain Node (Master Volume)
        outputNodeRef.current = ctx.createGain();
        
        // 2. Create Compressor (Broadcast Quality)
        compressorRef.current = ctx.createDynamicsCompressor();
        compressorRef.current.threshold.value = -24; // Lower threshold to catch more signal
        compressorRef.current.knee.value = 30;       // Smooth compression
        compressorRef.current.ratio.value = 12;      // High ratio for consistent levels
        compressorRef.current.attack.value = 0.003;  // Fast attack
        compressorRef.current.release.value = 0.25;  // Moderate release
        
        // 3. Create Analyzer
        outputAnalyzerRef.current = ctx.createAnalyser();
        outputAnalyzerRef.current.fftSize = 256;
        outputAnalyzerRef.current.smoothingTimeConstant = 0.5;

        // 4. Connect Chain: Source -> Gain -> Compressor -> Analyzer -> Destination
        outputNodeRef.current.connect(compressorRef.current);
        compressorRef.current.connect(outputAnalyzerRef.current);
        outputAnalyzerRef.current.connect(ctx.destination);

        // Input Analyzer Setup
        if (inputAudioContextRef.current) {
            inputAnalyzerRef.current = inputAudioContextRef.current.createAnalyser();
            inputAnalyzerRef.current.fftSize = 64; 
            inputAnalyzerRef.current.smoothingTimeConstant = 0.3;
        }
      }

      // Get Microphone Access with Aggressive Noise Suppression
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: PCM_SAMPLE_RATE,
          } 
        });
        streamRef.current = stream;
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          throw new Error("Microphone access denied. Please allow permissions in your browser settings.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          throw new Error("No microphone found. Please check your input devices.");
        } else {
          throw new Error("Could not access microphone: " + err.message);
        }
      }

      // Initialize Gemini Live Session
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          },
          systemInstruction: { parts: [{ text: activeMode.systemInstruction }] },
          inputAudioTranscription: {}, 
          outputAudioTranscription: {}, 
        },
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            setConnectionState(ConnectionState.CONNECTED);
            
            if (!inputAudioContextRef.current || !streamRef.current || !inputAnalyzerRef.current) return;

            if (inputAudioContextRef.current.state === 'suspended') {
              inputAudioContextRef.current.resume();
            }

            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            inputSourceRef.current = source;
            source.connect(inputAnalyzerRef.current);

            // Optimized buffer size for lower latency (512 is approx 32ms)
            const processor = inputAudioContextRef.current.createScriptProcessor(512, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              if (sessionRef.current) {
                sessionRef.current.then(session => {
                  try {
                    session.sendRealtimeInput({ media: pcmBlob });
                  } catch (e) {
                    // Ignore send errors during shutdown
                  }
                });
              }
            };

            inputAnalyzerRef.current.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.interrupted) {
              activeSourcesRef.current.forEach(src => {
                try { src.stop(); } catch(e){}
              });
              activeSourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              currentOutputTransRef.current = ""; 
              return;
            }

            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current && outputNodeRef.current) {
               const ctx = outputAudioContextRef.current;
               if (ctx.state === 'suspended') await ctx.resume();

               const audioData = decodeBase64(base64Audio);
               const audioBuffer = await decodeAudioData(audioData, ctx, OUTPUT_SAMPLE_RATE);
               
               const source = ctx.createBufferSource();
               source.buffer = audioBuffer;
               source.connect(outputNodeRef.current);
               
               const currentTime = ctx.currentTime;
               // Catch up if we fell behind to avoid latency drift
               if (nextStartTimeRef.current < currentTime) {
                 nextStartTimeRef.current = currentTime;
               }
               
               source.start(nextStartTimeRef.current);
               nextStartTimeRef.current += audioBuffer.duration;
               
               activeSourcesRef.current.add(source);
               source.onended = () => {
                 activeSourcesRef.current.delete(source);
               };
            }

            // Transcription Handling
            const inputTrans = message.serverContent?.inputTranscription;
            if (inputTrans) {
              currentInputTransRef.current += inputTrans.text || "";
            }

            const outputTrans = message.serverContent?.outputTranscription;
            if (outputTrans) {
              // OPTIMIZATION: If the model starts speaking, assume user turn is done.
              // Flush user text to transcript immediately so it appears BEFORE the assistant response.
              if (currentInputTransRef.current.trim()) {
                const userText = currentInputTransRef.current;
                setTranscript(prev => [
                    ...prev, 
                    { id: Date.now().toString(), role: 'user', text: userText, isPartial: false, timestamp: Date.now() }
                ]);
                currentInputTransRef.current = "";
              }

              currentOutputTransRef.current += outputTrans.text || "";
              setTranscript(prev => {
                 const last = prev[prev.length - 1];
                 if (last && last.role === 'assistant' && last.isPartial) {
                   return [...prev.slice(0, -1), { ...last, text: currentOutputTransRef.current }];
                 } else {
                   return [...prev, {
                       id: Date.now().toString(),
                       role: 'assistant',
                       text: currentOutputTransRef.current,
                       isPartial: true,
                       timestamp: Date.now()
                   }];
                 }
              });
            }

            if (message.serverContent?.turnComplete) {
               // Only add user message if it wasn't already flushed
               if (currentInputTransRef.current.trim()) {
                 const userText = currentInputTransRef.current;
                 setTranscript(prev => [
                     ...prev, 
                     { id: Date.now().toString(), role: 'user', text: userText, isPartial: false, timestamp: Date.now() }
                 ]);
                 currentInputTransRef.current = "";
               }
               if (currentOutputTransRef.current) {
                 setTranscript(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'assistant') {
                      return [...prev.slice(0, -1), { ...last, isPartial: false }];
                    }
                    return prev;
                 });
                 currentOutputTransRef.current = "";
               }
            }
          },
          onclose: () => {
            console.log('Session Closed');
            cleanup();
          },
          onerror: (err) => {
            console.error('Session Error', err);
            if (err.message && !err.message.includes("cancelled")) {
                 setError("Connection to Gemini failed. Please try again.");
            }
            cleanup();
          }
        }
      });
      
      sessionRef.current = sessionPromise;
      await sessionPromise;

    } catch (err: any) {
      console.error(err);
      let msg = err.message || "Failed to initialize audio or connection.";
      setError(msg);
      setConnectionState(ConnectionState.ERROR);
      cleanup();
    }
  }, [activeMode, voiceName, cleanup]);

  const disconnect = useCallback(() => {
    if (sessionRef.current) {
        sessionRef.current.then((session: any) => {
           if(session && typeof session.close === 'function') {
             try { session.close(); } catch(e) { }
           }
        }).catch(()=> {})
          .finally(() => {
            cleanup();
          });
    } else {
      cleanup();
    }
  }, [cleanup]);

  useEffect(() => {
    let animationFrameId: number;
    const updateVisualizer = () => {
      if (connectionState === ConnectionState.CONNECTED) {
        let inputVol = 0;
        let outputVol = 0;
        if (inputAnalyzerRef.current) {
          const dataArray = new Uint8Array(inputAnalyzerRef.current.frequencyBinCount);
          inputAnalyzerRef.current.getByteFrequencyData(dataArray);
          inputVol = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        }
        if (outputAnalyzerRef.current) {
          const dataArray = new Uint8Array(outputAnalyzerRef.current.frequencyBinCount);
          outputAnalyzerRef.current.getByteFrequencyData(dataArray);
          outputVol = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        }
        setVolume(Math.max(inputVol, outputVol)); 
      } else {
        setVolume(0);
      }
      animationFrameId = requestAnimationFrame(updateVisualizer);
    };
    updateVisualizer();
    return () => cancelAnimationFrame(animationFrameId);
  }, [connectionState]);

  return { connect, disconnect, connectionState, volume, error, transcript };
};