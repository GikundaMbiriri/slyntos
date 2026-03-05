import React from 'react';
import { WebElement, WebPage } from './WebsiteBuilder';
import { 
  Type, Palette, Layout, Box, 
  AlignLeft, AlignCenter, AlignRight, 
  Settings as SettingsIcon
} from 'lucide-react';

interface PropertiesPanelProps {
  element: WebElement | null;
  page: WebPage;
  onUpdateElement: (updates: Partial<WebElement>) => void;
  onUpdatePage: (updatedPage: WebPage) => void;
  onDeleteElement: () => void;
  onDuplicateElement: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  element, 
  onUpdateElement, 
}) => {
  if (!element) {
    return (
      <div className="flex-1 bg-gray-900 p-6 flex flex-col items-center justify-center text-gray-500 text-center">
        <SettingsIcon size={48} className="mb-4 opacity-20" />
        <p className="text-sm">Select an element to edit its properties</p>
      </div>
    );
  }

  const handleStyleChange = (key: string, value: any) => {
    onUpdateElement({
      styles: {
        ...element.styles,
        [key]: value
      }
    });
  };

  const handleContentChange = (value: string) => {
    onUpdateElement({ content: value });
  };

  return (
    <div className="w-80 border-l bg-white overflow-y-auto h-full flex flex-col">
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <h3 className="font-bold text-sm uppercase tracking-wider text-gray-500 flex items-center gap-2">
          <SettingsIcon size={16} />
          Properties: {element.type}
        </h3>
        <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-mono">
          {element.id.split('_')[1]}
        </span>
      </div>

      <div className="p-4 space-y-6">
        {['text', 'heading', 'button', 'image'].includes(element.type) && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Content</label>
            {element.type === 'image' ? (
              <input 
                type="text" 
                value={element.content || ''} 
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Image URL"
              />
            ) : (
              <textarea 
                value={element.content || ''} 
                onChange={(e) => handleContentChange(e.target.value)}
                className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[80px]"
              />
            )}
          </div>
        )}

        {['text', 'heading', 'button'].includes(element.type) && (
          <div className="space-y-4">
            <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
              <Type size={14} /> Typography
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400">Size</span>
                <input 
                  type="text" 
                  value={element.styles.fontSize || ''} 
                  onChange={(e) => handleStyleChange('fontSize', e.target.value)}
                  className="w-full p-1.5 border rounded text-xs"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-gray-400">Weight</span>
                <select 
                  value={element.styles.fontWeight || ''} 
                  onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                  className="w-full p-1.5 border rounded text-xs"
                >
                  <option value="400">Normal</option>
                  <option value="500">Medium</option>
                  <option value="600">Semi-Bold</option>
                  <option value="700">Bold</option>
                </select>
              </div>
            </div>
            <div className="flex border rounded overflow-hidden">
              <button 
                onClick={() => handleStyleChange('textAlign', 'left')}
                className={`flex-1 p-2 hover:bg-gray-100 ${element.styles.textAlign === 'left' ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                <AlignLeft size={16} className="mx-auto" />
              </button>
              <button 
                onClick={() => handleStyleChange('textAlign', 'center')}
                className={`flex-1 p-2 border-x hover:bg-gray-100 ${element.styles.textAlign === 'center' ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                <AlignCenter size={16} className="mx-auto" />
              </button>
              <button 
                onClick={() => handleStyleChange('textAlign', 'right')}
                className={`flex-1 p-2 hover:bg-gray-100 ${element.styles.textAlign === 'right' ? 'bg-blue-50 text-blue-600' : ''}`}
              >
                <AlignRight size={16} className="mx-auto" />
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
            <Layout size={14} /> Layout
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400">Width</span>
              <input 
                type="text" 
                value={element.styles.width || ''} 
                onChange={(e) => handleStyleChange('width', e.target.value)}
                className="w-full p-1.5 border rounded text-xs"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400">Height</span>
              <input 
                type="text" 
                value={element.styles.height || ''} 
                onChange={(e) => handleStyleChange('height', e.target.value)}
                className="w-full p-1.5 border rounded text-xs"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
            <Palette size={14} /> Appearance
          </label>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Background</span>
              <div className="flex gap-2 items-center">
                <input 
                  type="color" 
                  value={element.styles.backgroundColor || '#ffffff'} 
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;
