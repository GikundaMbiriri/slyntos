
import React, { useState } from 'react';
import { ChatSession, Page, User } from '../types';
import { ENTERPRISE_STREAMS, SYSTEM_INSTRUCTION_ENTERPRISE } from '../constants';
import ChatInterface from './ChatInterface';
import BriefcaseIcon from './icons/BriefcaseIcon';
import RocketIcon from './icons/RocketIcon';
import SparklesIcon from './icons/SparklesIcon';
import BoltIcon from './icons/BoltIcon';

interface EnterpriseHubProps {
    session: ChatSession;
    onSessionUpdate: (session: ChatSession) => void;
    currentUser: User;
    isRightSidebarOpen: boolean;
    setIsRightSidebarOpen: (open: boolean) => void;
}

const EnterpriseHub: React.FC<EnterpriseHubProps> = ({ 
    session, onSessionUpdate, currentUser, isRightSidebarOpen, setIsRightSidebarOpen 
}) => {
    const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);

    const activeStream = ENTERPRISE_STREAMS.find(s => s.id === selectedStreamId);

    if (selectedStreamId && activeStream) {
        return (
            <div className="flex flex-col h-full animate-fade-in">
                <div className="flex items-center justify-between p-4 bg-slate-800/50 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setSelectedStreamId(null)}
                            className="p-2 text-slate-400 hover:text-white bg-slate-700 rounded-md text-xs font-bold"
                        >
                            ← Back to Hub
                        </button>
                        <h2 className="text-xl font-bold text-white uppercase tracking-tighter">{activeStream.name}</h2>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-[10px] uppercase font-black px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                             Time: {activeStream.speed}
                        </span>
                    </div>
                </div>
                <ChatInterface
                    session={session}
                    onSessionUpdate={onSessionUpdate}
                    page={Page.Enterprise}
                    systemInstruction={SYSTEM_INSTRUCTION_ENTERPRISE.replace('{enterprise_stream}', activeStream.name)}
                    placeholderText={`How can I help with ${activeStream.name}?`}
                    currentUser={currentUser}
                    isRightSidebarOpen={isRightSidebarOpen}
                    setIsRightSidebarOpen={setIsRightSidebarOpen}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-900 overflow-y-auto p-6 scrollbar-hide">
            <div className="max-w-6xl mx-auto w-full">
                <div className="mb-10 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-slate-700/50 pb-8">
                    <div className="text-center sm:text-left">
                        <h1 className="text-5xl font-black text-white mb-2 italic tracking-tighter">BUSINESS HUB</h1>
                        <p className="text-blue-500 font-bold uppercase text-xs tracking-[0.2em]">Slyntos Business Solutions</p>
                    </div>
                    <div className="flex items-center gap-4 bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-500 uppercase font-bold">Project Timeline</p>
                            <p className="text-xl font-black text-green-400">7 - 30 DAYS</p>
                        </div>
                        <div className="w-px h-10 bg-slate-700" />
                        <BoltIcon className="w-8 h-8 text-yellow-500" />
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {ENTERPRISE_STREAMS.map((stream) => (
                        <button
                            key={stream.id}
                            onClick={() => setSelectedStreamId(stream.id)}
                            className="flex flex-col text-left p-6 bg-slate-800 border-2 border-slate-700 hover:border-blue-500 rounded-2xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                <BriefcaseIcon className="w-16 h-16 text-white" />
                            </div>
                            
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    {stream.speed}
                                </span>
                                <RocketIcon className="w-5 h-5 text-slate-600 group-hover:text-blue-400" />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{stream.name}</h3>
                            <p className="text-sm text-slate-400 leading-relaxed mb-6">{stream.description}</p>
                            
                            <div className="mt-auto flex items-center gap-2 text-xs font-black uppercase text-blue-500">
                                Start Project <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="p-8 bg-gradient-to-r from-blue-600/10 to-transparent border-2 border-blue-500/20 rounded-2xl flex flex-col md:flex-row items-center gap-8 shadow-2xl">
                    <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center rotate-3 group-hover:rotate-0 transition-transform">
                        <BoltIcon className="w-10 h-10 text-white" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tighter uppercase italic">Fast Execution</h2>
                        <p className="text-slate-400 text-sm leading-relaxed max-w-xl">
                            Select a category above to start your project. We'll help you build, automate, and grow your business with Slyntos AI.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnterpriseHub;
