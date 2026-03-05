import React, { useState } from 'react';
import { Copy, Check, Download, Play } from 'lucide-react';

interface CodeEditorProps {
  html: string;
  css: string;
  js: string;
  onChange: (value: string, type: 'html' | 'css' | 'js') => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ html, css, js, onChange }) => {
  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = activeTab === 'html' ? html : activeTab === 'css' ? css : js;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getContent = () => {
    switch (activeTab) {
      case 'html': return html;
      case 'css': return css;
      case 'js': return js;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
        <div className="flex gap-1">
          {(['html', 'css', 'js'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 text-xs font-medium rounded-t-md transition-colors ${
                activeTab === tab 
                  ? 'bg-[#1e1e1e] text-blue-400 border-t-2 border-blue-400' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-white transition-colors"
          >
            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-white transition-colors">
            <Download size={12} />
            Export
          </button>
        </div>
      </div>

      <div className="flex-1 relative font-mono text-sm">
        <div className="absolute inset-0 overflow-auto p-4">
          <div className="flex">
            <div className="pr-4 text-gray-600 text-right select-none border-r border-[#333] mr-4">
              {getContent().split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={getContent()}
              onChange={(e) => onChange(e.target.value, activeTab)}
              spellCheck={false}
              className="flex-1 bg-transparent outline-none resize-none text-gray-300 leading-relaxed min-h-full whitespace-pre"
              style={{ tabSize: 2 }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-1.5 bg-[#007acc] text-white text-[10px] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>Spaces: 2</span>
          <span>{activeTab.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-2">
          <Play size={10} />
          <span>Live Preview Active</span>
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
