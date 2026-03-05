import React, { useState, useRef } from 'react';
import { Sparkles, X, Send, Loader2, Wand2, Layout, Palette, Type, Globe, Camera, Monitor, Database, Gamepad2, Smartphone, Figma } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { WebElement } from './WebsiteBuilder';

interface SlyntosStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (data: any) => void;
}

const SlyntosStudio: React.FC<SlyntosStudioProps> = ({ isOpen, onClose, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<'prompt' | 'generating' | 'preview'>('prompt');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setScreenshot(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() && !screenshot) return;
    
    setIsGenerating(true);
    setStep('generating');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const contents: any[] = [];
      
      let systemPrompt = `Generate a high-end, professional website structure based on the provided input.
      Return a JSON object with a list of elements. Each element should have:
      - type: 'container', 'heading', 'text', 'button', 'image', 'card', 'section', 'form', 'input', 'nav', 'footer'
      - content: string (for text/headings/buttons) or URL (for images)
      - styles: object with CSS properties (camelCase). Use modern, responsive styles.
      - attributes: object for HTML attributes (e.g. { type: 'email', placeholder: 'Enter email', name: 'email' })
      - children: array of elements (optional)
      
      Special Attributes for Interactivity:
      - data-action: string (e.g. "alert:Welcome!", "navigate:/contact", "submit:form-id")
      - data-source: string (e.g. "list")
      - data-db: string (name of the simulated database table)
      
      For full-stack features:
      - Use 'form' type for data entry.
      - Use 'container' with data-source="list" to display data from a data-db.
      
      If the input is an image, convert the visual design into this JSON structure.
      If the input is a prompt, interpret the requirements (e.g. Dashboard, Landing Page, Game, App).
      
      Focus on a modern, high-end aesthetic with smooth transitions and responsive layouts.`;

      const parts: any[] = [{ text: `${systemPrompt}\n\nUser Input: ${prompt}` }];
      
      if (screenshot) {
        parts.push({
          inlineData: {
            mimeType: 'image/png',
            data: screenshot.split(',')[1]
          }
        });
      }

      const response = await ai.models.generateContent({
        model: screenshot ? "gemini-3-pro-image-preview" : "gemini-3-flash-preview",
        contents: [{ parts }],
        config: {
          responseMimeType: "application/json"
        }
      });

      const result = JSON.parse(response.text || '{}');
      const rawElements = Array.isArray(result) ? result : (result.elements || result.items || []);
      
      const ensureIds = (els: any[]): WebElement[] => {
        return els.map(el => ({
          ...el,
          id: el.id || `sl_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
          children: el.children ? ensureIds(el.children) : undefined,
          styles: el.styles || {}
        }));
      };

      onGenerate(ensureIds(rawElements));
      onClose();
    } catch (error) {
      console.error('Generation failed:', error);
      setStep('prompt');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-purple-600/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-xl shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Slyntos Web Studio</h2>
              <p className="text-xs text-gray-400">Describe your vision, and I'll build the structure.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
          {step === 'prompt' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-4">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500">What are we building today?</label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g. A luxury travel agency landing page with a hero section, featured destinations, and a booking form..."
                    className="w-full bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm text-white placeholder-gray-600 focus:ring-2 focus:ring-blue-500 transition-all resize-none h-32 leading-relaxed"
                  />
                </div>
                
                <div className="w-32 h-32 relative group">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleScreenshotUpload} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full h-full rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2 ${
                      screenshot ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 hover:border-gray-700 bg-gray-800/30'
                    }`}
                  >
                    {screenshot ? (
                      <img src={screenshot} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <>
                        <Camera className="w-6 h-6 text-gray-500" />
                        <span className="text-[8px] font-bold uppercase text-gray-500">Screenshot</span>
                      </>
                    )}
                  </button>
                  {screenshot && (
                    <button 
                      onClick={() => setScreenshot(null)}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { icon: <Globe className="w-4 h-4" />, label: 'Landing Page' },
                  { icon: <Monitor className="w-4 h-4" />, label: 'AI Dashboard' },
                  { icon: <Database className="w-4 h-4" />, label: 'Internal Tool' },
                  { icon: <Gamepad2 className="w-4 h-4" />, label: 'AI Game' },
                  { icon: <Smartphone className="w-4 h-4" />, label: 'Mobile App' },
                  { icon: <Figma className="w-4 h-4" />, label: 'Figma Import' },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setPrompt(`A professional ${preset.label} with...`)}
                    className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-800/50 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800 transition-all text-center group"
                  >
                    <div className="p-2 bg-gray-800 rounded-lg group-hover:text-blue-400 transition-colors">
                      {preset.icon}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-500 group-hover:text-white transition-colors">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'generating' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin relative z-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Architecting your site...</h3>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">
                  Slyntos is currently generating the structure, styles, and content for your vision.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'prompt' && (
          <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
              <Wand2 className="w-3.5 h-3.5" /> Powered by Slyntos Intelligence
            </div>
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              Generate Site <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlyntosStudio;
