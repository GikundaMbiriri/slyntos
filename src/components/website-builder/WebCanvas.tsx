import React, { useRef, useState } from 'react';
import { WebElement, WebPage } from './WebsiteBuilder';
import { Trash2, Copy, Plus } from 'lucide-react';

interface WebCanvasProps {
  page: WebPage;
  selectedElement: WebElement | null;
  onSelectElement: (element: WebElement | null) => void;
  onUpdateElement: (id: string, updates: Partial<WebElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: (element: WebElement) => void;
  deviceMode: 'desktop' | 'tablet' | 'mobile';
  zoom: number;
  gridEnabled: boolean;
  snapToGrid: boolean;
  onDropElement: (type: string, position: { x: number; y: number }) => void;
}

const WebCanvas: React.FC<WebCanvasProps> = ({
  page,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  deviceMode,
  zoom,
  gridEnabled,
  snapToGrid,
  onDropElement
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const getCanvasWidth = () => {
    switch (deviceMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      default: return '100%';
    }
  };

  const renderElement = (el: WebElement) => {
    const isSelected = selectedElement?.id === el.id;
    
    const styles: any = {
      ...el.styles,
      ...(deviceMode === 'mobile' ? el.responsive?.mobile : {}),
      ...(deviceMode === 'tablet' ? el.responsive?.tablet : {}),
      outline: isSelected ? '2px solid #3b82f6' : 'none',
      position: el.styles.position || 'relative',
      cursor: isDragging ? 'grabbing' : (el.styles.cursor || 'default'),
    };

    const handleElementClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelectElement(el);
    };

    const handleDragStart = (e: React.DragEvent) => {
      if (el.styles.position !== 'absolute') return;
      setIsDragging(true);
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };

    const handleDragEnd = (e: React.DragEvent) => {
      if (el.styles.position !== 'absolute' || !canvasRef.current) return;
      setIsDragging(false);
      
      const canvasRect = canvasRef.current.getBoundingClientRect();
      let x = (e.clientX - canvasRect.left - dragOffset.x) / (zoom / 100);
      let y = (e.clientY - canvasRect.top - dragOffset.y) / (zoom / 100);

      if (snapToGrid) {
        x = Math.round(x / 20) * 20;
        y = Math.round(y / 20) * 20;
      }

      onUpdateElement(el.id, {
        styles: {
          ...el.styles,
          left: `${x}px`,
          top: `${y}px`,
        }
      });
    };

    const content = (
      <>
        {el.type === 'image' ? (
          <img src={el.content} alt={el.seo?.alt} style={{ width: '100%', height: '100%', objectFit: el.styles.objectFit as any }} />
        ) : el.type === 'video' ? (
          <div className="bg-black aspect-video flex items-center justify-center text-white">Video Placeholder</div>
        ) : (
          el.content || (el.children?.length === 0 && <div className="p-4 border border-dashed border-gray-300 text-gray-400 text-xs text-center">Empty {el.type}</div>)
        )}
        {el.children?.map(child => renderElement(child))}
        
        {isSelected && (
          <div className="absolute -top-10 left-0 flex items-center gap-1 bg-blue-600 text-white p-1 rounded shadow-lg z-50">
            <button onClick={() => onDuplicateElement(el)} className="p-1 hover:bg-blue-700 rounded" title="Duplicate"><Copy size={14} /></button>
            <button onClick={() => onDeleteElement(el.id)} className="p-1 hover:bg-red-600 rounded" title="Delete"><Trash2 size={14} /></button>
            <div className="w-px h-4 bg-blue-400 mx-1" />
            <span className="text-[10px] font-bold uppercase px-1">{el.type}</span>
          </div>
        )}
      </>
    );

    return (
      <div
        key={el.id}
        id={el.id}
        style={styles}
        onClick={handleElementClick}
        draggable={el.styles.position === 'absolute'}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`group relative transition-shadow ${isSelected ? 'shadow-outline-blue' : ''}`}
      >
        {content}
      </div>
    );
  };

  return (
    <div 
      className="flex-1 overflow-visible bg-gray-100 p-8 flex justify-center items-start relative"
      onClick={() => onSelectElement(null)}
      style={{ backgroundImage: gridEnabled ? 'radial-gradient(#cbd5e1 1px, transparent 1px)' : 'none', backgroundSize: '20px 20px', minHeight: '100vh' }}
    >
      <div 
        ref={canvasRef}
        className="bg-white shadow-2xl transition-all duration-300 origin-top"
        style={{ 
          width: getCanvasWidth(),
          minHeight: 'max(70vh, 100%)',
          height: 'auto',
          transform: `scale(${zoom / 100})`,
          ...page.styles.global
        } as any}
      >
        {page.elements.map(el => renderElement(el))}
        
        {page.elements.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-12 text-center">
            <Plus size={48} className="mb-4 opacity-20" />
            <h3 className="text-xl font-medium mb-2">Your canvas is empty</h3>
            <p className="max-w-xs">Drag elements from the library or use Slyntos AI to generate your first section.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebCanvas;
