import React from 'react';
import { History, Clock, ChevronRight, X } from 'lucide-react';
import { WebProject } from './WebsiteBuilder';

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  history: WebProject[];
  onRestore: (project: WebProject) => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ isOpen, onClose, history, onRestore }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-gray-900 shadow-2xl z-[60] flex flex-col border-l border-gray-800 text-white">
      <div className="p-4 border-b border-gray-800 bg-gray-950 flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <History size={18} className="text-blue-500" />
          Version History
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Recent Changes</div>
        
        {history.slice().reverse().map((project, revIndex) => {
          const actualIndex = history.length - 1 - revIndex;
          const date = new Date(project.id.split('_')[1] ? parseInt(project.id.split('_')[1]) : Date.now());

          return (
            <div 
              key={actualIndex}
              onClick={() => onRestore(project)}
              className="p-4 rounded-xl border border-gray-800 bg-gray-800/50 hover:border-blue-500/50 hover:bg-gray-800 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-bold text-gray-200">
                    Version {actualIndex + 1}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-3">
                <Clock size={10} />
                {date.toLocaleTimeString()} • {date.toLocaleDateString()}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                  {project.pages[0].elements.length} elements
                </span>
                <ChevronRight size={14} className="transition-transform group-hover:translate-x-1 text-gray-600" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VersionHistory;
