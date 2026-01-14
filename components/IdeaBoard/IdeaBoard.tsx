import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Move, Share2, GripHorizontal, ArrowRightCircle, Loader2, Radio } from 'lucide-react';
import { IdeaNode, IdeaConnection, Channel } from '../../types';
import { cn } from '../../utils/cn';
import { toPng } from 'html-to-image';

interface IdeaBoardProps {
  nodes: IdeaNode[];
  connections: IdeaConnection[];
  channels: Channel[];
  isLive: boolean;
  onNodesChange: (nodes: IdeaNode[]) => void;
  onConnectionsChange: (connections: IdeaConnection[]) => void;
  onShare: (channelId: string, snapshot?: string) => void;
  onToggleLive: () => void;
}

interface DragState {
    type: 'move' | 'resize' | 'connect';
    id: string; // node id
    startX: number;
    startY: number;
    initialX?: number;
    initialY?: number;
    initialW?: number;
    initialH?: number;
}

const IdeaBoard: React.FC<IdeaBoardProps> = ({ 
  nodes, 
  connections, 
  channels,
  isLive,
  onNodesChange, 
  onConnectionsChange, 
  onShare,
  onToggleLive
}) => {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [tempConnection, setTempConnection] = useState<{x1: number, y1: number, x2: number, y2: number} | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  const addNode = () => {
    // Center of the current view (approximate if scrolled)
    const scrollX = canvasRef.current?.scrollLeft || 0;
    const scrollY = canvasRef.current?.scrollTop || 0;
    const viewW = canvasRef.current?.clientWidth || 800;
    const viewH = canvasRef.current?.clientHeight || 600;

    const newNode: IdeaNode = {
      id: Date.now().toString(),
      x: scrollX + viewW / 2 - 100,
      y: scrollY + viewH / 2 - 60,
      width: 200,
      height: 120,
      content: '',
      color: '#ffffff'
    };
    onNodesChange([...nodes, newNode]);
  };

  const performShare = async (channelId: string) => {
      setIsShareOpen(false);
      setIsCapturing(true);
      
      let snapshot = undefined;
      
      if (canvasRef.current) {
          try {
              // Capture the board, excluding the toolbar
              snapshot = await toPng(canvasRef.current, {
                  cacheBust: true,
                  backgroundColor: '#f9fafb',
                  filter: (node) => {
                      if (node instanceof HTMLElement && node.classList.contains('exclude-from-snap')) {
                          return false;
                      }
                      return true;
                  }
              });
          } catch (e) {
              console.error("Failed to capture board snapshot", e);
          }
      }
      
      setIsCapturing(false);
      onShare(channelId, snapshot);
  };

  // --- MOUSE HANDLERS ---

  const handleMouseDown = (e: React.MouseEvent, id: string, type: 'move' | 'resize' | 'connect') => {
      e.stopPropagation();
      if (e.button !== 0) return;

      const node = nodes.find(n => n.id === id);
      if (!node) return;

      if (type === 'move') {
          // Select on click
          if (!e.shiftKey && !selectedNodeIds.includes(id)) {
              setSelectedNodeIds([id]);
          } else if (e.shiftKey) {
              setSelectedNodeIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
          }
      }

      setDragState({
          type,
          id,
          startX: e.clientX,
          startY: e.clientY,
          initialX: node.x,
          initialY: node.y,
          initialW: node.width,
          initialH: node.height
      });

      if (type === 'connect') {
          const rect = (e.target as HTMLElement).getBoundingClientRect();
          const canvasRect = canvasRef.current?.getBoundingClientRect();
          if (canvasRect) {
              // Calculate relative to canvas content origin
              const scrollLeft = canvasRef.current?.scrollLeft || 0;
              const scrollTop = canvasRef.current?.scrollTop || 0;

              const startX = (rect.left + rect.width/2 - canvasRect.left) + scrollLeft;
              const startY = (rect.top + rect.height/2 - canvasRect.top) + scrollTop;
              setTempConnection({ x1: startX, y1: startY, x2: startX, y2: startY });
          }
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!dragState) return;
      if (!canvasRef.current) return;

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      if (dragState.type === 'move') {
          const newNodes = nodes.map(n => {
              if (selectedNodeIds.includes(n.id)) {
                   if (n.id === dragState.id) {
                       return { 
                           ...n, 
                           x: (dragState.initialX || 0) + dx, 
                           y: (dragState.initialY || 0) + dy 
                       };
                   }
              }
              return n;
          });
          onNodesChange(newNodes);
      } 
      else if (dragState.type === 'resize') {
          onNodesChange(nodes.map(n => {
              if (n.id === dragState.id) {
                  return {
                      ...n,
                      width: Math.max(150, (dragState.initialW || 0) + dx),
                      height: Math.max(80, (dragState.initialH || 0) + dy)
                  };
              }
              return n;
          }));
      }
      else if (dragState.type === 'connect') {
          if (tempConnection) {
              const canvasRect = canvasRef.current.getBoundingClientRect();
              const scrollLeft = canvasRef.current.scrollLeft;
              const scrollTop = canvasRef.current.scrollTop;
              setTempConnection({
                  ...tempConnection,
                  x2: (e.clientX - canvasRect.left) + scrollLeft,
                  y2: (e.clientY - canvasRect.top) + scrollTop
              });
          }
      }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
      if (dragState?.type === 'connect') {
           const el = document.elementFromPoint(e.clientX, e.clientY);
           const targetNodeEl = el?.closest('[data-node-id]');
           if (targetNodeEl) {
               const targetId = targetNodeEl.getAttribute('data-node-id');
               if (targetId && targetId !== dragState.id) {
                   // Create connection
                   const outgoingCount = connections.filter(c => c.from === dragState.id).length;
                   if (outgoingCount < 3) {
                       const exists = connections.find(c => (c.from === dragState.id && c.to === targetId) || (c.from === targetId && c.to === dragState.id));
                       if (!exists) {
                           onConnectionsChange([...connections, {
                               id: Date.now().toString(),
                               from: dragState.id,
                               to: targetId
                           }]);
                       }
                   } else {
                       alert("Max 3 connections allowed from a single node.");
                   }
               }
           }
      }

      setDragState(null);
      setTempConnection(null);
  };

  const handleCanvasClick = () => {
    setSelectedNodeIds([]);
    setIsShareOpen(false);
  };

  const deleteNode = (id: string) => {
      onNodesChange(nodes.filter(n => n.id !== id));
      onConnectionsChange(connections.filter(c => c.from !== id && c.to !== id));
      setSelectedNodeIds(prev => prev.filter(i => i !== id));
  };

  const updateNodeContent = (id: string, content: string) => {
      onNodesChange(nodes.map(n => n.id === id ? { ...n, content } : n));
  };

  // Ensure SVG covers all nodes + plenty of space
  const maxX = nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0);
  const maxY = nodes.reduce((max, n) => Math.max(max, n.y + n.height), 0);
  const svgWidth = Math.max(maxX + 500, 3000); 
  const svgHeight = Math.max(maxY + 500, 3000);

  return (
    <div 
        ref={canvasRef}
        className="flex-1 h-full bg-[#f9fafb] relative overflow-auto select-none"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleCanvasClick}
    >
        {/* Dotted Background */}
        <div className="absolute inset-0 opacity-[0.4]" 
             style={{ 
                 backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)', 
                 backgroundSize: '24px 24px',
                 width: svgWidth,
                 height: svgHeight
             }}>
        </div>

        {/* Toolbar */}
        <div className="sticky top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 w-fit pointer-events-auto exclude-from-snap bg-white/80 backdrop-blur p-1 rounded-full border border-slate-200 shadow-sm">
          <button onClick={addNode} className="flex items-center gap-1 px-4 py-2 bg-black text-white rounded-full text-sm font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <Plus size={16} /> Add Idea
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          
          {/* Live Sync Toggle */}
          <button 
             onClick={(e) => { e.stopPropagation(); onToggleLive(); }}
             className={cn(
                 "flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold transition-all border",
                 isLive 
                   ? "bg-red-50 text-red-600 border-red-200 animate-pulse" 
                   : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
             )}
             title={isLive ? "Broadcasting changes to peers" : "Enable Live Collaboration"}
          >
             <Radio size={14} className={cn(isLive && "fill-current")} />
             {isLive ? "LIVE SYNC" : "Offline"}
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>
          
          <div className="relative">
             <button 
                onClick={(e) => { e.stopPropagation(); setIsShareOpen(!isShareOpen); }}
                className="bg-white hover:bg-slate-50 border border-slate-200 p-2 rounded-full text-slate-600 hover:text-black transition-colors"
                disabled={isCapturing}
                title="Share Snapshot"
             >
                {isCapturing ? <Loader2 size={18} className="animate-spin"/> : <Share2 size={18} />}
             </button>
             {isShareOpen && (
               <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 flex flex-col gap-0.5">
                  <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Share Snapshot to Channel</div>
                  {channels.map(channel => (
                     <button
                       key={channel.id}
                       onClick={(e) => { e.stopPropagation(); performShare(channel.id); }}
                       className="text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 rounded-lg flex items-center justify-between group"
                     >
                       <span># {channel.name}</span>
                       <Share2 size={12} className="opacity-0 group-hover:opacity-100 text-slate-400" />
                     </button>
                  ))}
               </div>
             )}
          </div>
        </div>

        {/* Connections Layer */}
        <svg 
            className="absolute top-0 left-0 pointer-events-none z-0"
            style={{ width: svgWidth, height: svgHeight }}
        >
            {connections.map(conn => {
                const start = nodes.find(n => n.id === conn.from);
                const end = nodes.find(n => n.id === conn.to);
                if (!start || !end) return null;
                // Calculate centers
                const x1 = start.x + start.width/2; 
                const y1 = start.y + start.height/2; 
                const x2 = end.x + end.width/2;
                const y2 = end.y + end.height/2;

                return (
                    <line 
                        key={conn.id}
                        x1={x1} y1={y1} x2={x2} y2={y2}
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                    />
                );
            })}
            {/* Temporary Dragging Line */}
            {tempConnection && (
                <line 
                    x1={tempConnection.x1} 
                    y1={tempConnection.y1} 
                    x2={tempConnection.x2} 
                    y2={tempConnection.y2} 
                    stroke="#3b82f6" 
                    strokeWidth="2" 
                    strokeDasharray="4 4"
                />
            )}
        </svg>

        {/* Nodes Layer */}
        {nodes.map(node => (
            <div
                key={node.id}
                data-node-id={node.id}
                style={{ 
                    left: node.x, 
                    top: node.y,
                    width: node.width,
                    height: node.height 
                }}
                className={cn(
                    "absolute bg-white rounded-xl shadow-sm border transition-shadow flex flex-col z-10 group",
                    selectedNodeIds.includes(node.id) ? "border-slate-900 ring-2 ring-slate-900/10 shadow-lg" : "border-slate-200"
                )}
            >
                {/* Header Grip */}
                <div 
                    className="h-6 shrink-0 bg-slate-50 border-b border-slate-100 rounded-t-xl cursor-grab active:cursor-grabbing flex items-center justify-between px-2"
                    onMouseDown={(e) => handleMouseDown(e, node.id, 'move')}
                >
                    <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                    </div>
                    {/* Delete Button on Hover */}
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-opacity"
                    >
                        <X size={12} />
                    </button>
                </div>
                
                {/* Content */}
                <textarea 
                    className="flex-1 w-full p-3 resize-none focus:outline-none text-sm text-slate-800 bg-transparent placeholder:text-slate-300 select-text cursor-text"
                    placeholder="Idea..."
                    value={node.content}
                    onChange={(e) => updateNodeContent(node.id, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()} // Allow text selection
                />

                {/* Connection Buttons */}
                <div 
                    className="absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 hover:border-blue-200 text-slate-400 hover:text-blue-500 z-20"
                    onMouseDown={(e) => handleMouseDown(e, node.id, 'connect')}
                    title="Drag to connect"
                >
                    <ArrowRightCircle size={14} />
                </div>
                <div 
                    className="absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-white border border-slate-200 rounded-full shadow-sm flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 hover:border-blue-200 text-slate-400 hover:text-blue-500 z-20"
                    onMouseDown={(e) => handleMouseDown(e, node.id, 'connect')}
                    title="Drag to connect"
                >
                    <ArrowRightCircle size={14} />
                </div>

                {/* Resize Handle */}
                <div 
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize opacity-0 group-hover:opacity-100 flex items-end justify-end p-1 text-slate-300 hover:text-slate-500"
                    onMouseDown={(e) => handleMouseDown(e, node.id, 'resize')}
                >
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                        <path d="M8 8H0L8 0V8Z" />
                    </svg>
                </div>
            </div>
        ))}

        {nodes.length === 0 && (
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                 <div className="text-center opacity-30">
                     <Move size={48} className="mx-auto mb-2 text-slate-400" />
                     <h3 className="text-lg font-bold text-slate-800">Empty Canvas</h3>
                     <p className="text-sm">Click "Add Idea" to start brainstorming.</p>
                 </div>
             </div>
        )}
    </div>
  );
};

export default IdeaBoard;