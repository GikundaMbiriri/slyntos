
import React from 'react';
import type { User, Page, GenConfig } from '../types';
import { Page as PageEnum } from '../types';
import SparklesIcon from './icons/SparklesIcon';
import SlyntosLogo from './icons/SlyntosLogo';
import XCircleIcon from './icons/XCircleIcon';
import LockIcon from './icons/LockIcon';
import ClockIcon from './icons/ClockIcon';
import AdjustmentsHorizontalIcon from './icons/AdjustmentsHorizontalIcon';

interface ContextualPanelProps {
    page: Page;
    currentUser: User;
    isThinkingMode: boolean;
    setIsThinkingMode: (value: boolean) => void;
    isLiteMode: boolean;
    setIsLiteMode: (value: boolean) => void;
    academicTone?: string;
    setAcademicTone?: (value: any) => void;
    aspectRatio: '16:9' | '9:16' | '1:1';
    setAspectRatio: (value: '16:9' | '9:16' | '1:1') => void;
    videoDuration?: number;
    setVideoDuration?: (value: number) => void;
    onStartLiveSession: () => void;
    isGenerating: boolean;
    isOpen: boolean;
    onClose: () => void;
    advConfig: GenConfig;
    setAdvConfig: (val: GenConfig) => void;
}

const ContextualPanel: React.FC<ContextualPanelProps> = ({ 
    page, isThinkingMode, setIsThinkingMode, isLiteMode, 
    setIsLiteMode, academicTone, setAcademicTone, aspectRatio, setAspectRatio, 
    videoDuration = 6, setVideoDuration, onStartLiveSession,
    isOpen, onClose, advConfig, setAdvConfig
}) => {
    const handleSelectKey = async () => {
        if ((window as any).aistudio?.openSelectKey) {
            await (window as any).aistudio.openSelectKey();
        }
    };

    const updateField = (field: keyof GenConfig, value: any) => {
        setAdvConfig({ ...advConfig, [field]: value });
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[80] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />
            
            <aside className={`fixed top-0 right-0 z-[90] h-full w-[85%] sm:w-80 bg-[#080808] border-l border-white/5 transition-transform duration-500 shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
                <div className="p-6 flex items-center justify-between border-b border-white/5 bg-black/40">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                        <AdjustmentsHorizontalIcon className="w-4 h-4" />
                        System Config
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-colors active:scale-90">
                        <XCircleIcon className="w-7 h-7" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                    {page === PageEnum.WebStudio && (
                        <section>
                            <h4 className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-4">System Instructions</h4>
                            <textarea 
                                value={advConfig.systemInstructionOverride || ''}
                                onChange={(e) => updateField('systemInstructionOverride', e.target.value)}
                                className="w-full bg-black/50 border border-white/5 rounded-xl p-3 text-[11px] font-medium text-slate-300 min-h-[120px] focus:border-blue-500 outline-none placeholder-slate-800"
                                placeholder="Add custom instructions for this project..."
                            />
                        </section>
                    )}

                    <section className="space-y-6">
                        <h4 className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Model Parameters</h4>
                        
                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-bold text-slate-400">Temperature</label>
                                <span className="text-[10px] font-black text-white">{advConfig.temperature}</span>
                            </div>
                            <input 
                                type="range" min="0" max="2" step="0.1" 
                                value={advConfig.temperature} 
                                onChange={(e) => updateField('temperature', parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-bold text-slate-400">Top P</label>
                                <span className="text-[10px] font-black text-white">{advConfig.topP}</span>
                            </div>
                            <input 
                                type="range" min="0" max="1" step="0.05" 
                                value={advConfig.topP} 
                                onChange={(e) => updateField('topP', parseFloat(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-bold text-slate-400">Top K</label>
                                <span className="text-[10px] font-black text-white">{advConfig.topK}</span>
                            </div>
                            <input 
                                type="range" min="1" max="100" step="1" 
                                value={advConfig.topK} 
                                onChange={(e) => updateField('topK', parseInt(e.target.value))}
                                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
                            />
                        </div>
                    </section>

                    <section>
                        <h4 className="text-[9px] font-black text-slate-700 uppercase tracking-widest">AI Mode</h4>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                onClick={() => { setIsThinkingMode(!isThinkingMode); setIsLiteMode(false); }}
                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${isThinkingMode ? 'bg-white text-black border-white shadow-xl scale-[1.02]' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}
                            >
                                <div className={`w-2.5 h-2.5 rounded-full ${isThinkingMode ? 'bg-black animate-pulse' : 'bg-slate-800'}`} />
                                <div className="text-left">
                                  <div className="text-xs font-black">Deep Thinking</div>
                                  <div className={`text-[8px] font-black uppercase tracking-tighter ${isThinkingMode ? 'text-black/60' : 'text-slate-800'}`}>Better for complex tasks</div>
                                </div>
                            </button>
                            <button
                                onClick={() => { setIsLiteMode(!isLiteMode); setIsThinkingMode(false); }}
                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${isLiteMode ? 'bg-emerald-600 text-white border-emerald-500 shadow-xl scale-[1.02]' : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/20'}`}
                            >
                                <div className={`w-2.5 h-2.5 rounded-full ${isLiteMode ? 'bg-white animate-pulse' : 'bg-slate-800'}`} />
                                <div className="text-left">
                                  <div className="text-xs font-black">Fast Mode</div>
                                  <div className={`text-[8px] font-black uppercase tracking-tighter ${isLiteMode ? 'text-emerald-200' : 'text-slate-800'}`}>Instant responses</div>
                                </div>
                            </button>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-[9px] font-black text-slate-700 uppercase tracking-widest">API Key</h4>
                        <button
                            onClick={handleSelectKey}
                            className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 hover:border-white/30 rounded-2xl transition-all group"
                        >
                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white transition-colors text-slate-400 group-hover:text-black">
                                <LockIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <span className="block text-[11px] font-black uppercase text-slate-400 group-hover:text-white">Select API Key</span>
                                <span className="block text-[8px] text-slate-700 uppercase font-black tracking-tighter">Required for some features</span>
                            </div>
                        </button>
                    </section>

                    <section>
                        <h4 className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Presence</h4>
                        <button
                            onClick={onStartLiveSession}
                            className="w-full flex items-center gap-4 p-4 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 hover:border-blue-500/50 rounded-2xl transition-all group shadow-xl"
                        >
                            <div className="w-12 h-12 rounded-full border border-blue-500/30 overflow-hidden bg-slate-900 flex-shrink-0">
                                <img 
                                    src="https://picsum.photos/seed/human/200/200" 
                                    alt="Slyntos" 
                                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                                    referrerPolicy="no-referrer"
                                />
                            </div>
                            <div className="text-left">
                                <span className="block text-[11px] font-black uppercase text-blue-100">Live Presence</span>
                                <span className="block text-[8px] text-blue-400 font-black uppercase tracking-widest">Connect to Slyntos</span>
                            </div>
                        </button>
                    </section>
                </div>
                
                <div className="p-8 border-t border-white/5 text-center bg-black/40 backdrop-blur-md">
                   <p className="text-[8px] text-slate-800 font-black uppercase tracking-[0.4em]">Slyntos AI // Ready</p>
                </div>
            </aside>
        </>
    );
};

export default ContextualPanel;
