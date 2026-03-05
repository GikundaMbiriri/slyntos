import React, { useState } from 'react';
import WebsiteBuilder, { WebProject } from './website-builder/WebsiteBuilder';
import { Page, User } from '../types';
import { Sparkles, Lock, Rocket } from 'lucide-react';
import { PLAN_LIMITS } from '../constants';

interface WebStudioPageProps {
  currentUser: User;
  onUpgradeClick?: () => void;
  onUsageIncrement?: (page: Page) => void;
}

const WebStudioPage: React.FC<WebStudioPageProps> = ({ currentUser, onUpgradeClick, onUsageIncrement }) => {
  const [project, setProject] = useState<WebProject | undefined>(undefined);

  const limits = PLAN_LIMITS[currentUser.plan as keyof typeof PLAN_LIMITS];
  const webUsage = currentUser.usageCounts[Page.WebStudio] || 0;
  const isPaid = currentUser.plan === 'pro';

  if (webUsage >= limits.webStudio && !isPaid) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center bg-gray-950">
        <div className="max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-20 animate-pulse" />
            <div className="relative w-24 h-24 bg-gray-900 rounded-[2rem] border border-gray-800 flex items-center justify-center mx-auto shadow-2xl">
              <Lock className="w-10 h-10 text-blue-500" />
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
              Web Studio <span className="text-blue-500">Pro</span>
            </h1>
            <p className="text-gray-400 text-sm leading-relaxed">
              Unlock the most advanced AI-powered website builder. Create responsive sites, dashboards, and apps with a single prompt.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-left">
            {[
              'AI Prompt-to-Site',
              'Responsive Design',
              'Built-in Backend',
              'One-Click Publish',
              'SEO Optimized',
              'Figma Integration'
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <Sparkles className="w-3 h-3 text-blue-500" />
                {feature}
              </div>
            ))}
          </div>

          <button
            onClick={onUpgradeClick}
            className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-2xl hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-white/5"
          >
            Upgrade to Slyntos Pro <Rocket className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const handleSave = (updatedProject: WebProject) => {
    console.log('Saving project:', updatedProject);
    setProject(updatedProject);
    onUsageIncrement?.(Page.WebStudio);
  };

  const handlePublish = (url: string) => {
    console.log('Project published at:', url);
  };

  return (
    <div className="h-full w-full">
      <WebsiteBuilder 
        project={project}
        onSave={handleSave}
        onPublish={handlePublish}
        user={currentUser}
      />
    </div>
  );
};

export default WebStudioPage;
