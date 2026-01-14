import React from 'react';
import { ArrowRight, Shield, Zap, Globe } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#fcfcfc] relative overflow-hidden hero-gradient">

      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100/40 rounded-full blur-[120px] animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-100/40 rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />

      {/* Header Logo */}
      <div className="absolute top-6 left-6 md:top-10 md:left-10 z-20 animate-fade-in opacity-0" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-slate-900/20">
            Q
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-lg">QT</span>
        </div>
      </div>

      <div className="z-10 flex flex-col items-center max-w-3xl px-6 text-center">

        {/* Badge */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.1s' }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Workspace Ready</span>
          </div>
        </div>

        {/* Hero Title */}
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: '0.2s' }}>
          Collaborate with <span className="precision-gradient-text">precision.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg text-slate-500 mb-10 max-w-lg leading-relaxed animate-fade-in-up opacity-0" style={{ animationDelay: '0.3s' }}>
          A private, peer-to-peer workspace for seamless collaboration.
          No servers. No data leaks. Just pure flow.
        </p>

        {/* CTA */}
        <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={onEnter}
            className="group relative inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-semibold transition-all hover:bg-black hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-slate-900/10 overflow-hidden"
          >
            <span>Enter Workspace</span>
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Footer Features */}
        <div className="mt-20 flex items-center justify-center gap-8 text-xs font-medium text-slate-400 animate-fade-in-up opacity-0" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-center gap-2">
            <Shield size={14} /> End-to-End Encrypted
          </div>
          <div className="w-1 h-1 bg-slate-300 rounded-full" />
          <div className="flex items-center gap-2">
            <Zap size={14} /> Real-time P2P
          </div>
        </div>

      </div>
    </div>
  );
};

export default LandingPage;