import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { Loader2, ArrowRight, UserCircle2, Fingerprint } from 'lucide-react';
import { cn } from '../../utils/cn';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => Promise<void>;
  error?: string | null;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, error }) => {
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'submitting'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !id.trim()) return;
    
    setStatus('checking');

    // Simulate checking availability
    setTimeout(async () => {
        setStatus('submitting');
        try {
            await onComplete({ name: name.trim(), id: id.trim() });
        } catch (e) {
            setStatus('idle');
        }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#fcfcfc] flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] animate-fade-in-up">
         
         <div className="text-center mb-10">
             <div className="w-16 h-16 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-xl shadow-slate-900/10">
                Q
             </div>
             <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Setup Identity</h1>
             <p className="text-sm text-slate-500 mt-2">Create your secure, local profile.</p>
         </div>

         <div className="bg-white p-2 rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-100">
             <form onSubmit={handleSubmit} className="p-6 space-y-5">
                
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-xl border border-red-100 animate-fade-in">
                        {error}
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                    <div className="relative group">
                        <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition-colors" size={18} />
                        <input 
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Sarah Connor"
                            disabled={status !== 'idle' && error === null}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 outline-none transition-all placeholder:text-slate-300 text-sm font-medium"
                            required
                        />
                    </div>
                </div>
                
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unique Handle</label>
                    <div className="relative group">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-800 transition-colors" size={18} />
                        <input 
                            type="text"
                            value={id}
                            onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                            placeholder="username-123"
                            disabled={status !== 'idle' && error === null}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-300 outline-none transition-all placeholder:text-slate-300 text-sm font-mono"
                            required
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={status !== 'idle' || !name || !id}
                    className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-black hover:shadow-lg disabled:opacity-70 disabled:shadow-none transition-all flex items-center justify-center gap-2 mt-4"
                >
                    {status === 'checking' || status === 'submitting' ? (
                        <>
                            <Loader2 size={16} className="animate-spin" />
                            <span className="animate-pulse">Securing Connection...</span>
                        </>
                    ) : (
                        <>
                            Initialize Workspace <ArrowRight size={16} />
                        </>
                    )}
                </button>
             </form>
         </div>
         
         <p className="text-center text-[10px] text-slate-400 mt-8 opacity-60">
             By continuing, you verify that no data leaves your device unless explicitly shared.
         </p>
      </div>
    </div>
  );
};

export default Onboarding;