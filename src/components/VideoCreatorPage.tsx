
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, User, Page } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { generateVideo } from '../services/geminiService';
import { PLAN_LIMITS } from '../constants';
import PlayIcon from './icons/PlayIcon';
import StopIcon from './icons/StopIcon';
import DownloadIcon from './icons/DownloadIcon';
import SparklesIcon from './icons/SparklesIcon';
import Loader from './Loader';

import VideoEditor from './VideoEditor';

interface Scene {
  text: string;
  background: string;
  textColor: string;
  duration: number; // ms
  animation: 'fade' | 'slide' | 'zoom' | 'none';
}

interface VideoScript {
  title: string;
  scenes: Scene[];
}

interface VideoCreatorPageProps {
  session: ChatSession;
  onSessionUpdate: (session: ChatSession) => void;
  currentUser: User;
  onUsageIncrement: (page: Page) => void;
  isRightSidebarOpen: boolean;
  setIsRightSidebarOpen: (open: boolean) => void;
}

const VideoCreatorPage: React.FC<VideoCreatorPageProps> = ({
  session,
  onSessionUpdate,
  currentUser,
  onUsageIncrement,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'edit'>('create');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      if (typeof (window as any).aistudio?.hasSelectedApiKey === 'function') {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        // Fallback for local dev or if not in AI Studio
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (typeof (window as any).aistudio?.openSelectKey === 'function') {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    const limits = PLAN_LIMITS[currentUser.plan as keyof typeof PLAN_LIMITS];
    const videoUsage = currentUser.usageCounts[Page.Studio] || 0;

    if (videoUsage >= limits.video) {
      setStatus(`⚠️ Limit Reached: ${currentUser.plan === 'free' ? 'Free users cannot synthesize video.' : 'Pro users are limited to 1 video generation.'} Upgrade for more.`);
      return;
    }

    if (!hasApiKey) {
      await handleSelectKey();
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setStatus('Initializing Neural Engine...');
    
    try {
      const url = await generateVideo(prompt, '16:9', (msg) => setStatus(msg));
      setVideoUrl(url);
      onUsageIncrement(Page.Studio);
    } catch (error: any) {
      console.error("Slyntos Studio Error:", error);
      if (error.message?.includes("entity was not found")) {
        setHasApiKey(false);
        setStatus('API Key Error. Please re-select your key.');
      } else {
        setStatus(`Synthesis Error: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-transparent text-white overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <h1 className="text-4xl font-black italic uppercase tracking-tighter">Slyntos Studio</h1>
              <p className="text-gray-500 text-sm font-medium">Professional Neural Video Synthesis & Editing.</p>
            </div>
            
            <div className="flex bg-gray-900 p-1 rounded-2xl border border-gray-800">
              <button 
                onClick={() => setActiveTab('create')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'create' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
              >
                Create
              </button>
              <button 
                onClick={() => setActiveTab('edit')}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'edit' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
              >
                Edit
              </button>
            </div>
          </div>

          {activeTab === 'create' ? (
            <div className="space-y-8 animate-fade-in">
              <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-2xl space-y-6">
                {!hasApiKey && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-3">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Slyntos Studio requires a paid Google Cloud API Key for high-quality synthesis</p>
                    <button 
                      onClick={handleSelectKey}
                      className="w-full py-2 bg-amber-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-400 transition-all"
                    >
                      Select API Key
                    </button>
                    <p className="text-[9px] text-gray-500 italic">Billing must be enabled on your Google Cloud project. <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">Learn more</a></p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Neural Synthesis Prompt</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe the cinematic asset you want to synthesize..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-gray-700 transition-all min-h-[100px] resize-none"
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase italic text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  <SparklesIcon className="w-4 h-4" />
                  {isGenerating ? 'Synthesizing...' : 'Create Video'}
                </button>
                
                {status && isGenerating && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{status}</span>
                  </div>
                )}
              </div>

              {videoUrl && (
                <div className="space-y-6 animate-fade-in">
                  <div className="bg-gray-900 aspect-video rounded-3xl border border-gray-800 shadow-2xl overflow-hidden relative group">
                    <video 
                      src={videoUrl} 
                      controls 
                      autoPlay 
                      loop 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <a
                    href={videoUrl}
                    download="slyntos_asset.mp4"
                    className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black uppercase italic text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all shadow-xl shadow-emerald-500/10"
                  >
                    <DownloadIcon className="w-4 h-4" />
                    Export Asset
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-fade-in">
              <VideoEditor onUsageIncrement={() => onUsageIncrement(Page.Studio)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoCreatorPage;
