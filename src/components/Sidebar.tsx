
import React from 'react';
import type { ChatSession, Page, User } from '@/types';
import { Page as PageEnum } from '@/types';
import { 
  MessageSquare, 
  GraduationCap, 
  Video, 
  Globe, 
  Plus, 
  Trash2, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Zap,
  Settings,
  User as UserIcon
} from 'lucide-react';
import SlyntosLogo from '@/components/icons/SlyntosLogo';
import { PLAN_LIMITS } from '@/constants';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  currentUser: User;
  onLogout: () => void;
  onUpgradeClick: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  sessions, activeSessionId, onSelectSession, onNewChat, onDeleteSession,
  isOpen, onClose, currentPage, onNavigate, currentUser, onLogout, onUpgradeClick,
  isCollapsed, setIsCollapsed
}) => {
  const NavItem: React.FC<{ page: Page, icon: React.ReactNode, label: string }> = ({ page, icon, label }) => {
    const isActive = currentPage === page;
    return (
      <button
        onClick={() => onNavigate(page)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 group relative ${
          isActive 
            ? 'bg-white text-black shadow-xl shadow-white/5' 
            : 'text-gray-500 hover:text-white hover:bg-white/5'
        } ${isCollapsed ? 'justify-center px-0' : ''}`}
        title={label}
      >
        <div className={`transition-colors ${isActive ? 'text-black' : 'text-gray-500 group-hover:text-white'}`}>
          {icon}
        </div>
        {!isCollapsed && <span>{label}</span>}
        {isActive && !isCollapsed && (
          <div className="absolute right-3 w-1 h-1 rounded-full bg-black" />
        )}
      </button>
    );
  };

  const globalUsage = currentUser.usageCounts?.global || 0;
  const limits = PLAN_LIMITS[currentUser.plan as keyof typeof PLAN_LIMITS];
  const globalLimit = limits.messages;
  const usagePercentage = Math.min((globalUsage / globalLimit) * 100, 100);

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] md:hidden transition-opacity duration-500 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose} 
      />

      {/* Sidebar Container */}
      <aside className={`fixed top-0 left-0 z-[70] h-full bg-[#050505] border-r border-white/5 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0 ${isCollapsed ? 'w-20' : 'w-72'}`}>
        
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`p-6 flex items-center justify-between ${isCollapsed ? 'flex-col gap-6 p-4' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/10 flex-shrink-0 group cursor-pointer transition-transform hover:rotate-6">
                <SlyntosLogo className="w-6 h-6" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-black text-white tracking-tighter italic text-xl leading-none">SLYNTOS</span>
                  <span className="text-[7px] text-gray-600 font-black uppercase tracking-[0.5em] mt-1">Neural Core v2.4</span>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-2 text-gray-600 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>

          {/* New Chat Button */}
          <div className="px-4 mb-6">
            <button 
              onClick={onNewChat}
              className={`w-full group relative flex items-center gap-3 px-4 py-3 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-white/5 hover:scale-[1.02] transition-all active:scale-95 overflow-hidden ${isCollapsed ? 'justify-center px-0' : ''}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus size={18} className="relative z-10" />
              {!isCollapsed && <span className="relative z-10">New Mission</span>}
            </button>
          </div>

          {/* Navigation */}
          <div className="px-4 space-y-1.5">
            <div className={`mb-2 px-2 ${isCollapsed ? 'hidden' : ''}`}>
              <span className="text-[9px] font-black text-gray-700 uppercase tracking-[0.2em]">Workspace</span>
            </div>
            <NavItem page={PageEnum.General} icon={<MessageSquare size={18} />} label="General Chat" />
            <NavItem page={PageEnum.Edu} icon={<GraduationCap size={18} />} label="Slyntos Edu" />
            <NavItem page={PageEnum.Studio} icon={<Video size={18} />} label="Slyntos Studio" />
            <NavItem page={PageEnum.WebStudio} icon={<Globe size={18} />} label="Web Studio" />
          </div>

          {/* Chat History Section */}
          <div className={`flex-1 flex flex-col min-h-0 mt-8 ${isCollapsed ? 'hidden' : ''}`}>
            <div className="px-6 flex items-center justify-between mb-4">
              <h3 className="text-[9px] font-black text-gray-700 uppercase tracking-[0.2em]">Recent Missions</h3>
              <span className="text-[9px] font-bold text-gray-800">{sessions.length}</span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-1 custom-scrollbar relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-white/5" />
              {sessions.map((s: ChatSession) => (
                <div key={s.id} className="group relative pl-4">
                  <button
                    onClick={() => onSelectSession(s.id)}
                    className={`w-full text-left flex items-center justify-between px-4 py-3 rounded-xl text-[11px] font-bold transition-all border ${
                      activeSessionId === s.id 
                        ? 'bg-white/5 text-white border-white/10 shadow-lg' 
                        : 'text-gray-500 border-transparent hover:bg-white/5 hover:text-gray-300'
                    }`}
                  >
                    <span className="truncate flex-1 pr-4">{s.title || 'New Mission'}</span>
                    <div className="flex items-center gap-1">
                      <span onClick={(e) => { e.stopPropagation(); onDeleteSession(s.id); }} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                        <Trash2 size={14} />
                      </span>
                    </div>
                  </button>
                  {activeSessionId === s.id && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-r-full" />
                  )}
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="px-4 py-8 text-center">
                  <p className="text-[10px] text-gray-700 font-bold uppercase tracking-widest">No active missions</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer Section */}
          <div className="mt-auto p-4 space-y-4">
            {/* Upgrade Card */}
            {!isCollapsed && currentUser.plan === 'free' && (
              <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-black border border-white/5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap size={40} className="text-blue-500" />
                </div>
                <div className="relative z-10">
                  <h4 className="text-[10px] font-black text-white uppercase tracking-wider mb-1">Pro Access</h4>
                  <p className="text-[9px] text-gray-500 mb-3 leading-relaxed">Unlock advanced neural models and unlimited synthesis.</p>
                  <button 
                    onClick={onUpgradeClick}
                    className="w-full py-2 bg-white text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all active:scale-95"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            )}

            {/* Usage Stats */}
            {!isCollapsed && (
              <div className="px-2 py-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex justify-between items-center px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[8px] font-black text-gray-500 uppercase tracking-[0.2em]">Neural Bandwidth</span>
                  </div>
                  <span className="text-[8px] font-mono text-gray-400">{globalUsage} / {globalLimit}</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      usagePercentage > 90 ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' : 
                      usagePercentage > 70 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 
                      'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                    }`} 
                    style={{ width: `${usagePercentage}%` }} 
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[7px] text-gray-600 font-bold uppercase">System Load: Nominal</span>
                  <span className="text-[7px] text-gray-600 font-bold uppercase">{usagePercentage.toFixed(1)}%</span>
                </div>
              </div>
            )}

            {/* User Profile */}
            <div className={`flex items-center gap-3 p-2 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group ${isCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-950 rounded-xl flex items-center justify-center border border-white/10 shadow-lg flex-shrink-0 relative">
                <UserIcon size={18} className="text-gray-400" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#050505] rounded-full" />
              </div>
              
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{currentUser.username}</p>
                  <p className="text-[8px] uppercase font-black tracking-[0.2em] text-blue-500/80">{currentUser.plan} tier</p>
                </div>
              )}
              
              {!isCollapsed && (
                <div className="flex items-center gap-1">
                  <button className="p-2 text-gray-600 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                    <Settings size={14} />
                  </button>
                  <button 
                    onClick={onLogout} 
                    className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Terminate Session"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}} />
    </>
  );
};

export default Sidebar;
