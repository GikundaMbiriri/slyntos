
import React, { useState, useRef, useEffect } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { Download, Scissors, Wand2, Upload, Loader2, Play, Trash2 } from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";

interface VideoEditorProps {
  onUsageIncrement: () => void;
}

const VideoEditor: React.FC<VideoEditorProps> = ({ onUsageIncrement }) => {
  const [ffmpeg, setFfmpeg] = useState<FFmpeg | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedVideoUrl, setProcessedVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFFmpeg();
  }, []);

  const loadFFmpeg = async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const ffmpegInstance = new FFmpeg();
    
    ffmpegInstance.on('log', ({ message }) => {
      setLogs(prev => [...prev.slice(-5), message]);
      console.log(message);
    });

    setStatus('Loading FFmpeg Core...');
    await ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    setFfmpeg(ffmpegInstance);
    setLoaded(true);
    setStatus('Ready');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setProcessedVideoUrl(null);
    }
  };

  const processVideo = async () => {
    if (!ffmpeg || !videoFile || !instruction.trim()) return;

    setIsProcessing(true);
    setStatus('Analyzing Instructions...');
    setLogs([]);

    try {
      // 1. Use Gemini to translate instructions to FFmpeg commands
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Translate the following video editing instruction into a series of FFmpeg command arguments (the part after "ffmpeg").
        The input file is always named "input.mp4" and the output should be "output.mp4".
        
        Instruction: "${instruction}"
        
        Return ONLY a JSON array of strings representing the arguments.
        Example for trimming first 5 seconds: ["-i", "input.mp4", "-ss", "00:00:00", "-t", "00:00:05", "-c", "copy", "output.mp4"]
        Example for grayscale: ["-i", "input.mp4", "-vf", "format=gray", "output.mp4"]`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const args = JSON.parse(response.text);
      setStatus('Processing Video...');

      // 2. Run FFmpeg
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
      await ffmpeg.exec(args);
      
      const data = await ffmpeg.readFile('output.mp4');
      const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: 'video/mp4' }));
      
      setProcessedVideoUrl(url);
      setStatus('Success');
      onUsageIncrement();
    } catch (error) {
      console.error(error);
      setStatus('Error processing video');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!loaded) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-gray-900/50 rounded-3xl border border-gray-800">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-sm font-black uppercase tracking-widest text-gray-500">{status}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload & Preview Section */}
        <div className="space-y-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`aspect-video rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden relative group ${
              videoUrl ? 'border-gray-800 bg-gray-900' : 'border-gray-800 hover:border-blue-500/50 bg-gray-900/50'
            }`}
          >
            {videoUrl ? (
              <>
                <video src={videoUrl} className="w-full h-full object-cover" controls />
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setVideoFile(null); setVideoUrl(null); }}
                    className="p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-4 bg-blue-500/10 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6 text-blue-400" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-500">Upload Video Asset</p>
              </>
            )}
          </div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" hidden />
        </div>

        {/* Instructions Section */}
        <div className="space-y-6">
          <div className="bg-gray-900 p-6 rounded-3xl border border-gray-800 shadow-2xl space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Editing Instructions</label>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g., Trim the first 10 seconds, make it grayscale, or add a fade in effect..."
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-sm focus:outline-none focus:border-gray-700 transition-all min-h-[100px] resize-none"
              />
            </div>

            <button
              onClick={processVideo}
              disabled={isProcessing || !videoFile || !instruction.trim()}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase italic text-xs tracking-widest flex items-center justify-center gap-3 hover:bg-blue-500 transition-all disabled:opacity-50 shadow-xl shadow-blue-500/10"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {isProcessing ? 'Processing Neural Assets...' : 'Apply Neural Edits'}
            </button>
            
            {status && (
              <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl">
                <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{status}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Section */}
      {processedVideoUrl && (
        <div className="space-y-6 animate-fade-in border-t border-gray-800 pt-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black italic uppercase tracking-tighter">Neural Output</h3>
            <a
              href={processedVideoUrl}
              download="slyntos_edited.mp4"
              className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-black uppercase italic text-[10px] tracking-widest flex items-center gap-2 hover:bg-emerald-500 transition-all"
            >
              <Download size={14} />
              Export Result
            </a>
          </div>
          <div className="bg-gray-900 aspect-video rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
            <video src={processedVideoUrl} controls className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoEditor;
