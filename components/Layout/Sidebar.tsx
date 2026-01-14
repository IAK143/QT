import React, { useState } from 'react';
import { Layout, Copy, Plus, Hash, Users, FileText, Brain, Bot, Table } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Channel, PeerUser, ConnectionRequest } from '../../types';

interface SidebarProps {
  myId: string;
  activeView: 'chat' | 'ideas' | 'network' | 'analysis' | 'second-brain';
  activeChannelId: string;
  channels: Channel[];
  peers: PeerUser[];
  pendingRequests: ConnectionRequest[];
  unreadCounts: Record<string, number>;
  onChangeView: (view: 'chat' | 'ideas' | 'network' | 'analysis' | 'second-brain') => void;
  onSelectChannel: (channelId: string) => void;
  onCreateChannel: (name: string) => void;
  onAddPeer: (peerId: string) => void;
  onAcceptPeer: (peerId: string) => void;
  onRejectPeer: (peerId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  myId,
  activeView,
  activeChannelId,
  channels,
  peers,
  pendingRequests,
  unreadCounts,
  onChangeView,
  onSelectChannel,
  onCreateChannel
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const copyId = () => {
    navigator.clipboard.writeText(myId);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newChannelName.trim()) {
      onCreateChannel(newChannelName.trim());
      setNewChannelName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="w-64 bg-white text-slate-800 flex flex-col h-full border-r border-slate-200 shrink-0">
      {/* App Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white font-bold mr-3">
          Q
        </div>
        <span className="font-bold text-slate-900 tracking-tight">QT</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-6">



        {/* Main Apps */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Apps</div>

          <button
            onClick={() => onChangeView('second-brain')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1",
              activeView === 'second-brain'
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            )}
          >
            <Brain size={18} className={activeView === 'second-brain' ? "text-purple-600" : "text-slate-400"} />
            Thought Lab
          </button>

          <button
            onClick={() => onChangeView('ideas')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-1",
              activeView === 'ideas'
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            )}
          >
            <Layout size={18} className={activeView === 'ideas' ? "text-slate-900" : "text-slate-400"} />
            Idea Framework
          </button>
          <button
            onClick={() => onChangeView('analysis')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeView === 'analysis'
                ? "bg-slate-100 text-slate-900 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            )}
          >
            <FileText size={18} className={activeView === 'analysis' ? "text-slate-900" : "text-slate-400"} />
            Document Room
          </button>
        </div>

        {/* Channels */}
        <div>
          <div className="flex items-center justify-between mb-2 px-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Channels</div>
            <button onClick={() => setIsCreating(true)} className="text-slate-400 hover:text-slate-900 transition-colors">
              <Plus size={14} />
            </button>
          </div>

          <div className="space-y-1">
            {channels.map(channel => {
              const count = unreadCounts[channel.id] || 0;
              const isActive = activeView === 'chat' && activeChannelId === channel.id;

              return (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                    isActive
                      ? "bg-slate-100 text-slate-900 shadow-sm"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Hash size={16} className={isActive ? "text-slate-900" : "text-slate-400"} />
                    <span className="truncate">{channel.name}</span>
                  </div>

                  {count > 0 && (
                    <span className="flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-rose-500 text-white text-[10px] font-bold rounded-full animate-pulse shadow-sm">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {isCreating && (
            <form onSubmit={handleCreate} className="mt-2 px-1">
              <input
                autoFocus
                type="text"
                placeholder="Channel name..."
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-slate-400"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                onBlur={() => !newChannelName && setIsCreating(false)}
              />
            </form>
          )}
        </div>

      </div>

      {/* Social / Network Section */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2">Social</div>
        <button
          onClick={() => onChangeView('network')}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
            activeView === 'network'
              ? "bg-slate-100 text-slate-900 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          )}
        >
          <Users size={18} className={activeView === 'network' ? "text-slate-900" : "text-slate-400"} />
          Network
          {pendingRequests.length > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-rose-500 text-white text-[10px] flex items-center justify-center rounded-full font-bold shadow-sm">
              {pendingRequests.length}
            </span>
          )}
        </button>

        {/* Online Peers List */}
        <div className="mt-4 px-2 space-y-2">
          {peers.length === 0 && <p className="text-xs text-slate-400 italic">No peers online.</p>}
          {peers.map(p => (
            <div key={p.id} className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="truncate">{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* User Status */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">My Identity</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            <span className="text-[10px] text-emerald-600 font-medium">Online</span>
          </div>
        </div>
        <div className="flex gap-2 items-center bg-white border border-slate-200 rounded-md p-1.5 shadow-sm">
          <code className="text-xs font-mono text-slate-500 flex-1 truncate select-all">
            {myId || '...'}
          </code>
          <button onClick={copyId} className="p-1 text-slate-400 hover:text-slate-900 transition-colors" title="Copy ID">
            <Copy size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
