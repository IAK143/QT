import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Image as ImageIcon, Sparkles, Scale, Trash2, StopCircle } from 'lucide-react';
import { BrainMessage } from '../../types';
import { runSecondBrain } from '../../services/geminiService';
import { fileToBase64 } from '../../utils/fileHelpers';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../utils/cn';

interface SecondBrainProps { }

const SecondBrain: React.FC<SecondBrainProps> = () => {
    const [messages, setMessages] = useState<BrainMessage[]>([]);
    const [input, setInput] = useState('');
    const [selectedImage, setSelectedImage] = useState<{ file: File, preview: string } | null>(null);
    const [isThinking, setIsThinking] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const saved = localStorage.getItem('nexus_brain_chat');
        if (saved) {
            setMessages(JSON.parse(saved));
        } else {
            setMessages([{
                id: 'init',
                role: 'ai',
                content: "Hello. I am your Thought Lab assistant. I can help you analyze images, make complex decisions, or organize your thoughts. How can I assist?",
                timestamp: Date.now()
            }]);
        }
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('nexus_brain_chat', JSON.stringify(messages.slice(-50)));
            scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleSend = async (mode: 'standard' | 'decision' = 'standard') => {
        if ((!input.trim() && !selectedImage) || isThinking) return;

        const userMsg: BrainMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            image: selectedImage?.preview.split(',')[1], // Strip prefix for storage/API
            timestamp: Date.now()
        };

        const newHistory = [...messages, userMsg];
        setMessages(newHistory);
        setInput('');
        setSelectedImage(null);
        setIsThinking(true);

        // API Call
        const responseText = await runSecondBrain(
            messages.slice(-10), // Context window
            userMsg.content,
            userMsg.image,
            mode
        );

        const aiMsg: BrainMessage = {
            id: (Date.now() + 1).toString(),
            role: 'ai',
            content: responseText,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, aiMsg]);
        setIsThinking(false);
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const base64 = await fileToBase64(file);
            setSelectedImage({ file, preview: `data:${file.type};base64,${base64}` });
        }
    };

    const clearChat = () => {
        if (confirm("Clear Thought Lab history?")) {
            setMessages([{
                id: Date.now().toString(),
                role: 'ai',
                content: "Memory cleared. Ready for new tasks.",
                timestamp: Date.now()
            }]);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[#fcfcfc] relative overflow-hidden">
            {/* Neural Background Ambient Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-transparent to-transparent" />

            {/* Header */}
            <div className="h-16 border-b border-slate-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-purple-200">
                        <Bot size={18} />
                    </div>
                    <div>
                        <h1 className="font-bold text-slate-900">Thought Lab</h1>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Private Process Engine</p>
                    </div>
                </div>
                <button onClick={clearChat} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors active:scale-95" title="Clear Memory">
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6" ref={scrollRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex gap-4 max-w-3xl mx-auto animate-fade-in", msg.role === 'user' ? "flex-row-reverse" : "")}>
                        <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                            msg.role === 'user' ? "bg-slate-200 text-slate-600" : "bg-purple-100 text-purple-600"
                        )}>
                            {msg.role === 'user' ? <div className="w-2 h-2 bg-slate-500 rounded-full" /> : <Sparkles size={14} />}
                        </div>

                        <div className={cn(
                            "flex flex-col gap-2 max-w-[85%]",
                            msg.role === 'user' ? "items-end" : "items-start"
                        )}>
                            {msg.image && (
                                <img
                                    src={`data:image/png;base64,${msg.image}`}
                                    alt="User Upload"
                                    className="max-w-xs rounded-xl border border-slate-200 shadow-sm"
                                />
                            )}
                            <div className={cn(
                                "rounded-2xl px-5 py-3.5 shadow-sm text-sm leading-relaxed markdown-body",
                                msg.role === 'user'
                                    ? "bg-slate-900 text-white rounded-tr-none"
                                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                            )}>
                                {msg.role === 'ai' ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Advanced Thinking Animation */}
                {isThinking && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-fade-in">
                        <div className="relative w-16 h-16 flex items-center justify-center">
                            {/* Neural Orb Layers */}
                            <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-neural-pulse blur-xl"></div>
                            <div className="absolute inset-2 rounded-full bg-blue-500/30 animate-pulse blur-lg"></div>
                            <div className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_15px_rgba(147,51,234,0.8)] animate-orb-float"></div>
                            <div className="absolute w-2 h-2 bg-indigo-300 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)] animate-orb-float" style={{ animationDelay: '1s', animationDirection: 'reverse' }}></div>
                        </div>
                        <span className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-blue-500 animate-pulse tracking-widest uppercase">
                            Processing
                        </span>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-100 relative z-20">
                <div className="max-w-3xl mx-auto space-y-4">
                    {selectedImage && (
                        <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-lg w-fit animate-scale-in">
                            <img src={selectedImage.preview} alt="Selected" className="w-10 h-10 object-cover rounded-md" />
                            <span className="text-xs font-medium text-slate-600 truncate max-w-[200px]">{selectedImage.file.name}</span>
                            <button onClick={() => setSelectedImage(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400"><Trash2 size={12} /></button>
                        </div>
                    )}

                    <div className="relative flex items-end gap-2 p-2 bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 transition-all shadow-sm">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors active:scale-95"
                            title="Upload Image"
                        >
                            <ImageIcon size={20} />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageSelect}
                        />

                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend('standard');
                                }
                            }}
                            placeholder="Ask me anything..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 text-sm py-3.5 max-h-40 resize-none placeholder:text-slate-400"
                            rows={1}
                            style={{ minHeight: '48px' }}
                        />

                        <div className="flex items-center gap-1 pb-1">
                            <button
                                onClick={() => handleSend('decision')}
                                disabled={!input.trim() || isThinking}
                                className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors hidden md:block active:scale-95"
                                title="Decision Mode (Forces structured analysis)"
                            >
                                <Scale size={20} />
                            </button>
                            <button
                                onClick={() => handleSend('standard')}
                                disabled={(!input.trim() && !selectedImage) || isThinking}
                                className="p-2 bg-slate-900 text-white rounded-xl hover:bg-black disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md shadow-slate-900/10 active:scale-95"
                            >
                                {isThinking ? <StopCircle size={20} className="animate-pulse" /> : <Send size={20} />}
                            </button>
                        </div>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-400">
                            <strong>Tip:</strong> Click the <Scale size={10} className="inline" /> icon to activate Decision Engine mode for complex choices.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecondBrain;
