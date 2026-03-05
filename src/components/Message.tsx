import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { motion } from 'motion/react';
import type { Message as MessageType, User } from '@/types';
import ClipboardIcon from '@/components/icons/ClipboardIcon';
import CheckIcon from '@/components/icons/CheckIcon';
import DownloadIcon from '@/components/icons/DownloadIcon';
import LinkIcon from '@/components/icons/LinkIcon';
import { Page } from '@/types';
import { Volume2, VolumeX } from 'lucide-react';
import { generateSpeech } from '@/services/geminiService';

interface MessageProps {
  message: MessageType;
  currentUser: User;
  onHumanize?: (text: string) => void;
  onVideoComplete?: (url: string) => void;
  page?: Page;
}

const Message: React.FC<MessageProps> = ({ message, currentUser, page, onVideoComplete }) => {
  const { role, content, images, videoUrl, videoScript, audioUrl, sources } = message;
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  const handleTTS = async () => {
    if (isSpeaking && audio) {
      audio.pause();
      setIsSpeaking(false);
      return;
    }

    if (!content) return;

    try {
      setIsSpeaking(true);
      const speechUrl = await generateSpeech(content.replace(/```[\s\S]*?```/g, ''));
      const newAudio = new Audio(speechUrl);
      newAudio.onended = () => setIsSpeaking(false);
      setAudio(newAudio);
      newAudio.play();
    } catch (error) {
      console.error("TTS Error:", error);
      setIsSpeaking(false);
    }
  };

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDocDownload = (type: 'word' | 'excel', docContent: string, filename: string) => {
    let blob;
    if (type === 'excel') {
      blob = new Blob(['\ufeff' + docContent.trim()], { type: 'text/csv;charset=utf-8;' });
      if (!filename.toLowerCase().endsWith('.csv')) {
        filename = filename.replace(/\.(xlsx|xls)$/i, '') + '.csv';
      }
    } else {
      const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'></head>
        <body>${docContent}</body>
        </html>
      `;
      blob = new Blob([header], { type: 'application/msword' });
      if (!filename.toLowerCase().endsWith('.doc')) {
        filename = filename.replace(/\.docx$/i, '') + '.doc';
      }
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const renderDocs = () => {
    if (!content) return null;
    const docRegex = /```(word|excel):([\w.-]+)\n([\s\S]*?)\n```/g;
    const docs = [];
    let match;
    while ((match = docRegex.exec(content)) !== null) {
      docs.push({ type: match[1] as 'word' | 'excel', filename: match[2], content: match[3] });
    }
    
    if (docs.length === 0) return null;
    
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {docs.map((doc, idx) => (
          <button
            key={idx}
            onClick={() => handleDocDownload(doc.type, doc.content, doc.filename)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all active:scale-95 shadow-lg ${
              isUser ? 'bg-black/10 text-black hover:bg-black/20' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'
            }`}
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            {doc.filename}
          </button>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`relative max-w-[85%] group ${isUser ? 'order-1' : 'order-2'}`}>
        <div className={`rounded-2xl px-5 py-4 shadow-xl ${
          isUser 
            ? 'bg-white text-black' 
            : 'bg-gray-800 text-gray-100'
        }`}>
          <div className={`prose max-w-none text-[15px] leading-relaxed font-medium ${
            isUser ? 'prose-slate prose-p:text-black prose-strong:text-black prose-code:text-indigo-600' : 'prose-invert prose-slate prose-p:text-gray-100 prose-strong:text-white prose-code:text-emerald-400'
          }`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm, remarkMath]} 
              rehypePlugins={[rehypeKatex]}
            >
              {content ? content.replace(/```(word|excel):[\w.-]+\n[\s\S]*?\n```/g, '') : 'typing...'}
            </ReactMarkdown>
            {!content && !isUser && (
              <div className="flex gap-1 mt-1">
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, times: [0, 0.5, 1] }} className="w-1 h-1 bg-emerald-400 rounded-full" />
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2, times: [0, 0.5, 1] }} className="w-1 h-1 bg-emerald-400 rounded-full" />
                <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4, times: [0, 0.5, 1] }} className="w-1 h-1 bg-emerald-400 rounded-full" />
              </div>
            )}
          </div>

          {renderDocs()}

          {images && images.length > 0 && (
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {images.map((img, idx) => (
                <img key={idx} src={`data:image/png;base64,${img}`} alt="Asset" className="max-w-[280px] rounded-xl shadow-lg border border-white/10 transition-all hover:scale-[1.02]" />
              ))}
            </div>
          )}

          {videoUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black max-w-full aspect-video">
              <video 
                key={videoUrl}
                controls 
                playsInline 
                className="w-full h-full object-cover"
                src={videoUrl}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {audioUrl && <audio controls src={audioUrl} className={`mt-4 h-8 w-full max-w-xs ${isUser ? 'opacity-80' : 'invert opacity-60'}`} />}

          {sources && sources.length > 0 && (
            <div className={`mt-6 pt-4 border-t space-y-3 ${isUser ? 'border-black/10' : 'border-white/5'}`}>
              <p className={`text-[9px] font-black uppercase tracking-widest ${isUser ? 'text-black/40' : 'text-slate-500'}`}>Sources</p>
              <div className="flex flex-wrap gap-2">
                {sources.map((source, idx) => (
                  <a 
                    key={idx} 
                    href={source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all active:scale-95 ${
                      isUser ? 'bg-black/5 text-black hover:bg-black/10' : 'bg-white/5 text-blue-400 hover:bg-white/10 border border-white/5'
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    <span className="truncate max-w-[150px]">{source.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {!isUser && content && (
          <div className="absolute -right-10 top-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all">
            <button
              onClick={handleCopy}
              className="p-2 text-slate-700 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/5"
              title="Copy Output"
            >
              {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardIcon className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleTTS}
              className={`p-2 rounded-lg border border-white/5 transition-all ${isSpeaking ? 'bg-blue-500/20 text-blue-400' : 'text-slate-700 hover:text-white bg-white/5 hover:bg-white/10'}`}
              title={isSpeaking ? "Stop Speaking" : "Listen to Response"}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Message;
