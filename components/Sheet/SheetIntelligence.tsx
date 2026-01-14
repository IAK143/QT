import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Bot, Send, Upload, Download, Loader2, Table, Share2, Plus, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { processSheetCommand } from '../../services/geminiService';
import { Channel } from '../../types';

interface SheetIntelligenceProps {
  channels: Channel[];
  onShare: (channelId: string, sheetData: any) => void;
}

const SheetIntelligence: React.FC<SheetIntelligenceProps> = ({ channels, onShare }) => {
  // Grid State: 2D array of strings
  const [data, setData] = useState<string[][]>(Array(20).fill(Array(10).fill('')));
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isShareOpen, setIsShareOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Grid Management ---

  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = data.map((r, rIndex) => 
      rIndex === row ? r.map((c, cIndex) => cIndex === col ? value : c) : r
    );
    setData(newData);
  };

  // --- AI Logic ---

  const handleCommand = async () => {
    if (!prompt.trim()) return;
    const userPrompt = prompt;
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', text: userPrompt }]);
    setIsProcessing(true);

    try {
        const result = await processSheetCommand(data, userPrompt);
        
        // Apply Updates
        let newData = result.clear ? Array(20).fill(Array(10).fill('')) : [...data];
        
        // Ensure grid is big enough
        const maxRow = result.updates.reduce((max, u) => Math.max(max, u.row), newData.length - 1);
        const maxCol = result.updates.reduce((max, u) => Math.max(max, u.col), newData[0].length - 1);
        
        // Expand if needed (simplified expansion)
        if (maxRow >= newData.length) {
            const extraRows = Array(maxRow - newData.length + 5).fill(Array(newData[0].length).fill(''));
            newData = [...newData, ...extraRows];
        }
        // NOTE: Column expansion is tricky in this immutable structure, simplified for now:
        // Ideally we map over rows and expand them if needed.
        
        // Deep copy for mutation
        newData = newData.map(row => [...row]);

        result.updates.forEach(u => {
            if (newData[u.row]) {
                newData[u.row][u.col] = u.value;
            }
        });

        setData(newData);
        setMessages(prev => [...prev, { role: 'ai', text: result.explanation }]);

    } catch (e) {
        console.error(e);
        setMessages(prev => [...prev, { role: 'ai', text: "I encountered an error processing that request." }]);
    } finally {
        setIsProcessing(false);
    }
  };

  // --- Import / Export ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const json = XLSX.utils.sheet_to_json(ws, { header: 1 }) as string[][];
          
          // Pad to minimum size
          let formattedData = json;
          if (formattedData.length < 20) {
              const extra = Array(20 - formattedData.length).fill(Array(10).fill(''));
              formattedData = [...formattedData, ...extra];
          }
          // Ensure rows are arrays
          formattedData = formattedData.map(r => r || []);
          
          setData(formattedData);
          setMessages(prev => [...prev, { role: 'ai', text: `Imported ${file.name} successfully.` }]);
      };
      reader.readAsBinaryString(file);
  };

  const handleExport = () => {
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, "sheet_intelligence.xlsx");
  };

  const performShare = (channelId: string) => {
      onShare(channelId, { name: 'Smart Sheet', rows: data });
      setIsShareOpen(false);
      alert(`Shared to channel!`);
  };

  return (
    <div className="flex-1 flex h-full bg-[#f9fafb] overflow-hidden">
      {/* Main Grid Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-200">
          
          {/* Toolbar */}
          <div className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shrink-0">
             <div className="flex items-center gap-2">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                     <Table size={20} />
                 </div>
                 <h2 className="font-bold text-slate-900">Sheet Intelligence</h2>
             </div>

             <div className="flex items-center gap-2">
                 <button onClick={() => setData(Array(20).fill(Array(10).fill('')))} className="p-2 text-slate-500 hover:text-slate-900" title="New Sheet">
                     <Plus size={18} />
                 </button>
                 <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-slate-900" title="Import Excel">
                     <Upload size={18} />
                 </button>
                 <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .csv" onChange={handleFileUpload} />
                 <button onClick={handleExport} className="p-2 text-slate-500 hover:text-slate-900" title="Export Excel">
                     <Download size={18} />
                 </button>
                 
                 <div className="h-6 w-px bg-slate-200 mx-2" />

                 <div className="relative">
                    <button 
                        onClick={() => setIsShareOpen(!isShareOpen)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                    >
                        <Share2 size={14} /> Share
                    </button>
                    {isShareOpen && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 flex flex-col gap-0.5 z-50">
                            <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Share to Channel</div>
                            {channels.map(channel => (
                                <button
                                key={channel.id}
                                onClick={() => performShare(channel.id)}
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
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto bg-white">
              <table className="border-collapse w-full">
                  <thead>
                      <tr>
                          <th className="w-10 bg-slate-50 border border-slate-200 sticky top-0 left-0 z-20"></th>
                          {Array.from({ length: Math.max(10, data[0]?.length || 10) }).map((_, i) => (
                              <th key={i} className="min-w-[100px] bg-slate-50 border border-slate-200 text-xs font-medium text-slate-500 py-1 sticky top-0 z-10">
                                  {String.fromCharCode(65 + i)}
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody>
                      {data.map((row, rIndex) => (
                          <tr key={rIndex}>
                              <td className="bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 font-mono sticky left-0 z-10 w-10">
                                  {rIndex + 1}
                              </td>
                              {row.map((cell, cIndex) => (
                                  <td key={cIndex} className="border border-slate-200 p-0 min-w-[100px]">
                                      <input 
                                        value={cell}
                                        onChange={(e) => handleCellChange(rIndex, cIndex, e.target.value)}
                                        className="w-full h-full px-2 py-1 outline-none text-sm focus:bg-blue-50 focus:ring-2 focus:ring-blue-500/20 transition-all border-none"
                                      />
                                  </td>
                              ))}
                              {/* Render empty cells if row is shorter than header */}
                              {row.length < (data[0]?.length || 10) && Array.from({ length: (data[0]?.length || 10) - row.length }).map((_, i) => (
                                   <td key={`empty-${i}`} className="border border-slate-200 p-0 min-w-[100px]">
                                      <input className="w-full h-full px-2 py-1 outline-none text-sm border-none"/>
                                   </td>
                              ))}
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* AI Side Panel */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
         <div className="h-16 border-b border-slate-100 flex items-center px-4 gap-2 bg-slate-50/50">
             <Bot size={18} className="text-blue-600" />
             <div className="flex-1">
                 <h3 className="font-bold text-sm text-slate-900">Sheet Intelligence</h3>
                 <p className="text-[10px] text-slate-500">Mathematical Reasoning Engine</p>
             </div>
             <div className="group relative">
                 <Info size={14} className="text-slate-400 cursor-help" />
                 <div className="absolute right-0 top-full mt-2 w-48 bg-slate-800 text-white text-xs p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <p>I can create sheets, apply formulas, and solve complex math problems. Just ask.</p>
                 </div>
             </div>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
            {messages.length === 0 && (
                <div className="text-center mt-10 opacity-50 px-4">
                    <Table size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-xs text-slate-500">
                        "Create a revenue forecast..."<br/>
                        "Calculate the NPV of column B..."<br/>
                        "Add a column for Growth %..."
                    </p>
                </div>
            )}
            {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "")}>
                     <div className={cn("p-3 rounded-xl text-xs max-w-[90%] leading-relaxed shadow-sm", 
                         msg.role === 'user' ? "bg-white border border-slate-200 text-slate-800" : "bg-blue-50 border border-blue-100 text-slate-800"
                     )}>
                         {msg.text}
                     </div>
                </div>
            ))}
            {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-slate-400 ml-2">
                    <Loader2 size={12} className="animate-spin" /> Reasoning...
                </div>
            )}
            <div ref={chatEndRef} />
         </div>

         <div className="p-4 border-t border-slate-100 bg-white">
            <div className="relative">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommand(); }}}
                    placeholder="Ask Sheet Intelligence..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-blue-300 transition-all resize-none h-12 min-h-[48px]"
                />
                <button 
                    onClick={handleCommand}
                    disabled={!prompt.trim() || isProcessing}
                    className="absolute right-2 top-2 p-1.5 bg-black text-white rounded-lg hover:opacity-80 disabled:opacity-30 transition-all"
                >
                    <Send size={14} />
                </button>
            </div>
            <div className="text-[9px] text-slate-400 text-center mt-2">
                Verify important calculations manually.
            </div>
         </div>
      </div>
    </div>
  );
};

export default SheetIntelligence;
