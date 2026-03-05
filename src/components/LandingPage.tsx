
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import SlyntosLogo from './icons/SlyntosLogo';
import ChatBubbleLeftRightIcon from './icons/ChatBubbleLeftRightIcon';
import AcademicCapIcon from './icons/AcademicCapIcon';
import CodeBracketSquareIcon from './icons/CodeBracketSquareIcon';
import MicrophoneIcon from './icons/MicrophoneIcon';
import RocketIcon from './icons/RocketIcon';
import PlayIcon from './icons/PlayIcon';
import BoltIcon from './icons/BoltIcon';

interface LandingPageProps {
  onFinish: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onFinish }) => {
  const handleStart = async () => {
    if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
      }
    }
    onFinish();
  };

  const capabilities = [
    { icon: <ChatBubbleLeftRightIcon className="w-4 h-4" />, title: "General Chat", desc: "Help with anything." },
    { icon: <AcademicCapIcon className="w-4 h-4" />, title: "Slyntos Edu", desc: "Master any subject." },
    { icon: <CodeBracketSquareIcon className="w-4 h-4" />, title: "Web Builder", desc: "Build and host sites." },
    { icon: <PlayIcon className="w-4 h-4" />, title: "Slyntos Studio", desc: "Create amazing videos." },
    { icon: <MicrophoneIcon className="w-4 h-4" />, title: "Voice", desc: "Talk in real-time." },
    { icon: <RocketIcon className="w-4 h-4" />, title: "Business", desc: "Grow your company." },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-gradient-to-br from-gray-950 via-gray-900 to-black flex flex-col items-center justify-center text-white overflow-hidden font-sans select-none">
      
      {/* Immersive Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/5 blur-[120px] rounded-full animate-pulse delay-700" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-center w-full max-w-4xl px-6"
      >
        
        <div className="flex flex-col items-center mb-12">
          <motion.div 
            whileHover={{ rotate: 6 }}
            className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.1)] mb-8 transition-transform duration-500"
          >
            <SlyntosLogo className="w-12 h-12" />
          </motion.div>
          
          <h1 className="text-6xl sm:text-8xl font-black tracking-tighter uppercase mb-4 text-center">
            Slyntos
          </h1>
          
          <p className="text-gray-400 text-lg sm:text-xl font-medium tracking-wide text-center max-w-xl">
            The world's most powerful assistant. Built for speed, intelligence, and creativity.
          </p>
        </div>

        <div className="w-full grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {capabilities.map((cap, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-[2rem] hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 group"
            >
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:text-black transition-all duration-300">
                {cap.icon}
              </div>
              <div className="text-left">
                <h3 className="text-xs font-black uppercase tracking-widest text-white mb-1">{cap.title}</h3>
                <p className="text-[10px] text-gray-500 font-bold leading-tight">{cap.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-8 w-full max-w-sm">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleStart}
            className="group relative w-full py-6 bg-white text-black font-black uppercase tracking-[0.3em] rounded-[1.5rem] transition-all duration-500 shadow-2xl"
          >
            <span className="relative z-10 flex items-center justify-center gap-4 text-sm">
              Get Started
              <BoltIcon className="w-5 h-5" />
            </span>
          </motion.button>
          
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-gray-700">Version 2.0 // Active</p>
        </div>
      </motion.div>

      {/* Subtle Scanlines */}
      <div className="absolute inset-0 pointer-events-none z-[50] opacity-[0.02] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px]" />
    </div>
  );
};

export default LandingPage;
