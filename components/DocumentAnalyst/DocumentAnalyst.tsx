
import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, DocQAMessage, Channel } from '../../types';
import { BarChart3, Target, Upload, Bot, Send, Share2, Loader2, FileText, Download } from 'lucide-react';
import { downloadCSV } from '../../utils/fileHelpers';
import { queryDocument } from '../../services/geminiService';
import { storageService } from '../../services/storageService';
import { cn } from '../../utils/cn';

interface DocumentAnalystProps {
    activeDoc: AnalysisResult | null;
    onFileUpload: (file: File) => Promise<void>;
    isAnalyzing: boolean;
    channels: Channel[];
    onShare: (channelId: string) => void;
}

const DocumentAnalyst: React.FC<DocumentAnalystProps> = ({ activeDoc, onFileUpload, isAnalyzing, channels, onShare }) => {
    const [docInput, setDocInput] = useState('');
    const [docMessages, setDocMessages] = useState<DocQAMessage[]>([]);
    const [isQueryingDoc, setIsQueryingDoc] = useState(false);
    const [isShareOpen, setIsShareOpen] = useState(false);
    const docChatScrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load chat history when activeDoc changes
    useEffect(() => {
        if (activeDoc?.id) {
            const saved = storageService.getDocChat(activeDoc.id);
            setDocMessages(saved);
        } else {
            setDocMessages([]);
        }
    }, [activeDoc?.id]);

    useEffect(() => {
        if (docChatScrollRef.current) {
            docChatScrollRef.current.scrollTop = docChatScrollRef.current.scrollHeight;
        }
    }, [docMessages]);

    const handleDocQuery = async () => {
        if (!docInput.trim() || !activeDoc) return;
        const question = docInput;
        setDocInput('');

        const userMsg: DocQAMessage = { id: Date.now().toString(), role: 'user', text: question };
        const updatedWithUser = [...docMessages, userMsg];
        setDocMessages(updatedWithUser);
        if (activeDoc.id) storageService.saveDocChat(activeDoc.id, updatedWithUser);

        setIsQueryingDoc(true);

        const answer = await queryDocument(activeDoc, question);

        setIsQueryingDoc(false);
        const aiMsg: DocQAMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: answer };
        const updatedWithAI = [...updatedWithUser, aiMsg];
        setDocMessages(updatedWithAI);
        if (activeDoc.id) storageService.saveDocChat(activeDoc.id, updatedWithAI);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleDocQuery();
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files?.[0]) {
            onFileUpload(e.dataTransfer.files[0]);
        }
    };

    if (isAnalyzing) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#f9fafb] p-8 text-center">
                <Loader2 size={48} className="animate-spin text-slate-400 mb-4" />
                <h2 className="text-xl font-bold text-slate-800">Analyzing Document</h2>
                <p className="text-slate-500">Extracting tables, entities, and insights...</p>
            </div>
        );
    }

    if (!activeDoc) {
        return (
            <div
                className="flex-1 flex flex-col items-center justify-center bg-[#f9fafb] p-8"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
            >
                <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center max-w-lg w-full hover:border-slate-300 transition-colors">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                        <Upload size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Upload Document</h2>
                    <p className="text-slate-500 mb-8">Drag & drop your PDF, Image, or Text file here to get an in-depth analysis.</p>

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-black text-white rounded-xl font-bold hover:opacity-80 transition-opacity"
                    >
                        Select File
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*, application/pdf"
                        onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex h-full bg-[#f9fafb] overflow-hidden">
            {/* Main Content (Analysis) */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600">
                                <FileText size={20} />
                            </div>
                            <h1 className="text-2xl font-bold text-slate-900">Document Analysis</h1>
                        </div>
                        <p className="text-slate-500 text-sm ml-11">Type: <span className="font-semibold text-slate-700">{activeDoc.documentType}</span></p>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50"
                        >
                            Analyze New
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*, application/pdf"
                            onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
                        />

                        <div className="relative">
                            <button
                                onClick={() => setIsShareOpen(!isShareOpen)}
                                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:opacity-80 flex items-center gap-2"
                            >
                                <Share2 size={16} /> Share Result
                            </button>
                            {isShareOpen && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl p-1 flex flex-col gap-0.5 z-20">
                                    <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Share to Channel</div>
                                    {channels.map(channel => (
                                        <button
                                            key={channel.id}
                                            onClick={() => { onShare(channel.id); setIsShareOpen(false); }}
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

                {/* Summary */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Executive Summary</h3>
                    <p className="text-slate-800 leading-relaxed">{activeDoc.summary}</p>
                </div>

                {/* Key Entities Grid */}
                <div>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 ml-1">Extracted Entities</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {activeDoc.keyEntities.map((e, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <span className="text-[10px] text-slate-400 block mb-1">{e.label}</span>
                                <span className="text-sm font-bold text-slate-900 block truncate" title={String(e.value)}>{e.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Structured Tables */}
                {activeDoc.structuredData.map((table, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <BarChart3 size={16} className="text-slate-400" /> {table.title}
                            </h3>
                            <button
                                onClick={() => downloadCSV(table.rows, 'data.csv')}
                                className="text-xs font-medium text-slate-500 hover:text-black flex items-center gap-1"
                            >
                                <Download size={14} /> Export CSV
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-medium">
                                    <tr>
                                        {table.headers.map((h, k) => (
                                            <th key={k} className="px-6 py-3 border-b border-slate-100 whitespace-nowrap">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {table.rows.map((r, k) => (
                                        <tr key={k} className="hover:bg-slate-50/50 border-b border-slate-50 last:border-0">
                                            {table.headers.map((h, j) => (
                                                <td key={j} className="px-6 py-3 text-slate-700 whitespace-nowrap">{r[h]}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

                {/* Suggested Actions */}
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Target size={14} /> Recommended Actions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeDoc.suggestedActions.map((action, i) => (
                            <div key={i} className="flex gap-3 items-start bg-white/5 p-3 rounded-lg border border-white/10">
                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <span className="text-sm text-slate-200 leading-snug">{action}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Side Panel: Doc Q&A */}
            <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-10">
                <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
                    <Bot size={18} className="text-slate-500" />
                    <span className="font-semibold text-slate-800">Ask Document</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={docChatScrollRef}>
                    {docMessages.length === 0 && (
                        <div className="text-center mt-10 opacity-50">
                            <Bot size={32} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-xs text-slate-400">Ask questions about the uploaded document to get specific answers.</p>
                        </div>
                    )}
                    {docMessages.map(m => (
                        <div key={m.id} className={cn("flex gap-2", m.role === 'user' ? "flex-row-reverse" : "")}>
                            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold", m.role === 'user' ? "bg-slate-100 text-slate-600" : "bg-black text-white")}>
                                {m.role === 'user' ? 'U' : 'S'}
                            </div>
                            <div className={cn("p-2.5 rounded-xl text-xs leading-relaxed max-w-[85%] break-words", m.role === 'user' ? "bg-slate-100 text-slate-800 rounded-tr-none" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-sm")}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    {isQueryingDoc && (
                        <div className="flex gap-2 items-center text-xs text-slate-400">
                            <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center"><Bot size={12} /></div>
                            <span className="animate-pulse">Analyzing...</span>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-200">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
                        <input
                            className="flex-1 bg-transparent border-none text-xs focus:ring-0 placeholder:text-slate-400"
                            placeholder="Ask a question..."
                            value={docInput}
                            onChange={(e) => setDocInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                        />
                        <button
                            onClick={handleDocQuery}
                            disabled={!docInput.trim() || isQueryingDoc}
                            className="p-1.5 bg-black text-white rounded-lg hover:opacity-80 disabled:opacity-30 transition-opacity"
                        >
                            <Send size={12} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DocumentAnalyst;
