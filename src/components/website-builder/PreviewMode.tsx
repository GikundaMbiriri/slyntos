import React, { useState } from 'react';
import { Smartphone, Monitor, Tablet, RefreshCw, ExternalLink } from 'lucide-react';

interface PreviewModeProps {
  html: string;
  css: string;
  js: string;
  deviceMode: 'desktop' | 'tablet' | 'mobile';
}

const PreviewMode: React.FC<PreviewModeProps> = ({ html, css, js, deviceMode: initialDeviceMode }) => {
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>(initialDeviceMode);
  const [key, setKey] = useState(0);

  const fullHtml = `
    ${html}
    <style>${css}</style>
    <script>${js}</script>
  `;

  const getWidth = () => {
    switch (previewDevice) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-900 flex flex-col">
      <div className="h-16 bg-white border-b flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <h2 className="font-bold text-lg">Live Preview</h2>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setPreviewDevice('desktop')}
              className={`p-1.5 rounded-md transition-all ${previewDevice === 'desktop' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            >
              <Monitor size={18} />
            </button>
            <button 
              onClick={() => setPreviewDevice('tablet')}
              className={`p-1.5 rounded-md transition-all ${previewDevice === 'tablet' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            >
              <Tablet size={18} />
            </button>
            <button 
              onClick={() => setPreviewDevice('mobile')}
              className={`p-1.5 rounded-md transition-all ${previewDevice === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
            >
              <Smartphone size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setKey(k => k + 1)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            title="Refresh Preview"
          >
            <RefreshCw size={20} />
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <ExternalLink size={16} />
            Open in New Tab
          </button>
        </div>
      </div>

      <div className="flex-1 bg-gray-200 overflow-auto p-8 flex justify-center items-start">
        <div 
          className="bg-white shadow-2xl transition-all duration-500 overflow-hidden"
          style={{ 
            width: getWidth(),
            height: previewDevice === 'desktop' ? '100%' : '812px',
            borderRadius: previewDevice === 'desktop' ? '0' : '24px',
            border: previewDevice === 'desktop' ? 'none' : '12px solid #111'
          }}
        >
          <iframe 
            key={key}
            srcDoc={fullHtml}
            title="Slyntos Preview"
            className="w-full h-full border-none"
          />
        </div>
      </div>
    </div>
  );
};

export default PreviewMode;
