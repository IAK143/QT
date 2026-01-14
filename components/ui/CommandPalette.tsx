import React, { useState, useEffect, useRef } from 'react';
import { Search, Monitor, MessageSquare, Brain, FileText, Layout, Plus, X, Zap, Maximize, Minimize } from 'lucide-react';
import { cn } from '../../utils/cn';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: {
    id: string;
    label: string;
    icon: React.ReactNode;
    shortcut?: string;
    action: () => void;
  }[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, actions }) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredActions = actions.filter(action => 
    action.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setActiveIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev + 1) % filteredActions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev - 1 + filteredActions.length) % filteredActions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[activeIndex]) {
          filteredActions[activeIndex].action();
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, activeIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4 animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 animate-scale-in flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <Search size={18} className="text-slate-400" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400 text-sm h-6"
            placeholder="Type a command..."
            value={query}
            onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
          />
          <div className="flex gap-1">
             <kbd className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] font-mono text-slate-500 border border-slate-200">ESC</kbd>
          </div>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredActions.length === 0 ? (
             <div className="p-4 text-center text-sm text-slate-400">No matching commands.</div>
          ) : (
            filteredActions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => { action.action(); onClose(); }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors",
                  index === activeIndex ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                      "p-1.5 rounded-lg",
                      index === activeIndex ? "bg-white text-black shadow-sm" : "bg-slate-100 text-slate-500"
                  )}>
                      {action.icon}
                  </div>
                  <span className="font-medium">{action.label}</span>
                </div>
                {action.shortcut && (
                  <span className="text-xs text-slate-400 font-mono">{action.shortcut}</span>
                )}
              </button>
            ))
          )}
        </div>
        
        <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>QT AI Command Palette</span>
            <div className="flex gap-2">
                <span>Select <kbd className="font-sans font-bold">↵</kbd></span>
                <span>Navigate <kbd className="font-sans font-bold">↑↓</kbd></span>
            </div>
        </div>
      </div>
    </div>
  );
};
