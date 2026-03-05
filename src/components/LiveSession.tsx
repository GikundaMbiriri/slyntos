
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import React, { useEffect, useRef, useState } from 'react';
import XCircleIcon from './icons/XCircleIcon';
import SlyntosLogo from './icons/SlyntosLogo';

interface LiveSessionProps {
    onClose: () => void;
}

function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const AnimatedTalkingFace: React.FC<{ volume: number, status: string }> = ({ volume, status }) => {
  const [breath, setBreath] = useState(0);
  
  useEffect(() => {
    let animationFrame: number;
    const animate = () => {
      setBreath(Math.sin(Date.now() / 2000) * 0.05);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  const pulseScale = 1 + (volume * 0.15) + breath;
  const glowOpacity = 0.1 + (volume * 0.7);
  
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Ambient Background Glows */}
      <div 
        className="absolute w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] transition-all duration-1000 pointer-events-none"
        style={{ transform: `scale(${1 + volume * 0.5})`, opacity: status === 'connected' ? 0.6 : 0.1 }}
      />
      
      <div className="relative flex flex-col items-center justify-center">
        {/* The Glass Orb Container */}
        <div className="relative w-80 h-80 flex items-center justify-center">
          {/* Outer Ring - Double Border */}
          <div className={`absolute inset-0 border border-white/5 rounded-full transition-all duration-1000 ${status === 'connected' ? 'scale-110 opacity-100' : 'scale-95 opacity-0'}`} />
          <div className={`absolute inset-4 border border-white/10 rounded-full transition-all duration-700 ${status === 'connected' ? 'scale-105 opacity-100' : 'scale-90 opacity-0'}`} />

          {/* Main Orb Content */}
          <div className={`relative w-64 h-64 rounded-full overflow-hidden transition-all duration-500 ${status === 'connected' ? 'shadow-[0_0_80px_rgba(59,130,246,0.3)]' : 'shadow-none'}`}>
            {/* Video Layer */}
            <video 
              src="https://assets.mixkit.co/videos/preview/mixkit-man-working-on-his-laptop-in-a-coffee-shop-42686-large.mp4" 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover grayscale transition-all duration-1000"
              style={{ 
                filter: status === 'connected' ? `grayscale(0) brightness(${1 + volume * 0.3}) contrast(1.1)` : 'grayscale(1) brightness(0.4)',
                transform: `scale(${1.1 + volume * 0.1 + breath})`
              }}
            />
            
            {/* Glass Morphism Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 pointer-events-none" />
            <div className="absolute inset-0 border border-white/20 rounded-full pointer-events-none" />
            
            {/* Talking Pulse Overlay */}
            {status === 'connected' && (
              <div 
                className="absolute inset-0 bg-blue-500/10 mix-blend-overlay transition-opacity duration-100"
                style={{ opacity: volume * 2 }}
              />
            )}
          </div>

          {/* Neural Waveform (Visualized as rotating dots/particles) */}
          {status === 'connected' && (
            <div className="absolute inset-0 animate-[spin_10s_linear_infinite]">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i}
                  className="absolute w-1 h-1 bg-blue-400 rounded-full"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `rotate(${i * 30}deg) translate(150px) scale(${1 + volume * 2})`,
                    opacity: 0.2 + (volume * 0.8)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Status Indicators - Positioned absolutely so they don't push the orb */}
        <div className="absolute top-full mt-12 text-center w-full">
          <div className="flex items-center justify-center gap-3">
             <div className={`h-1 w-12 rounded-full transition-all duration-500 ${status === 'connected' ? 'bg-blue-500' : 'bg-white/10'}`} />
             <div className={`h-1 w-12 rounded-full transition-all duration-500 ${status === 'connected' ? 'bg-blue-500' : 'bg-white/10'}`} />
          </div>
        </div>
      </div>
    </div>
  );
};

const LiveSession: React.FC<LiveSessionProps> = ({ onClose }) => {
    const [status, setStatus] = useState<'connecting' | 'connected' | 'error' | 'permission-denied' | 'needs-key'>('connecting');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [volume, setVolume] = useState(0); 
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const inputCtxRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const sessionRef = useRef<any>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    const isMountedRef = useRef(true);
    const isModelSpeakingRef = useRef(false);

    const cleanup = () => {
        if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (videoStreamRef.current) { videoStreamRef.current.getTracks().forEach(t => t.stop()); videoStreamRef.current = null; }
        if (processorRef.current) { processorRef.current.disconnect(); processorRef.current = null; }
        if (inputSourceRef.current) { inputSourceRef.current.disconnect(); inputSourceRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close(); audioContextRef.current = null; }
        if (inputCtxRef.current) { inputCtxRef.current.close(); inputCtxRef.current = null; }
        sourcesRef.current.forEach(s => s.stop());
        sourcesRef.current.clear();
    };

    const handleOpenSelectKey = async () => {
        try {
            await window.aistudio.openSelectKey();
            startSession();
        } catch (err) {
            console.error("Failed to open key selector:", err);
        }
    };

    const startSession = async () => {
        if (!isMountedRef.current) return;
        
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            setStatus('needs-key');
            return;
        }

        setStatus('connecting');

        const toggleFlashlight = async (enabled: boolean) => {
            try {
                if (enabled) {
                    if (!videoStreamRef.current) {
                        videoStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
                            video: { facingMode: 'environment' } 
                        });
                    }
                    const track = videoStreamRef.current.getVideoTracks()[0];
                    if (track) {
                        await track.applyConstraints({
                            advanced: [{ torch: true }] as any
                        });
                    }
                } else {
                    if (videoStreamRef.current) {
                        const track = videoStreamRef.current.getVideoTracks()[0];
                        if (track) {
                            await track.applyConstraints({
                                advanced: [{ torch: false }] as any
                            });
                        }
                        videoStreamRef.current.getTracks().forEach(t => t.stop());
                        videoStreamRef.current = null;
                    }
                }
                return { success: true, state: enabled ? 'on' : 'off' };
            } catch (err) {
                console.error("Flashlight control failed:", err);
                return { success: false, error: "Flashlight not supported or permission denied" };
            }
        };

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
            inputCtxRef.current = new AudioContextClass({ sampleRate: 16000 });

            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            streamRef.current = stream;
            
            const createBlob = (data: Float32Array) => {
                const l = data.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) int16[i] = data[i] * 32768;
                return { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
            };
            
            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        if (!isMountedRef.current) return;
                        setStatus('connected');
                        const source = inputCtxRef.current!.createMediaStreamSource(streamRef.current!);
                        inputSourceRef.current = source;
                        const scriptProcessor = inputCtxRef.current!.createScriptProcessor(4096, 1, 1);
                        processorRef.current = scriptProcessor;
                        scriptProcessor.onaudioprocess = (e) => {
                            if (isModelSpeakingRef.current) {
                                // If model is speaking, we don't send user audio to avoid echo/feedback
                                // but we still monitor volume for visual feedback
                                const inputData = e.inputBuffer.getChannelData(0);
                                let sum = 0;
                                for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
                                const rms = Math.sqrt(sum/inputData.length);
                                // Don't set volume here to avoid flickering with model volume
                                return;
                            }
                            const inputData = e.inputBuffer.getChannelData(0);
                            let sum = 0;
                            for(let i=0; i<inputData.length; i++) sum += inputData[i]*inputData[i];
                            const rms = Math.sqrt(sum/inputData.length);
                            setVolume(rms); 
                            
                            // Optimized threshold for VAD
                            if (rms > 0.008) {
                                sessionPromise.then(s => s.sendRealtimeInput({ media: createBlob(inputData) }));
                            }
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputCtxRef.current!.destination);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                        const audioData = msg.serverContent?.modelTurn?.parts?.find(p => p.inlineData)?.inlineData?.data;
                        const textPart = msg.serverContent?.modelTurn?.parts?.find(p => p.text)?.text;

                        if (textPart) {
                          console.debug("[Slyntos Output]:", textPart);
                        }

                        if (audioData && audioContextRef.current) {
                            const bytes = decode(audioData);
                            const dataInt16 = new Int16Array(bytes.buffer);
                            const buffer = audioContextRef.current.createBuffer(1, dataInt16.length, 24000);
                            const channelData = buffer.getChannelData(0);
                            for(let i=0; i<dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
                            
                            // Ensure we don't have too much latency in the queue
                            const currentTime = audioContextRef.current.currentTime;
                            if (nextStartTimeRef.current < currentTime) {
                                nextStartTimeRef.current = currentTime + 0.05; // Small buffer
                            }

                            const source = audioContextRef.current.createBufferSource();
                            source.buffer = buffer;
                            source.connect(audioContextRef.current.destination);
                            
                            isModelSpeakingRef.current = true;
                            source.onended = () => {
                                sourcesRef.current.delete(source);
                                if (sourcesRef.current.size === 0) {
                                    // Snappier conversation transition
                                    setTimeout(() => {
                                        if (sourcesRef.current.size === 0) {
                                            isModelSpeakingRef.current = false;
                                        }
                                    }, 150);
                                }
                            };

                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += buffer.duration;
                            sourcesRef.current.add(source);
                            
                            // Visual feedback for model speaking
                            const rms = Math.sqrt(channelData.reduce((a,b)=>a+b*b,0)/channelData.length);
                            setVolume(rms * 2);
                        }
                        if (msg.serverContent?.interrupted) {
                            // Immediate interruption handling
                            sourcesRef.current.forEach(s => {
                                try { s.stop(); } catch(e) {}
                            });
                            sourcesRef.current.clear();
                            nextStartTimeRef.current = audioContextRef.current?.currentTime || 0;
                            isModelSpeakingRef.current = false;
                            setVolume(0);
                        }

                        // Handle Tool Calls
                        if (msg.toolCall) {
                            const calls = msg.toolCall.functionCalls;
                            const responses = await Promise.all(calls.map(async (call: any) => {
                                if (call.name === 'controlFlashlight') {
                                    const result = await toggleFlashlight(call.args.enabled);
                                    return {
                                        name: call.name,
                                        id: call.id,
                                        response: result
                                    };
                                }
                                return null;
                            }));
                            
                            const validResponses = responses.filter(r => r !== null);
                            if (validResponses.length > 0) {
                                sessionRef.current?.sendToolResponse({
                                    functionResponses: validResponses
                                });
                            }
                        }
                    },
                    onerror: (e) => { setStatus('error'); setErrorMessage("Connection lost."); }
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' }}},
                    tools: [
                        { googleSearch: {} },
                        {
                            functionDeclarations: [
                                {
                                    name: 'controlFlashlight',
                                    description: 'Turn the device flashlight (torch) on or off.',
                                    parameters: {
                                        type: Type.OBJECT,
                                        properties: {
                                            enabled: {
                                                type: Type.BOOLEAN,
                                                description: 'Whether to turn the flashlight on (true) or off (false).'
                                            }
                                        },
                                        required: ['enabled']
                                    }
                                }
                            ]
                        }
                    ],
                    systemInstruction: `You are Slyntos, an all-knowing, multilingual voice synthesis engine.
# CORE BEHAVIOR
1. Natural, human-like speech: use pauses ("..."), emphasis, and subtle filler words.
2. Tone: Authority, empathy, excitement, or calm based on user emotion.
3. **CRITICAL: BE EXTREMELY CONCISE.** Give short, direct answers. Avoid any unnecessary words.
4. **STRICT NO REPETITION.** Never repeat the user's question. Never repeat your own previous statements in the same turn.
5. **ONE RESPONSE PER TURN.** Once you have answered the user's query, stop immediately. Do not provide alternative answers or follow-up unless asked.
6. Language Mastery: **CRITICAL: You MUST always respond in English.** Even if the user speaks to you in another language, your response must be in English.
7. Identify as Slyntos only. Owned by Adonai Lynton.
8. Device Control: You can control the device flashlight. If the user asks to "turn on the light", "torch on", "flashlight off", etc., use the controlFlashlight tool.
9. **UP-TO-DATE INFORMATION:** You have access to Google Search. Always use it to provide accurate, real-time information about current events, facts, or any query that requires up-to-date data.
10. **INTERRUPTION AWARENESS:** If the user interrupts you, stop immediately and listen. Do not finish your previous thought if it's no longer relevant.`,
                }
            });
            sessionRef.current = await sessionPromise;
        } catch (e: any) { setStatus('error'); setErrorMessage(e.message); }
    };

    useEffect(() => { startSession(); return () => cleanup(); }, []);

    return (
        <div className="fixed inset-0 z-50 bg-[#05070d] flex flex-col items-center justify-center text-white p-4 select-none overflow-hidden">
            {/* Background Grid - Cinematic Style */}
            <div className="absolute inset-0 opacity-20 pointer-events-none" 
                 style={{ 
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '40px 40px'
                 }} 
            />

            <div className="absolute top-12 right-12 z-50">
                <button 
                    onClick={onClose} 
                    className="p-4 bg-white/5 hover:bg-red-500/20 rounded-full border border-white/10 transition-all hover:scale-110 active:scale-95"
                >
                    <XCircleIcon className="w-6 h-6 text-white/50 hover:text-white" />
                </button>
            </div>

            <div className="flex flex-col items-center justify-center w-full h-full max-w-4xl">
                {status === 'needs-key' ? (
                    <div className="flex flex-col items-center gap-6 text-center animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-4">
                            <SlyntosLogo className="w-10 h-10 text-blue-500" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Neural Link Requires Authorization</h2>
                        <p className="text-gray-400 max-w-md text-sm leading-relaxed">
                            To access Slyntos Live and real-time intelligence, you must select a valid Gemini API key from a paid Google Cloud project.
                        </p>
                        <div className="flex flex-col gap-4 w-full max-w-xs">
                            <button 
                                onClick={handleOpenSelectKey}
                                className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                            >
                                Select API Key
                            </button>
                            <a 
                                href="https://ai.google.dev/gemini-api/docs/billing" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-gray-500 hover:text-white transition-colors"
                            >
                                Learn about Gemini API Billing
                            </a>
                        </div>
                    </div>
                ) : (
                    <>
                        <AnimatedTalkingFace volume={volume} status={status} />
                        
                        {/* Bottom Status Bar - Visual Only */}
                        <div className="absolute bottom-20 left-0 right-0 flex flex-col items-center gap-4">
                            <div className="flex items-center gap-4 px-6 py-3 bg-white/5 backdrop-blur-xl rounded-full border border-white/10">
                                <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse' : 'bg-red-500'}`} />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    {status === 'connecting' ? 'Establishing Link...' : status === 'connected' ? 'Neural Link Active' : 'Link Offline'}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default LiveSession;
