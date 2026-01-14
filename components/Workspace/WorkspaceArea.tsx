import React, { useState, useEffect, useRef } from 'react';
import { Workspace, WorkspaceType, WorkspaceSection, WorkspaceChatMessage } from '../../types';
import { Target, Scale, FileText, ListTodo, Plus, Lock, Send, Bot, Loader2, ArrowLeft, MoreHorizontal, Download, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { consultWorkspace } from '../../services/geminiService';

interface WorkspaceAreaProps {
    workspaces: Workspace[];
    onCreateWorkspace: (workspace: Workspace) => void;
    onUpdateWorkspace: (workspace: Workspace) => void;
    onDeleteWorkspace: (id: string) => void;
}

const TEMPLATES: Record<WorkspaceType, { title: string, sections: Partial<WorkspaceSection>[] }> = {
    'decision': {
        title: 'Decision Memo',
        sections: [
            { title: 'Objective', placeholder: 'One sentence: What are we trying to decide?', helpText: 'Be specific about the goal.' },
            { title: 'Options', placeholder: 'Option A vs Option B vs Option C', helpText: 'List distinct paths.' },
            { title: 'Constraints', placeholder: 'Budget, Time, Risks', helpText: 'What limits our choice?' },
            { title: 'Analysis', placeholder: 'Key data points and trade-offs', helpText: 'Synthesis of the options.' },
            { title: 'Final Decision', placeholder: 'The verdict', helpText: 'Clear and unambiguous.' },
            { title: 'Rationale', placeholder: 'Why this option?', helpText: 'Defend the choice.' }
        ]
    },
    'proposal': {
        title: 'Project Proposal',
        sections: [
            { title: 'Problem', placeholder: 'What pain point are we solving?', helpText: 'Define the user need.' },
            { title: 'Solution', placeholder: 'Proposed approach', helpText: 'High level solution.' },
            { title: 'Value', placeholder: 'ROI / Impact', helpText: 'Quantifiable benefits.' },
            { title: 'Cost', placeholder: 'Resources required', helpText: 'Budget and headcount.' },
            { title: 'Risks', placeholder: 'What could go wrong?', helpText: 'Mitigation strategies.' }
        ]
    },
    'review': {
        title: 'Contract / Doc Review',
        sections: [
            { title: 'Document Context', placeholder: 'Paste document text or summary here', helpText: 'The source material.' },
            { title: 'Risk Flags', placeholder: 'Ambiguities and liabilities', helpText: 'AI will help identify these.' },
            { title: 'Redlines', placeholder: 'Suggested changes', helpText: 'Specific text edits.' },
            { title: 'Final Verdict', placeholder: 'Approve / Reject / Conditional', helpText: 'Go or No-Go.' }
        ]
    },
    'sprint': {
        title: 'Execution Plan',
        sections: [
            { title: 'Goal', placeholder: 'Sprint objective', helpText: 'The definition of done.' },
            { title: 'Scope', placeholder: 'In-scope vs Out-of-scope', helpText: 'Boundaries.' },
            { title: 'Tasks', placeholder: 'Key work items', helpText: 'High level breakdown.' },
            { title: 'Owners', placeholder: 'Who is doing what', helpText: 'Accountability.' },
            { title: 'Dependencies', placeholder: 'Blockers', helpText: 'External factors.' }
        ]
    }
};

const WorkspaceArea: React.FC<WorkspaceAreaProps> = ({ workspaces, onCreateWorkspace, onUpdateWorkspace, onDeleteWorkspace }) => {
    const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    
    // Create State
    const [newType, setNewType] = useState<WorkspaceType>('decision');
    const [newObjective, setNewObjective] = useState('');
    
    // Detail State
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<WorkspaceChatMessage[]>([]);
    const [isConsulting, setIsConsulting] = useState(false);

    const activeWorkspace = workspaces.find(w => w.id === selectedWorkspaceId);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [chatMessages]);

    // -- Actions --

    const handleCreate = () => {
        if (!newObjective.trim()) return;
        
        const template = TEMPLATES[newType];
        const newWorkspace: Workspace = {
            id: Date.now().toString(),
            title: template.title,
            type: newType,
            objective: newObjective,
            status: 'active',
            sections: template.sections.map((s, i) => ({
                id: `sec-${Date.now()}-${i}`,
                title: s.title!,
                content: i === 0 && s.title === 'Objective' ? newObjective : '', // Pre-fill objective
                placeholder: s.placeholder!,
                helpText: s.helpText!
            })),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        onCreateWorkspace(newWorkspace);
        setSelectedWorkspaceId(newWorkspace.id);
        setNewObjective('');
        setView('detail');
    };

    const handleUpdateSection = (sectionId: string, content: string) => {
        if (!activeWorkspace || activeWorkspace.status === 'locked') return;
        
        const updated = {
            ...activeWorkspace,
            sections: activeWorkspace.sections.map(s => s.id === sectionId ? { ...s, content } : s),
            updatedAt: Date.now()
        };
        onUpdateWorkspace(updated);
    };

    const handleLock = () => {
        if (!activeWorkspace) return;
        if (confirm("Locking this workspace will make it read-only. This signifies the decision is final. Continue?")) {
            onUpdateWorkspace({ ...activeWorkspace, status: 'locked' });
        }
    };

    const handleChatSubmit = async () => {
        if (!chatInput.trim() || !activeWorkspace) return;
        
        const userMsg: WorkspaceChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: chatInput,
            timestamp: Date.now()
        };
        
        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');
        setIsConsulting(true);

        const response = await consultWorkspace(activeWorkspace, userMsg.text);

        const aiMsg: WorkspaceChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            text: response,
            timestamp: Date.now()
        };
        
        setChatMessages(prev => [...prev, aiMsg]);
        setIsConsulting(false);
    };

    const handleExport = () => {
        if (!activeWorkspace) return;
        
        const lines = [
            `# ${activeWorkspace.title}`,
            `**Type:** ${activeWorkspace.type}`,
            `**Objective:** ${activeWorkspace.objective}`,
            `**Status:** ${activeWorkspace.status.toUpperCase()}`,
            `**Date:** ${new Date(activeWorkspace.updatedAt).toLocaleDateString()}`,
            '',
            '---',
            ''
        ];

        activeWorkspace.sections.forEach(s => {
            lines.push(`## ${s.title}`);
            if (s.helpText) lines.push(`*(${s.helpText})*`);
            lines.push('');
            lines.push(s.content || '(Empty)');
            lines.push('');
            lines.push('---');
            lines.push('');
        });

        const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeWorkspace.title.replace(/\s+/g, '_')}_${activeWorkspace.id}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        onDeleteWorkspace(id);
    };

    // -- Renderers --

    const renderIcon = (type: WorkspaceType) => {
        switch (type) {
            case 'decision': return <Scale size={20} className="text-purple-500" />;
            case 'proposal': return <Target size={20} className="text-blue-500" />;
            case 'review': return <FileText size={20} className="text-amber-500" />;
            case 'sprint': return <ListTodo size={20} className="text-emerald-500" />;
        }
    };

    if (view === 'list') {
        return (
            <div className="flex-1 bg-[#f9fafb] p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-2">Outcomes</h1>
                            <p className="text-slate-500">Structured workspaces for high-stakes work.</p>
                        </div>
                        <button 
                            onClick={() => setView('create')}
                            className="bg-black text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:opacity-80 transition-opacity"
                        >
                            <Plus size={18} /> New Outcome
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {workspaces.map(w => (
                            <div 
                                key={w.id} 
                                onClick={() => { setSelectedWorkspaceId(w.id); setView('detail'); }}
                                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
                                        {renderIcon(w.type)}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {w.status === 'locked' && <Lock size={16} className="text-slate-400" />}
                                        <button 
                                            onClick={(e) => handleDelete(e, w.id)}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete Workspace"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="font-bold text-slate-800 mb-1">{w.title}</h3>
                                <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{w.objective}</p>
                                <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                                    {new Date(w.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                        ))}
                        {workspaces.length === 0 && (
                            <div className="col-span-full text-center py-20 opacity-50">
                                <Target size={48} className="mx-auto mb-4 text-slate-300" />
                                <p>No outcomes defined yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'create') {
        return (
            <div className="flex-1 bg-[#f9fafb] flex items-center justify-center p-4">
                <div className="bg-white max-w-2xl w-full rounded-3xl border border-slate-200 shadow-xl overflow-hidden animate-fade-in-up">
                    <div className="p-8 border-b border-slate-100">
                        <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-800 mb-4 flex items-center gap-1 text-sm font-medium">
                            <ArrowLeft size={16} /> Back
                        </button>
                        <h2 className="text-2xl font-bold text-slate-900">Start with Intent</h2>
                        <p className="text-slate-500 mt-1">Select a framework to structure your thinking.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-8 bg-slate-50/50">
                        {(Object.keys(TEMPLATES) as WorkspaceType[]).map((t) => (
                            <button
                                key={t}
                                onClick={() => setNewType(t)}
                                className={cn(
                                    "text-left p-4 rounded-xl border transition-all relative overflow-hidden",
                                    newType === t 
                                        ? "bg-white border-black shadow-md ring-1 ring-black/5" 
                                        : "bg-white border-slate-200 hover:border-slate-300 opacity-70 hover:opacity-100"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    {renderIcon(t)}
                                    <span className="font-bold text-slate-800 capitalize">{t}</span>
                                </div>
                                <p className="text-xs text-slate-500">{TEMPLATES[t].title}</p>
                            </button>
                        ))}
                    </div>

                    <div className="p-8 space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Objective</label>
                            <textarea 
                                autoFocus
                                value={newObjective}
                                onChange={(e) => setNewObjective(e.target.value)}
                                placeholder="What is the single most important goal of this workspace?"
                                className="w-full h-24 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 text-sm resize-none"
                            />
                        </div>
                        <button 
                            onClick={handleCreate}
                            disabled={!newObjective.trim()}
                            className="w-full py-3 bg-black text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                            Initialize Workspace
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Detail View
    if (!activeWorkspace) return null;

    return (
        <div className="flex-1 flex h-full overflow-hidden bg-[#f9fafb]">
            {/* Left: Structured Document */}
            <div className="flex-1 flex flex-col border-r border-slate-200 h-full overflow-hidden">
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-8 bg-white border-b border-slate-100 shrink-0">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-800 transition-colors">
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="font-bold text-slate-900 flex items-center gap-2">
                                {activeWorkspace.title} 
                                {activeWorkspace.status === 'locked' && <Lock size={14} className="text-slate-400" />}
                            </h1>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">{activeWorkspace.type}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {activeWorkspace.status !== 'locked' && (
                            <button onClick={handleLock} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors">
                                Lock & Finalize
                            </button>
                        )}
                         <button onClick={handleExport} className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold transition-colors flex items-center gap-1">
                            <Download size={14} /> Export MD
                        </button>
                    </div>
                </div>

                {/* Sections */}
                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {activeWorkspace.sections.map((section) => (
                        <div key={section.id} className="group">
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                    {section.title}
                                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-slate-300 font-normal normal-case border border-slate-200 px-1.5 rounded-full">
                                        {section.helpText}
                                    </span>
                                </label>
                            </div>
                            <textarea
                                disabled={activeWorkspace.status === 'locked'}
                                value={section.content}
                                onChange={(e) => handleUpdateSection(section.id, e.target.value)}
                                placeholder={section.placeholder}
                                className={cn(
                                    "w-full p-4 rounded-xl border transition-all text-sm leading-relaxed resize-none overflow-hidden min-h-[100px] focus:outline-none focus:ring-2 focus:ring-black/5",
                                    activeWorkspace.status === 'locked' 
                                        ? "bg-slate-50 border-transparent text-slate-600 cursor-not-allowed" 
                                        : "bg-white border-slate-200 focus:border-slate-300"
                                )}
                                style={{ height: Math.max(120, section.content.split('\n').length * 24) + 'px' }}
                            />
                        </div>
                    ))}
                    <div className="h-20" /> {/* Spacer */}
                </div>
            </div>

            {/* Right: AI Analyst */}
            <div className="w-[350px] bg-white flex flex-col h-full shrink-0 shadow-xl shadow-slate-200/50 z-10">
                <div className="h-16 border-b border-slate-100 flex items-center px-6 gap-3 bg-slate-50/50">
                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white">
                        <Bot size={16} />
                    </div>
                    <div>
                        <div className="font-bold text-sm text-slate-900">Analyst Mode</div>
                        <div className="text-[10px] text-slate-500">
                            {activeWorkspace.type === 'decision' ? 'Strategy & Bias Check' :
                             activeWorkspace.type === 'proposal' ? 'Persuasion & Clarity' :
                             activeWorkspace.type === 'review' ? 'Risk & Compliance' : 'Execution Planning'}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
                    {chatMessages.length === 0 && (
                        <div className="text-center mt-10 opacity-50 px-6">
                            <Bot size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-xs text-slate-500">
                                I am monitoring your {activeWorkspace.type} workspace. 
                                Ask me to review sections, challenge assumptions, or draft content.
                            </p>
                        </div>
                    )}
                    {chatMessages.map(msg => (
                        <div key={msg.id} className={cn("flex gap-2", msg.role === 'user' ? "flex-row-reverse" : "")}>
                             <div className={cn("p-3 rounded-xl text-xs max-w-[85%] leading-relaxed shadow-sm", 
                                 msg.role === 'user' ? "bg-white border border-slate-200 text-slate-800" : "bg-slate-900 text-slate-200"
                             )}>
                                 {msg.text}
                             </div>
                        </div>
                    ))}
                    {isConsulting && (
                         <div className="flex items-center gap-2 text-xs text-slate-400 ml-2">
                             <Loader2 size={12} className="animate-spin" /> Thinking...
                         </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-slate-100 bg-white">
                    <div className="relative">
                        <input
                            disabled={isConsulting}
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChatSubmit()}
                            placeholder="Ask the analyst..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:outline-none focus:border-slate-300 transition-all"
                        />
                        <button 
                            onClick={handleChatSubmit}
                            disabled={!chatInput.trim() || isConsulting}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black text-white rounded-lg hover:opacity-80 disabled:opacity-30 transition-all"
                        >
                            <Send size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkspaceArea;
