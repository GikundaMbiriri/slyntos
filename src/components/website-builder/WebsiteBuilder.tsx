import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Code, Eye, Smartphone, Monitor, Tablet,
  Save, Download, Globe, Sparkles, History, Settings,
  Plus, Trash2, Copy, ChevronRight, ChevronLeft,
  Grid, Type, Image, Box, Zap, Figma,
  Menu, X, Check, AlertCircle
} from 'lucide-react';
import WebCanvas from './WebCanvas';
import ElementLibrary from './ElementLibrary';
import PropertiesPanel from './PropertiesPanel';
import CodeEditor from './CodeEditor';
import PreviewMode from './PreviewMode';
import SlyntosStudio from './SlyntosStudio';
import VersionHistory from './VersionHistory';
import PublishingDialog from './PublishingDialog';

export interface WebElement {
  id: string;
  type: 'container' | 'text' | 'heading' | 'button' | 'image' | 'video' | 'form' | 'input' | 'card' | 'nav' | 'footer' | 'section';
  content?: string;
  styles: {
    position?: string;
    width?: string;
    height?: string;
    margin?: string;
    padding?: string;
    backgroundColor?: string;
    color?: string;
    fontSize?: string;
    fontWeight?: string;
    fontFamily?: string;
    borderRadius?: string;
    boxShadow?: string;
    border?: string;
    opacity?: number;
    transform?: string;
    transition?: string;
    zIndex?: number;
    display?: string;
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
    gap?: string;
    gridTemplateColumns?: string;
    gridTemplateRows?: string;
    textAlign?: string;
    lineHeight?: string;
    letterSpacing?: string;
    textTransform?: string;
    objectFit?: string;
    cursor?: string;
    overflow?: string;
    backdropFilter?: string;
    backgroundImage?: string;
    backgroundSize?: string;
    backgroundPosition?: string;
    backgroundRepeat?: string;
    className?: string;
    left?: string;
    top?: string;
  };
  responsive?: {
    mobile?: Partial<WebElement['styles']>;
    tablet?: Partial<WebElement['styles']>;
    desktop?: Partial<WebElement['styles']>;
  };
  children?: WebElement[];
  attributes?: Record<string, string>;
  events?: {
    onClick?: string;
    onHover?: string;
    onScroll?: string;
  };
  animations?: {
    type: 'fade' | 'slide' | 'bounce' | 'pulse' | 'rotate' | 'scale';
    duration: number;
    delay: number;
    infinite?: boolean;
  }[];
  seo?: {
    alt?: string;
    title?: string;
    ariaLabel?: string;
    role?: string;
  };
}

export interface WebPage {
  id: string;
  name: string;
  path: string;
  elements: WebElement[];
  styles: {
    global: Record<string, string>;
    fonts: string[];
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      [key: string]: string;
    };
    breakpoints: {
      mobile: number;
      tablet: number;
      desktop: number;
    };
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    twitterCard?: string;
    canonical?: string;
    robots?: string;
  };
  settings: {
    favicon?: string;
    customCode?: {
      head?: string;
      body?: string;
      css?: string;
      js?: string;
    };
    analytics?: {
      google?: string;
      facebook?: string;
      custom?: string;
    };
    performance?: {
      lazyLoad: boolean;
      minify: boolean;
      compress: boolean;
    };
  };
  metadata: {
    createdAt: number;
    updatedAt: number;
    version: number;
    author?: string;
  };
}

export interface WebProject {
  id: string;
  name: string;
  description?: string;
  pages: WebPage[];
  assets: {
    images: Array<{ id: string; url: string; name: string; size: number; type: string }>;
    fonts: Array<{ name: string; url: string; weight?: string; style?: string }>;
    icons: Array<{ name: string; component: string }>;
    videos: Array<{ id: string; url: string; name: string }>;
  };
  settings: {
    domain?: string;
    customDomain?: string;
    ssl: boolean;
    cdn: boolean;
    backup: boolean;
    password?: string;
  };
  version: number;
  publishedUrl?: string;
  lastPublished?: number;
  collaborators?: Array<{ email: string; role: 'viewer' | 'editor' | 'admin' }>;
}

