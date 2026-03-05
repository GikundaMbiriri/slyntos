import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, Rocket, Check, 
  ExternalLink, Copy, Shield,
  Zap, Cloud, Server
} from 'lucide-react';

interface PublishingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  onPublish?: (url: string) => void;
  html: string;
}

const PublishingDialog: React.FC<PublishingDialogProps> = ({ 
  isOpen, 
  onClose, 
  projectName, 
  onPublish,
  html,
}) => {
  const [step, setStep] = useState<'preparing' | 'optimizing' | 'deploying' | 'success'>('preparing');
  const [progress, setProgress] = useState(0);
  const [publishedUrl, setPublishedUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 1;
      });
    }, 50);

    return () => clearInterval(timer);
  }, [isOpen]);

  useEffect(() => {
    if (progress < 30) setStep('preparing');
    else if (progress < 60) setStep('optimizing');
    else if (progress < 95) setStep('deploying');
    else {
      setStep('success');
      // Create a Blob URL for the actual content so it's not empty
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      setPublishedUrl(blobUrl);
      if (onPublish) onPublish(blobUrl);
    }
  }, [progress, html, onPublish]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(publishedUrl);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-8">
          <AnimatePresence mode="wait">
            {step !== 'success' ? (
              <motion.div 
                key="publishing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
                  <motion.div 
                    className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                    <Rocket size={32} />
                  </div>
                </div>

                <h2 className="text-2xl font-bold mb-2">Launching Site</h2>
                <p className="text-gray-500 text-sm mb-8">
                  {step === 'preparing' && 'Preparing assets and code...'}
                  {step === 'optimizing' && 'Optimizing images and SEO...'}
                  {step === 'deploying' && 'Deploying to global edge network...'}
                </p>

                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mb-4">
                  <motion.div 
                    className="bg-blue-600 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check size={40} />
                </div>

                <h2 className="text-2xl font-bold mb-2">Site is Live!</h2>
                <p className="text-gray-500 text-sm mb-8">
                  Your project has been successfully published to the web.
                </p>

                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live URL</span>
                    <span className="flex items-center gap-1 text-[10px] text-green-600 font-bold uppercase">
                      <Shield size={10} /> SSL Secured
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-gray-200">
                    <Globe size={16} className="text-blue-600" />
                    <span className="flex-1 text-sm font-medium truncate text-left">{publishedUrl}</span>
                    <button onClick={handleCopy} className="p-1.5 hover:bg-gray-100 rounded-md transition-colors text-gray-400">
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => window.open(publishedUrl, '_blank')}
                    className="flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                  >
                    <ExternalLink size={18} />
                    View Site
                  </button>
                  <button 
                    onClick={onClose}
                    className="flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
                  >
                    Done
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-gray-50 p-4 flex items-center justify-center gap-6 border-t">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
            <Zap size={12} className="text-yellow-500" /> Edge CDN
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
            <Cloud size={12} className="text-blue-400" /> Cloud Hosting
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
            <Server size={12} className="text-green-500" /> Auto-Scaling
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PublishingDialog;
