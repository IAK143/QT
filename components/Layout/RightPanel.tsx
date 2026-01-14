import React from 'react';
import { ChatInsight } from '../../types';
import { Sparkles, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';

interface RightPanelProps {
  chatInsight: ChatInsight | null;
  isAnalyzing: boolean;
  onAnalyzeChat: () => void;
}

const RightPanel: React.FC<RightPanelProps> = ({ chatInsight, isAnalyzing, onAnalyzeChat }) => {
  return (
    <div className="hidden lg:flex flex-col h-full w-[350px] bg-white border-l border-slate-200 shrink-0">
       <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-slate-100 text-slate-600 rounded-md">
               <Sparkles size={18} />
             </div>
             <h3 className="font-semibold text-slate-800">Chat Intelligence</h3>
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-6">
          {!chatInsight ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <MessageSquare className="text-slate-300" />
               </div>
               <p className="text-sm text-slate-500 max-w-[200px]">
                 Generate insights to get a summary of the current conversation.
               </p>
               <button 
                onClick={onAnalyzeChat}
                disabled={isAnalyzing}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 transition-opacity flex items-center gap-2 shadow-sm"
               >
                 {isAnalyzing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <Sparkles size={14} />}
                 Synthesize Chat
               </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">TL;DR Summary</h4>
                  <p className="text-sm text-slate-700 leading-relaxed">{chatInsight.summary}</p>
               </div>

               <div>
                 <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Action Items</h4>
                 <div className="space-y-2">
                   {chatInsight.actionItems.map((item, i) => (
                     <div key={i} className="flex gap-2 items-start p-2 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                        <div className="w-3 h-3 rounded-sm border border-slate-300 mt-1" />
                        <span className="text-sm text-slate-700">{item}</span>
                     </div>
                   ))}
                 </div>
               </div>
               
               <div className="flex gap-2">
                  <div className="flex-1 p-3 bg-slate-50 rounded-lg border border-slate-100">
                     <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Sentiment</div>
                     <div className={cn("text-sm font-medium", 
                        chatInsight.sentiment === 'Positive' ? 'text-emerald-600' : 
                        chatInsight.sentiment === 'Negative' ? 'text-rose-500' : 'text-slate-600'
                     )}>{chatInsight.sentiment}</div>
                  </div>
               </div>

               <button 
                onClick={onAnalyzeChat}
                disabled={isAnalyzing}
                className="w-full py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
               >
                 {isAnalyzing ? <span className="animate-pulse">Updating...</span> : <> <Sparkles size={12} /> Refresh Insights </>}
               </button>
            </div>
          )}
       </div>
    </div>
  );
};

export default RightPanel;