interface WebsiteBuilderProps {
  project?: WebProject;
  onSave: (project: WebProject) => void;
  onPublish?: (url: string) => void;
  user?: any;
}

const WebsiteBuilder: React.FC<WebsiteBuilderProps> = ({
  project: initialProject,
  onSave,
  onPublish,
  user
}) => {
  // State
  const [project, setProject] = useState<WebProject>(() => {
    if (initialProject) return initialProject;
    
    // Create default project
    return {
      id: `proj_${Date.now()}`,
      name: 'Untitled Project',
      pages: [{
        id: `page_${Date.now()}`,
        name: 'Home',
        path: '/',
        elements: [],
        styles: {
          global: {
            fontFamily: 'Inter, system-ui, sans-serif',
            backgroundColor: '#ffffff',
            color: '#000000',
          },
          fonts: ['Inter'],
          colors: {
            primary: '#3b82f6',
            secondary: '#10b981',
            accent: '#f59e0b',
            background: '#ffffff',
            text: '#000000',
          },
          breakpoints: {
            mobile: 640,
            tablet: 1024,
            desktop: 1280,
          },
        },
        seo: {
          title: 'Home | My Slyntos Site',
          description: 'Created with Slyntos Web Studio',
          keywords: ['slyntos', 'website'],
        },
        settings: {},
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: 1,
        },
      }],
      assets: {
        images: [],
        fonts: [{ name: 'Inter', url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap' }],
        icons: [],
        videos: [],
      },
      settings: {
        ssl: true,
        cdn: true,
        backup: true,
      },
      version: 1,
    };
  });

  const [currentPage, setCurrentPage] = useState<WebPage>(project.pages[0]);
  const [selectedElement, setSelectedElement] = useState<WebElement | null>(null);
  const [viewMode, setViewMode] = useState<'design' | 'code' | 'preview'>('design');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [showElementLibrary, setShowElementLibrary] = useState(true);
  const [showProperties, setShowProperties] = useState(true);
  const [showSlyntosStudio, setShowSlyntosStudio] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showPublishingDialog, setShowPublishingDialog] = useState(false);
  const [showFigmaImport, setShowFigmaImport] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [history, setHistory] = useState<WebProject[]>([]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [copiedElement, setCopiedElement] = useState<WebElement | null>(null);

  // Save to history on changes
  useEffect(() => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(project)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [project]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setProject(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setProject(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [history, historyIndex]);

  const updatePage = (updatedPage: WebPage) => {
    const updatedPages = project.pages.map(p => 
      p.id === updatedPage.id ? updatedPage : p
    );
    setCurrentPage(updatedPage);
    setProject({
      ...project,
      pages: updatedPages,
      version: project.version + 1,
    });
  };

  const deleteElement = useCallback((elementId: string) => {
    const deleteFromTree = (elements: WebElement[]): WebElement[] => {
      return elements.filter(el => {
        if (el.id === elementId) return false;
        if (el.children) {
          el.children = deleteFromTree(el.children);
        }
        return true;
      });
    };

    const updatedPage = {
      ...currentPage,
      elements: deleteFromTree(currentPage.elements),
    };
    updatePage(updatedPage);
    setSelectedElement(null);
  }, [currentPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        }
        if (e.key === 'Z' && e.shiftKey) {
          e.preventDefault();
          redo();
        }
        if (e.key === 's') {
          e.preventDefault();
          onSave(project);
        }
        if (e.key === 'c' && selectedElement) {
          e.preventDefault();
          setCopiedElement(JSON.parse(JSON.stringify(selectedElement)));
        }
        if (e.key === 'v' && copiedElement) {
          e.preventDefault();
          const newElement = {
            ...copiedElement,
            id: `el_${Date.now()}`,
          };
          const updatedPage = {
            ...currentPage,
            elements: [...currentPage.elements, newElement],
          };
          updatePage(updatedPage);
        }
      }
      if (e.key === 'Delete' && selectedElement) {
        deleteElement(selectedElement.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, selectedElement, copiedElement, project, currentPage, onSave, deleteElement]);

  const getDefaultStyles = (type: WebElement['type']): WebElement['styles'] => {
    const base = {
      transition: 'all 0.3s ease',
    };

    switch (type) {
      case 'container':
        return {
          ...base,
          width: '100%',
          padding: '20px',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px dashed #94a3b8',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        };
      case 'section':
        return {
          ...base,
          width: '100%',
          padding: '40px 20px',
          backgroundColor: '#ffffff',
        };
      case 'heading':
        return {
          ...base,
          fontSize: '32px',
          fontWeight: '700',
          color: '#000000',
          margin: '0 0 16px 0',
          fontFamily: 'Inter, sans-serif',
        };
      case 'text':
        return {
          ...base,
          fontSize: '16px',
          lineHeight: '1.6',
          color: '#334155',
          margin: '0 0 12px 0',
        };
      case 'button':
        return {
          ...base,
          padding: '12px 24px',
          backgroundColor: '#3b82f6',
          color: '#ffffff',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          border: 'none',
          cursor: 'pointer',
          display: 'inline-block',
          textAlign: 'center',
        };
      case 'image':
        return {
          ...base,
          width: '100%',
          height: 'auto',
          borderRadius: '8px',
          objectFit: 'cover',
        };
      case 'card':
        return {
          ...base,
          padding: '24px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        };
      default:
        return base;
    }
  };

  const getDefaultContent = (type: WebElement['type']): string => {
    switch (type) {
      case 'heading': return 'New Heading';
      case 'text': return 'Add your text here. Click to edit.';
      case 'button': return 'Click Me';
      case 'image': return 'https://via.placeholder.com/400x300';
      default: return '';
    }
  };

  const addElement = useCallback((elementType: WebElement['type'], position?: { x: number; y: number }) => {
    const newElement: WebElement = {
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: elementType,
      styles: getDefaultStyles(elementType),
      content: getDefaultContent(elementType),
      seo: {},
    };

    if (position) {
      newElement.styles.position = 'absolute';
      newElement.styles.left = `${position.x}px`;
      newElement.styles.top = `${position.y}px`;
    }

    const updatedPage = {
      ...currentPage,
      elements: [...currentPage.elements, newElement],
    };
    updatePage(updatedPage);
    setSelectedElement(newElement);
  }, [currentPage]);

  const updateElement = useCallback((elementId: string, updates: Partial<WebElement>) => {
    const updateElementInTree = (elements: WebElement[]): WebElement[] => {
      return elements.map(el => {
        if (el.id === elementId) {
          return { ...el, ...updates };
        }
        if (el.children) {
          return { ...el, children: updateElementInTree(el.children) };
        }
        return el;
      });
    };

    const updatedPage = {
      ...currentPage,
      elements: updateElementInTree(currentPage.elements),
    };
    updatePage(updatedPage);
  }, [currentPage]);

  const duplicateElement = useCallback((element: WebElement) => {
    const newElement = {
      ...JSON.parse(JSON.stringify(element)),
      id: `el_${Date.now()}`,
    };
    const updatedPage = {
      ...currentPage,
      elements: [...currentPage.elements, newElement],
    };
    updatePage(updatedPage);
  }, [currentPage]);

  const generateHTML = useCallback((): string => {
    const renderElement = (el: WebElement): string => {
      const styles = Object.entries(el.styles)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => {
          const cssKey = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase());
          return `${cssKey}: ${value};`;
        })
        .join(' ');

      const attrs = el.attributes 
        ? Object.entries(el.attributes).map(([k, v]) => `${k}="${v}"`).join(' ')
        : '';

      const seoAttrs = el.seo
        ? Object.entries(el.seo).map(([k, v]) => {
            const attrName = k === 'ariaLabel' ? 'aria-label' : k;
            return `${attrName}="${v}"`;
          }).join(' ')
        : '';

      const children = el.children ? el.children.map(child => renderElement(child)).join('\n') : '';

      switch (el.type) {
        case 'container':
        case 'section':
        case 'card':
          return `<div id="${el.id}" style="${styles}" ${attrs} ${seoAttrs}>\n${children || el.content || ''}\n</div>`;
        case 'heading':
          return `<h2 id="${el.id}" style="${styles}" ${attrs} ${seoAttrs}>${el.content || ''}</h2>`;
        case 'text':
          return `<p id="${el.id}" style="${styles}" ${attrs} ${seoAttrs}>${el.content || ''}</p>`;
        case 'button':
          return `<button id="${el.id}" style="${styles}" ${attrs} ${seoAttrs}>${el.content || ''}</button>`;
        case 'image':
          return `<img id="${el.id}" src="${el.content || ''}" style="${styles}" ${attrs} ${seoAttrs}>`;
        default:
          return `<div id="${el.id}" style="${styles}" ${attrs} ${seoAttrs}>${el.content || ''}</div>`;
      }
    };

    const page = currentPage;
    const elements = page.elements.map(el => renderElement(el)).join('\n  ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.seo.title}</title>
    <meta name="description" content="${page.seo.description}">
    <meta name="keywords" content="${page.seo.keywords.join(', ')}">
    ${page.seo.ogImage ? `<meta property="og:image" content="${page.seo.ogImage}">` : ''}
    ${page.seo.ogTitle ? `<meta property="og:title" content="${page.seo.ogTitle}">` : ''}
    ${page.seo.ogDescription ? `<meta property="og:description" content="${page.seo.ogDescription}">` : ''}
    ${page.seo.twitterCard ? `<meta name="twitter:card" content="${page.seo.twitterCard}">` : ''}
    ${page.seo.canonical ? `<link rel="canonical" href="${page.seo.canonical}">` : ''}
    ${page.seo.robots ? `<meta name="robots" content="${page.seo.robots}">` : ''}
    ${page.settings.favicon ? `<link rel="icon" href="${page.settings.favicon}">` : ''}
    ${project.assets.fonts.map(f => `<link href="${f.url}" rel="stylesheet">`).join('\n    ')}
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: ${page.styles.global.fontFamily || 'Inter, sans-serif'};
            background-color: ${page.styles.global.backgroundColor || '#ffffff'};
            color: ${page.styles.global.color || '#000000'};
            line-height: 1.5;
        }
        ${page.settings.customCode?.css || ''}
        @media (max-width: ${page.styles.breakpoints.mobile}px) {
            /* Mobile styles */
        }
        @media (min-width: ${page.styles.breakpoints.mobile + 1}px) and (max-width: ${page.styles.breakpoints.tablet}px) {
            /* Tablet styles */
        }
        @media (min-width: ${page.styles.breakpoints.tablet + 1}px) {
            /* Desktop styles */
        }
    </style>
    ${page.settings.customCode?.head || ''}
</head>
<body>
    ${elements}
    ${page.settings.customCode?.body || ''}
    
    <script>
        // Slyntos Runtime v1.0
        (function() {
            console.log('Slyntos Runtime Initialized');
            
            // Handle Actions
            document.addEventListener('click', function(e) {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                
                const actionStr = target.getAttribute('data-action');
                const [action, value] = actionStr.split(':');
                
                console.log('Executing action:', action, value);
                
                switch(action) {
                    case 'alert':
                        alert(value || 'Action triggered!');
                        break;
                    case 'navigate':
                        if (value.startsWith('http')) {
                            window.open(value, '_blank');
                        } else {
                            console.log('Navigating to:', value);
                            // In a real app, this would change the page
                            alert('Navigating to ' + value + ' (Simulation)');
                        }
                        break;
                    case 'submit':
                        const formId = value;
                        const form = document.getElementById(formId);
                        if (form) {
                            const formData = new FormData(form);
                            const data = Object.fromEntries(formData.entries());
                            console.log('Form submitted:', data);
                            
                            // Simulate Database Save
                            const dbName = form.getAttribute('data-db') || 'default_db';
                            const existing = JSON.parse(localStorage.getItem(dbName) || '[]');
                            existing.push({ ...data, _id: Date.now() });
                            localStorage.setItem(dbName, JSON.stringify(existing));
                            
                            alert('Data saved successfully to ' + dbName + '!');
                            form.reset();
                        }
                        break;
                }
            });
            
            // Handle Data Sources (Simulation)
            const dataContainers = document.querySelectorAll('[data-source]');
            dataContainers.forEach(container => {
                const source = container.getAttribute('data-source');
                const dbName = container.getAttribute('data-db') || 'default_db';
                
                if (source === 'list') {
                    const data = JSON.parse(localStorage.getItem(dbName) || '[]');
                    if (data.length > 0) {
                        container.innerHTML = data.map(item => \`
                            <div style="padding: 1rem; border-bottom: 1px solid #eee;">
                                \${Object.entries(item).filter(([k]) => !k.startsWith('_')).map(([k, v]) => \`
                                    <div><strong>\${k}:</strong> \${v}</div>
                                \`).join('')}
                            </div>
                        \`).join('');
                    } else {
                        container.innerHTML = '<div style="padding: 1rem; color: #999;">No data found in ' + dbName + '</div>';
                    }
                }
            });
        })();
        
        ${page.settings.customCode?.js || ''}
    </script>
    ${page.settings.analytics?.google ? `
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${page.settings.analytics.google}"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${page.settings.analytics.google}');
    </script>
    ` : ''}
</body>
</html>`;
  }, [currentPage, project]);

  const generateCSS = useCallback((): string => {
    const page = currentPage;
    return `/* Generated by Slyntos Web Studio */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: ${page.styles.global.fontFamily || 'Inter, sans-serif'};
    background-color: ${page.styles.global.backgroundColor || '#ffffff'};
    color: ${page.styles.global.color || '#000000'};
    line-height: 1.5;
}

/* Custom animations */
@keyframes fade {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slide {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

@keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes scale {
    from { transform: scale(1); }
    to { transform: scale(1.1); }
}

/* Responsive design */
@media (max-width: ${page.styles.breakpoints.mobile}px) {
    /* Mobile styles */
}

@media (min-width: ${page.styles.breakpoints.mobile + 1}px) and (max-width: ${page.styles.breakpoints.tablet}px) {
    /* Tablet styles */
}

@media (min-width: ${page.styles.breakpoints.tablet + 1}px) {
    /* Desktop styles */
}

${page.settings.customCode?.css || ''}
`;
  }, [currentPage]);

  const generateJS = useCallback((): string => {
    return `// Generated by Slyntos Web Studio
document.addEventListener('DOMContentLoaded', () => {
    console.log('Slyntos site loaded!');
    
    // Add interactive features
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            // Add custom interactions
        });
    });
});

${currentPage.settings.customCode?.js || ''}
`;
  }, [currentPage]);

  const exportProject = useCallback(() => {
    // Create zip file
    import('jszip').then(JSZip => {
      const zip = new JSZip.default();
      
      // Add files
      zip.file('index.html', generateHTML());
      zip.file('styles.css', generateCSS());
      zip.file('script.js', generateJS());
      
      // Add assets
      project.assets.images.forEach(img => {
        zip.file(`assets/images/${img.name}`, img.url, { base64: true });
      });
      
      // Generate zip
      zip.generateAsync({ type: 'blob' }).then(content => {
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.name}.zip`;
        a.click();
        URL.revokeObjectURL(url);
      });
    });
  }, [project, generateHTML, generateCSS, generateJS]);

  const publishToVercel = useCallback(async () => {
    setShowPublishingDialog(true);
    // In production, this would call Vercel API
    // The dialog handles its own progress and success state now
  }, []);

  const boostStyles = () => {
    const boostElement = (el: WebElement): WebElement => ({
      ...el,
      styles: {
        ...el.styles,
        borderRadius: el.styles.borderRadius || '1rem',
        boxShadow: el.styles.boxShadow || '0 10px 30px -10px rgba(0,0,0,0.3)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      children: el.children ? el.children.map(boostElement) : undefined
    });

    const updatedPage = {
      ...currentPage,
      elements: currentPage.elements.map(boostElement)
    };
    updatePage(updatedPage);
  };

  const importFromFigma = async (url: string) => {
    // Placeholder for Figma API integration
    // In a real app, this would fetch the Figma file and convert it to WebElements
    console.log('Importing from Figma:', url);
    const mockElements: WebElement[] = [
      {
        id: `figma_${Date.now()}`,
        type: 'section',
        content: '',
        styles: { padding: '4rem', backgroundColor: '#f8fafc' },
        children: [
          {
            id: `figma_h_${Date.now()}`,
            type: 'heading',
            content: 'Imported from Figma',
            styles: { fontSize: '3rem', fontWeight: '900', textAlign: 'center' }
          }
        ]
      }
    ];
    const updatedPage = {
      ...currentPage,
      elements: [...currentPage.elements, ...mockElements]
    };
    updatePage(updatedPage);
    setShowFigmaImport(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 text-white overflow-hidden">
      {/* Top Bar */}
      <div className="border-b border-gray-800 bg-gray-900/95 backdrop-blur-xl px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Slyntos Studio
            </h1>
            <span className="px-2 py-0.5 bg-gray-800 rounded-full text-xs text-gray-400">
              Beta
            </span>
          </div>
          
          <div className="h-6 w-px bg-gray-800" />
          
          <div className="flex items-center gap-2">
            <button
              onClick={undo}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              title="Undo (Ctrl+Z)"
              disabled={historyIndex === 0}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            <button
              onClick={redo}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
              title="Redo (Ctrl+Shift+Z)"
              disabled={historyIndex === history.length - 1}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
              </svg>
            </button>
          </div>

          <div className="h-6 w-px bg-gray-800" />

          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('design')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'design' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layout className="w-3.5 h-3.5" />
              Design
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'code' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Code
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                viewMode === 'preview' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>

          <div className="h-6 w-px bg-gray-800" />

          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`p-1.5 rounded-lg transition-all ${
                deviceMode === 'desktop' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
              title="Desktop"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-1.5 rounded-lg transition-all ${
                deviceMode === 'tablet' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
              title="Tablet"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`p-1.5 rounded-lg transition-all ${
                deviceMode === 'mobile' ? 'bg-white text-black' : 'text-gray-400 hover:text-white'
              }`}
              title="Mobile"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom(Math.min(200, zoom + 10))}
              className="px-2 py-1 text-xs bg-gray-800 rounded-l-lg hover:bg-gray-700"
            >
              +
            </button>
            <span className="text-xs w-12 text-center">{zoom}%</span>
            <button
              onClick={() => setZoom(Math.max(50, zoom - 10))}
              className="px-2 py-1 text-xs bg-gray-800 rounded-r-lg hover:bg-gray-700"
            >
              -
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={boostStyles}
            className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-all"
            title="Boost Styles"
          >
            <Zap className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowFigmaImport(true)}
            className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-all"
            title="Import from Figma"
          >
            <Figma className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowVersionHistory(true)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Version History"
          >
            <History className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setShowSlyntosStudio(true)}
            className="p-2 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-all"
            title="Slyntos Studio"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          
          <button
            onClick={exportProject}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Export"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onSave(project)}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Save (Ctrl+S)"
          >
            <Save className="w-4 h-4" />
          </button>
          
          <button
            onClick={publishToVercel}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:from-blue-600 hover:to-purple-600 transition-all flex items-center gap-2"
          >
            <Globe className="w-4 h-4" />
            Publish
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Element Library */}
        {showElementLibrary && (
          <div className="w-72 border-r border-gray-800 bg-gray-900/50 flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-medium">Components</h3>
              <button
                onClick={() => setShowElementLibrary(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
            <ElementLibrary
              onAddElement={addElement}
              onShowSlyntosStudio={() => setShowSlyntosStudio(true)}
            />
          </div>
        )}

        {!showElementLibrary && (
          <button
            onClick={() => setShowElementLibrary(true)}
            className="absolute left-4 top-24 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Center - Canvas */}
        <div className="flex-1 overflow-auto bg-gray-800/30">
          {viewMode === 'design' && (
            <WebCanvas
              page={currentPage}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onUpdateElement={updateElement}
              onDeleteElement={deleteElement}
              onDuplicateElement={duplicateElement}
              deviceMode={deviceMode}
              zoom={zoom}
              gridEnabled={gridEnabled}
              snapToGrid={snapToGrid}
              onDropElement={(type, position) => addElement(type as any, position)}
            />
          )}
          {viewMode === 'code' && (
            <CodeEditor
              html={generateHTML()}
              css={generateCSS()}
              js={generateJS()}
              onChange={(code, type) => {
                const updatedPage = {
                  ...currentPage,
                  settings: {
                    ...currentPage.settings,
                    customCode: {
                      ...currentPage.settings.customCode,
                      [type]: code,
                    },
                  },
                };
                updatePage(updatedPage);
              }}
            />
          )}
          {viewMode === 'preview' && (
            <PreviewMode
              html={generateHTML()}
              css={generateCSS()}
              js={generateJS()}
              deviceMode={deviceMode}
            />
          )}
        </div>

        {/* Right Sidebar - Properties */}
        {showProperties && (
          <div className="w-80 border-l border-gray-800 bg-gray-900/50 flex flex-col">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-sm font-medium">Properties</h3>
              <button
                onClick={() => setShowProperties(false)}
                className="p-1 text-gray-400 hover:text-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <PropertiesPanel
              element={selectedElement}
              page={currentPage}
              onUpdateElement={(updates) => selectedElement && updateElement(selectedElement.id, updates)}
              onUpdatePage={updatePage}
              onDeleteElement={() => selectedElement && deleteElement(selectedElement.id)}
              onDuplicateElement={() => selectedElement && duplicateElement(selectedElement)}
            />
          </div>
        )}

        {!showProperties && (
          <button
            onClick={() => setShowProperties(true)}
            className="absolute right-4 top-24 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur-xl px-4 py-2 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setGridEnabled(!gridEnabled)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${
                gridEnabled ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/5'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded ${
                snapToGrid ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-white/5'
              }`}
              disabled={!gridEnabled}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5l4 4m0-4L5 13m10-8l4 4m0-4L15 13" />
              </svg>
              <span>Snap</span>
            </button>
          </div>
          
          <div className="h-4 w-px bg-gray-800" />
          
          <div className="flex items-center gap-2">
            <span>Pages:</span>
            <select
              value={currentPage.id}
              onChange={(e) => {
                const page = project.pages.find(p => p.id === e.target.value);
                if (page) setCurrentPage(page);
              }}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
            >
              {project.pages.map(page => (
                <option key={page.id} value={page.id}>{page.name}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const newPage: WebPage = {
                  id: `page_${Date.now()}`,
                  name: `Page ${project.pages.length + 1}`,
                  path: `/page-${project.pages.length + 1}`,
                  elements: [],
                  styles: { ...currentPage.styles },
                  seo: {
                    title: `Page ${project.pages.length + 1} | My Slyntos Site`,
                    description: '',
                    keywords: [],
                  },
                  settings: {},
                  metadata: {
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    version: 1,
                  },
                };
                setProject({
                  ...project,
                  pages: [...project.pages, newPage],
                });
                setCurrentPage(newPage);
              }}
              className="p-1 text-gray-400 hover:text-white hover:bg-white/5 rounded"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Elements:</span>
            <span className="text-white">{currentPage.elements.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-gray-600">Version:</span>
            <span className="text-white">{project.version}</span>
          </div>
          {project.publishedUrl && (
            <a
              href={project.publishedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Live Site
            </a>
          )}
        </div>
      </div>

      {/* Slyntos Studio Modal */}
      <SlyntosStudio
        isOpen={showSlyntosStudio}
        onClose={() => setShowSlyntosStudio(false)}
        onGenerate={(elements) => {
          const updatedPage = {
            ...currentPage,
            elements: [...currentPage.elements, ...elements],
          };
          updatePage(updatedPage);
          setShowSlyntosStudio(false);
        }}
      />

      {/* Version History Modal */}
      <VersionHistory
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        history={history}
        onRestore={(version) => {
          setProject(version);
          setShowVersionHistory(false);
        }}
      />

      {/* Figma Import Modal */}
      {showFigmaImport && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-md" onClick={() => setShowFigmaImport(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-[2rem] p-8 space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Figma to Website</h3>
              <p className="text-xs text-gray-400">Paste your Figma file URL to convert your design into a live website.</p>
            </div>
            <input 
              type="text" 
              placeholder="https://www.figma.com/file/..." 
              className="w-full bg-gray-800 border-none rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') importFromFigma((e.target as HTMLInputElement).value);
              }}
            />
            <button 
              onClick={() => setShowFigmaImport(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
            >
              Import Design
            </button>
          </div>
        </div>
      )}

      {/* Publishing Dialog */}
      <PublishingDialog
        isOpen={showPublishingDialog}
        onClose={() => setShowPublishingDialog(false)}
        projectName={project.name}
        onPublish={onPublish}
        html={generateHTML()}
      />
    </div>
  );
};

export default WebsiteBuilder;
