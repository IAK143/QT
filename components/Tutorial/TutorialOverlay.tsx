import React from 'react';
import { ChevronRight, Check, X } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TutorialOverlayProps {
    step: number;
    onNext: () => void;
    onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onSkip }) => {
    // Determine positioning and content based on step
    // Step 1: Welcome (Center)
    // Step 2: API Key (Point to Network/Settings) - Adjust position for Sidebar 'Network' button generally bottom left
    // Step 3: Connect (Point to Social/Input)
    // Step 4: Finish (Center)

    if (step === 0) return null;

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center relative border border-slate-200">
                            <button onClick={onSkip} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
                            <div className="w-16 h-16 bg-black text-white rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-6 shadow-lg rotate-3">Q</div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-3">Welcome to QT-AI</h2>
                            <p className="text-slate-500 mb-8 leading-relaxed">
                                Your private, offline-first workspace for secure collaboration and intelligent thinking.
                                Let's get you set up in just a few clicks.
                            </p>
                            <button
                                onClick={onNext}
                                className="w-full bg-black hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                Start Tour <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-fade-in">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
                            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 relative">
                                <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rotate-45 border-l border-b border-slate-200 hidden md:block"></div>
                                <h3 className="font-bold text-lg text-slate-900 mb-2">Step 1: AI Power</h3>
                                <p className="text-slate-500 text-sm mb-4">
                                    To unlock the "Thought Lab" and "Document Room", you need to verify your Gemini API Key.
                                    <br /><br />
                                    Go to the <strong>Network</strong> tab (sidebar) to set this up safely.
                                </p>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-mono text-slate-400">1/3</span>
                                    <button onClick={onNext} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90">Next</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] animate-fade-in">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
                            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
                                <h3 className="font-bold text-lg text-slate-900 mb-2">Step 2: Connect Peers</h3>
                                <p className="text-slate-500 text-sm mb-4">
                                    Share your Unique ID with teammates to chat and collaborate securely offline.
                                    <br /><br />
                                    <strong>No central servers. No tracking. Just P2P.</strong>
                                </p>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-mono text-slate-400">2/3</span>
                                    <button onClick={onNext} className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90">Next</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center border border-slate-200 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-50 to-transparent opacity-50"></div>
                            <div className="relative">
                                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Check size={32} />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 mb-3">You're Ready!</h2>
                                <p className="text-slate-500 mb-8">
                                    Your secure workspace is initialized. Remember:
                                    <br />
                                    • Apps requires an active internet connection & API Key.
                                    <br />
                                    • Chat & P2P works anywhere, even offline (local network).
                                </p>
                                <button
                                    onClick={onNext}
                                    className="w-full bg-black hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl transition-all active:scale-95"
                                >
                                    Get Started
                                </button>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            {renderStepContent()}
        </>
    );
};
