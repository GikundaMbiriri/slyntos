
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Send, Mic, Square, User as UserIcon } from 'lucide-react';
import { generateContentStream } from '@/services/geminiService';
import type { Message, FileData, Page, User, ChatSession, Source, GenConfig } from '@/types';
import MessageComponent from '@/components/Message';
import Loader from '@/components/Loader';
import SlyntosLogo from '@/components/icons/SlyntosLogo';
import { Page as PageEnum } from '@/types';
import LiveSession from '@/components/LiveSession';
import { PLAN_LIMITS } from '@/constants';

interface ChatInterfaceProps {
  session: ChatSession;
  onSessionUpdate: (session: ChatSession) => void;
  systemInstruction: string;
  placeholderText: string;
  currentUser: User;
  page: Page;
  children?: React.ReactNode;
  onLoadingStateChange?: (isLoading: boolean) => void;
  onUsageIncrement?: (page: Page) => void;
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (val: boolean) => void;
  advancedConfig?: GenConfig;
  setAdvancedConfig?: (val: GenConfig) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
    session, onSessionUpdate, systemInstruction, placeholderText, 
    currentUser, page, children, onLoadingStateChange, onUsageIncrement,
    advancedConfig
}) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<FileData[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [isLiteMode, setIsLiteMode] = useState(true); 
  const [isLiveSessionOpen, setIsLiveSessionOpen] = useState(false);
  const [aspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [videoDuration] = useState<number>(6);
  const [academicTone] = useState<'Analytical' | 'Critical' | 'Reflective'>('Analytical');
  
  const [localAdvConfig] = useState<GenConfig>(advancedConfig || session.sessionConfig || {
    temperature: 0.7,
    topP: 0.95,
    topK: 40,
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64Data = (reader.result as string).split(',')[1];
          setFiles(prev => [...prev, {
            name: `voice_note_${Date.now()}.webm`,
            type: 'audio/webm',
            data: base64Data,
            size: audioBlob.size
          }]);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording failed", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    onLoadingStateChange?.(isLoading);
  }, [isLoading, onLoadingStateChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [session.messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = useCallback(async (customInput?: string, overrideInstruction?: string) => {
    const finalInput = customInput || input;
    if (isLoading || (!finalInput.trim() && files.length === 0)) return;

    const globalUsage = currentUser.usageCounts.global || 0;
    const eduUsage = currentUser.usageCounts[PageEnum.Edu] || 0;
    const imageUsage = currentUser.usageCounts.images || 0;
    
    const limits = PLAN_LIMITS[currentUser.plan as keyof typeof PLAN_LIMITS];

    // Check Global Message Limit
    if (globalUsage >= limits.messages) {
        onSessionUpdate({ 
          ...session, 
          messages: [...session.messages, { 
            role: 'model', 
            content: `⚠️ **Daily Limit Reached (${limits.messages}/${limits.messages})**\nYou have used all your requests for today. Please upgrade to get more.` 
          }] 
        });
        return;
    }

    // Check Edu Limit
    if (page === PageEnum.Edu && eduUsage >= limits.edu) {
      onSessionUpdate({ 
        ...session, 
        messages: [...session.messages, { 
          role: 'model', 
          content: `⚠️ **Slyntos Edu Limit Reached**\nFree users are limited to ${limits.edu} Edu session per day. Upgrade to Pro for unlimited learning.` 
        }] 
      });
      return;
    }

    // Check Image Limit (Pre-emptive check based on prompt)
    const imageKeywords = ['generate', 'create', 'make', 'draw', 'image', 'photo', 'picture'];
    const isImageRequest = imageKeywords.some(kw => finalInput.toLowerCase().includes(kw)) && 
                          (finalInput.toLowerCase().includes('image') || finalInput.toLowerCase().includes('photo'));
    
    if (isImageRequest && imageUsage >= limits.images) {
      onSessionUpdate({ 
        ...session, 
        messages: [...session.messages, { 
          role: 'model', 
          content: `⚠️ **Image Synthesis Limit Reached**\nYou have used your ${limits.images} daily image generations. Upgrade to Pro for unlimited creativity.` 
        }] 
      });
      return;
    }
    
    const userMessage: Message = { role: 'user', content: finalInput, files: [...files] };
    const messagesWithUser: Message[] = [...session.messages, userMessage];
    const newTitle = session.messages.length === 0 ? finalInput.trim().split(' ').slice(0, 5).join(' ') : session.title;
    
    onSessionUpdate({ ...session, messages: [...messagesWithUser, { role: 'model', content: '' }], title: newTitle });

    if (!customInput) setInput('');
    setFiles([]);
    setIsLoading(true);

    try {
        let fullResponse = '';
        let allSources: Source[] = [];
        let allImages: string[] = [];
        let finalVideoUrl: string | undefined = undefined;
        let finalVideoScript: any | undefined = undefined;
        
        const finalInstruction = overrideInstruction || (page === PageEnum.Edu 
            ? systemInstruction.replace('{academic_tone}', academicTone) 
            : systemInstruction);

        const stream = generateContentStream(
            messagesWithUser, 
            finalInstruction, 
            page, 
            { 
              useThinking: isThinkingMode, 
              useLite: isLiteMode, 
              aspectRatio, 
              videoDuration,
              advancedConfig: localAdvConfig,
              currentUser: currentUser
            }
        );
        
        for await (const chunk of stream) {
            if (chunk.text) fullResponse += chunk.text;
            if (chunk.sources) allSources = [...allSources, ...chunk.sources];
            if (chunk.images) {
              allImages = [...allImages, ...chunk.images];
              onUsageIncrement?.('images' as any); // Special case for images
            }
            if (chunk.videoUrl) finalVideoUrl = chunk.videoUrl;
            if (chunk.videoScript) finalVideoScript = chunk.videoScript;
            
            onSessionUpdate({ 
              ...session, 
              messages: [...messagesWithUser, { 
                role: 'model', 
                content: fullResponse, 
                sources: allSources, 
                images: allImages.length > 0 ? allImages : undefined, 
                videoUrl: finalVideoUrl,
                videoScript: finalVideoScript
              }], 
              title: newTitle 
            });
        }
        
        onUsageIncrement?.(page);
    } catch (error) {
         console.error("Slyntos Interface Error:", error);
         onSessionUpdate({ 
           ...session, 
           messages: [...messagesWithUser, { 
             role: 'model', 
             content: `⚠️ **Slyntos Neural Link Interrupted**\nSlyntos has experienced a connection error. Please try again.` 
           }], 
           title: newTitle 
         });
    } finally { setIsLoading(false); }
  }, [isLoading, input, files, session, onSessionUpdate, systemInstruction, page, isThinkingMode, isLiteMode, academicTone, currentUser, onUsageIncrement, aspectRatio, videoDuration, localAdvConfig]);

  return (
    <div className="relative flex flex-col h-full bg-transparent overflow-hidden w-full text-white">
      {children}
      {isLiveSessionOpen && <LiveSession onClose={() => setIsLiveSessionOpen(false)} />}
      
      <div className="flex-1 flex flex-col min-w-0 h-full relative w-full">
          <div className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth scrollbar-hide w-full" id="message-list">
            {session.messages.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-full text-center py-4 opacity-10">
                  <SlyntosLogo className="w-24 h-24 mb-6 grayscale" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.8em] text-white italic">Neural Link Ready</h2>
               </div>
            ) : (
              <div className="max-w-4xl mx-auto w-full space-y-6 pb-40">
                {session.messages.map((msg, index) => (
                  <MessageComponent 
                    key={index} 
                    message={msg} 
                    currentUser={currentUser} 
                    page={page} 
                    onVideoComplete={(url) => {
                      const updatedMessages = [...session.messages];
                      updatedMessages[index] = { ...updatedMessages[index], videoUrl: url };
                      onSessionUpdate({ ...session, messages: updatedMessages });
                    }}
                  />
                ))}
              </div>
            )}
            <div ref={messagesEndRef} className="h-10" />
          </div>

          <div className="border-t border-gray-800 p-4 bg-gray-950/80 backdrop-blur-xl z-40 w-full">
            <div className="max-w-4xl mx-auto w-full">
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {files.map((f, i) => (
                    <div key={i} className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold flex items-center gap-2 border border-white/10">
                      <span className="truncate max-w-[100px]">{f.name}</span>
                      <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">×</button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="relative group">
                <div className="flex items-end gap-2 bg-gray-900 border border-gray-700 rounded-2xl p-2 focus-within:border-gray-500 transition-all shadow-2xl">
                  <div className="flex items-center pb-1 pl-1">
                    <button 
                        type="button" 
                        onClick={() => setIsLiveSessionOpen(true)}
                        className="p-2 rounded-xl transition-all active:scale-90 text-gray-400 hover:text-emerald-400 hover:bg-emerald-400/10"
                        title="Slyntos Live"
                    >
                      <Mic size={18} />
                    </button>
                  </div>

                  <textarea
                    ref={textareaRef} value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                    placeholder={placeholderText}
                    rows={1}
                    className="flex-1 bg-transparent border-none text-white py-2.5 px-2 resize-none outline-none placeholder-gray-600 text-[15px] font-medium leading-relaxed max-h-48 min-h-[40px]"
                    disabled={isLoading}
                  />

                  <button 
                    onClick={() => handleSubmit()}
                    disabled={isLoading || (!input.trim() && files.length === 0)}
                    className={`rounded-xl h-10 w-10 flex items-center justify-center transition-all duration-300 flex-shrink-0 ${
                      isLoading || (!input.trim() && files.length === 0) 
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed' 
                        : 'bg-white text-black hover:bg-gray-200 active:scale-95'
                    }`}
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>
      
      {/* Contextual Panel Removed */}
    </div>
  );
};

export default ChatInterface;
