import React from 'react';
import { 
  Layout, Type, Image, Square, MousePointer2, 
  Columns, Rows, CreditCard, Navigation, List,
  FormInput, Play, Sparkles, Search, Plus
} from 'lucide-react';
import { WebElement } from './WebsiteBuilder';

interface ElementLibraryProps {
  onAddElement: (type: WebElement['type']) => void;
  onShowSlyntosStudio: () => void;
}

const ElementLibrary: React.FC<ElementLibraryProps> = ({ onAddElement, onShowSlyntosStudio }) => {
  const categories = [
    {
      name: 'Layout',
      elements: [
        { type: 'section', icon: <Rows className="w-4 h-4" />, label: 'Section' },
        { type: 'container', icon: <Columns className="w-4 h-4" />, label: 'Container' },
        { type: 'card', icon: <CreditCard className="w-4 h-4" />, label: 'Card' },
        { type: 'container', icon: <Layout className="w-4 h-4" />, label: 'Hero Section' },
      ]
    },
    {
      name: 'Forms',
      elements: [
        { type: 'form', icon: <Plus className="w-4 h-4" />, label: 'Form' },
        { type: 'input', icon: <Type className="w-4 h-4" />, label: 'Input' },
        { type: 'button', icon: <MousePointer2 className="w-4 h-4" />, label: 'Submit Button' },
      ]
    },
    {
      name: 'Data',
      elements: [
        { type: 'container', icon: <List className="w-4 h-4" />, label: 'Data List' },
      ]
    },
    {
      name: 'Typography',
      elements: [
        { type: 'heading', icon: <Type className="w-4 h-4" />, label: 'Heading' },
        { type: 'text', icon: <List className="w-4 h-4" />, label: 'Paragraph' },
      ]
    },
    {
      name: 'Media',
      elements: [
        { type: 'image', icon: <Image className="w-4 h-4" />, label: 'Image' },
        { type: 'video', icon: <Play className="w-4 h-4" />, label: 'Video' },
      ]
    },
    {
      name: 'Interactive',
      elements: [
        { type: 'button', icon: <MousePointer2 className="w-4 h-4" />, label: 'Button' },
        { type: 'form', icon: <FormInput className="w-4 h-4" />, label: 'Form' },
        { type: 'nav', icon: <Navigation className="w-4 h-4" />, label: 'Navigation' },
      ]
    }
  ];

  return (
    <div className="w-72 border-r border-gray-800 bg-gray-900 flex flex-col h-full">
      <div className="p-4 border-b border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search elements..." 
            className="w-full bg-gray-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
        {/* Slyntos Studio Button */}
        <button
          onClick={onShowSlyntosStudio}
          className="w-full p-4 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 transition-all group relative overflow-hidden"
        >
          <div className="relative z-10 flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-white">Slyntos Web Studio</div>
              <div className="text-[10px] text-white/70">Generate with a prompt</div>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:scale-110 transition-transform">
            <Sparkles className="w-12 h-12" />
          </div>
        </button>

        {categories.map((category) => (
          <div key={category.name} className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 px-1">
              {category.name}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {category.elements.map((el) => (
                <button
                  key={el.label}
                  onClick={() => onAddElement(el.type as WebElement['type'])}
                  className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-800/50 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800 transition-all group"
                >
                  <div className="p-2 bg-gray-800 rounded-lg group-hover:text-blue-400 transition-colors mb-2">
                    {el.icon}
                  </div>
                  <span className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors">
                    {el.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between text-[10px] text-gray-500 font-medium uppercase tracking-wider">
          <span>Elements: 12</span>
          <span>v1.0.4</span>
        </div>
      </div>
    </div>
  );
};

export default ElementLibrary;
