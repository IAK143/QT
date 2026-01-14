import React, { useRef, useState, useEffect } from 'react';
import { Send, FileText, Zap, UserCircle2, MessageSquare, Layout, ArrowUpRight, Reply, X, Paperclip, Download, Trash2, Bot } from 'lucide-react';
import { ChatMessage, AnalysisResult, Channel, IdeaNode, IdeaConnection, ReplyContext } from '../../types';
import { cn } from '../../utils/cn';
import { peerService } from '../../services/peerService';

interface ChatAreaProps {
  channel: Channel;
  messages: ChatMessage[];
  myId: string;
  typingUsers: string[]; // List of names
  isBotTyping: boolean;
  onSendMessage: (text: string, replyTo?: ReplyContext) => void;
  onSendFile: (file: File, replyTo?: ReplyContext) => void;
  onViewAnalysis: (analysis: AnalysisResult) => void;
  onViewBoard: (data: { nodes: IdeaNode[], connections: IdeaConnection[] }) => void;
  onDeleteMessage: (messageId: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  channel,
  messages,
  myId,
  typingUsers,
  isBotTyping,
  onSendMessage,
  onSendFile,
  onViewAnalysis,
  onViewBoard,
  onDeleteMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReplyContext | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, channel.id, replyingTo, typingUsers, isBotTyping]);

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText, replyingTo || undefined);
      setInputText('');
      setReplyingTo(null);

      // Stop typing status immediately on send
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      peerService.broadcastTyping(channel.id, false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    // Typing indicator logic
    peerService.broadcastTyping(channel.id, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      peerService.broadcastTyping(channel.id, false);
    }, 2000);
  };

  const initiateReply = (msg: ChatMessage) => {
    let content = msg.content;
    if (msg.type === 'file') content = `[File] ${msg.fileData?.name}`;
    if (msg.type === 'analysis') content = `[Analysis] ${msg.attachment?.documentType}`;
    if (msg.type === 'idea-board') content = `[Idea Board] Snapshot`;

    setReplyingTo({
      id: msg.id,
      senderName: msg.senderName,
      content: content
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onSendFile(e.target.files[0], replyingTo || undefined);
      setReplyingTo(null);
      // Reset input value to allow selecting same file again
      e.target.value = '';
    }
  };

  // Helper to render bold text
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f9fafb] relative">
      {/* Full Screen Image Viewer Modal */}
      {fullScreenImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setFullScreenImage(null)}>
          <button
            onClick={() => setFullScreenImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <X size={24} />
          </button>
          <img
            src={fullScreenImage}
            alt="Fullscreen view"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Channel Header */}
      <div className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur flex items-center px-6 justify-between shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
            <MessageSquare size={16} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 leading-tight">{channel.name}</h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Peer-to-Peer Encrypted</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
        {messages.filter(m => m.channelId === channel.id).length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 pb-20">
            <MessageSquare size={48} className="text-slate-400 mb-2" />
            <p className="text-sm font-medium">No messages in #{channel.name} yet.</p>
          </div>
        )}
        {messages.filter(m => m.channelId === channel.id).map((msg) => {
          const isMe = msg.senderId === myId;
          const isBot = msg.senderId === 'qt-bot';
          return (
            <div key={msg.id} className={cn("flex gap-2 max-w-3xl group items-end", isMe ? "ml-auto flex-row-reverse" : "")}>

              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 border mb-1",
                isMe ? "bg-slate-100 border-slate-200 text-slate-700" :
                  isBot ? "bg-purple-100 border-purple-200 text-purple-600" :
                    "bg-white border-slate-100 text-slate-400"
              )}>
                {isBot ? <Bot size={20} /> : <UserCircle2 size={20} />}
              </div>

              <div className={cn("flex flex-col relative", isMe ? "items-end" : "items-start")}>
                {/* Action Buttons Group */}
                <div className={cn(
                  "absolute top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",
                  isMe ? "-left-20" : "-right-10"
                )}>
                  {isMe && (
                    <button
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => initiateReply(msg)}
                    className="p-2 text-slate-400 hover:text-black hover:bg-slate-200 rounded-full transition-colors"
                    title="Reply"
                  >
                    <Reply size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-xs font-semibold text-slate-900">{isMe ? 'You' : msg.senderName}</span>
                  <span className="text-[10px] text-slate-400">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                {/* Reply Context Render */}
                {msg.replyTo && (
                  <div className={cn(
                    "mb-1 px-3 py-2 text-xs rounded-lg border-l-2 bg-opacity-50 flex flex-col cursor-pointer hover:opacity-80 transition-opacity",
                    isMe ? "bg-slate-50 border-slate-300 text-slate-500 text-right self-end" : "bg-white border-blue-400 text-slate-500 self-start shadow-sm"
                  )}>
                    <span className="font-bold text-[10px] text-slate-700 mb-0.5">{msg.replyTo.senderName}</span>
                    <span className="truncate max-w-[200px]">{msg.replyTo.content}</span>
                  </div>
                )}

                {msg.type === 'text' && (
                  <div className={cn("px-4 py-2.5 rounded-2xl text-sm shadow-sm", isMe ? "bg-black text-white rounded-tr-none" : "bg-white border border-slate-200 text-slate-800 rounded-tl-none")}>
                    {renderMessageContent(msg.content)}
                  </div>
                )}

                {msg.type === 'file' && msg.fileData && (
                  <div className={cn("overflow-hidden rounded-xl border shadow-sm", isMe ? "bg-black border-slate-900" : "bg-white border-slate-200")}>
                    {msg.fileData.type.startsWith('image/') ? (
                      <div className="relative group/img cursor-pointer" onClick={() => setFullScreenImage(`data:${msg.fileData!.type};base64,${msg.fileData!.url}`)}>
                        <img src={`data:${msg.fileData.type};base64,${msg.fileData.url}`} alt="attachment" className="max-w-xs max-h-64 object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors" />
                        <a
                          href={`data:${msg.fileData.type};base64,${msg.fileData.url}`}
                          download={msg.fileData.name}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-2 right-2 p-2 bg-black/50 text-white rounded-lg backdrop-blur-sm opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-black/70"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    ) : (
                      <div className={cn("p-4 flex items-center gap-3 w-64", isMe ? "text-white" : "text-slate-800")}>
                        <div className={cn("p-2 rounded-lg", isMe ? "bg-white/20" : "bg-slate-100 text-slate-600")}>
                          <FileText size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate">{msg.fileData.name}</div>
                          <div className="text-[10px] opacity-70">{(msg.fileData.size / 1024).toFixed(1)} KB</div>
                        </div>
                        <a
                          href={`data:${msg.fileData.type};base64,${msg.fileData.url}`}
                          download={msg.fileData.name}
                          className={cn("p-2 rounded-lg transition-colors", isMe ? "hover:bg-white/20" : "hover:bg-slate-100")}
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {msg.type === 'analysis' && (
                  <div
                    onClick={() => msg.attachment && onViewAnalysis(msg.attachment)}
                    className="cursor-pointer group/card relative overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all w-72 text-left"
                  >
                    <div className="h-1 absolute top-0 left-0 w-full bg-slate-900" />
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-600 border border-slate-100">
                          <FileText size={18} />
                        </div>
                        <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {msg.attachment?.documentType}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-900 text-sm mb-1 truncate">
                        Document Analysis
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {msg.attachment?.summary}
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600 group-hover/card:text-black">
                      <span>View Insights</span>
                      <Zap size={12} />
                    </div>
                  </div>
                )}

                {msg.type === 'idea-board' && (
                  <div className="relative overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm w-72 text-left group/board">
                    {msg.ideaBoardData?.snapshot ? (
                      <div
                        className="w-full h-40 bg-slate-100 border-b border-slate-100 overflow-hidden relative cursor-pointer"
                        onClick={() => setFullScreenImage(msg.ideaBoardData!.snapshot!)}
                      >
                        <img src={msg.ideaBoardData.snapshot} alt="Board Snapshot" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover/board:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/board:opacity-100">
                          <span className="bg-black/70 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">View Fullscreen</span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-1 absolute top-0 left-0 w-full bg-emerald-500" />
                    )}

                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2 text-emerald-600">
                        <Layout size={18} />
                        <span className="text-xs font-bold uppercase tracking-wider">Idea Framework</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 mb-1">
                        Shared a Board Snapshot
                      </p>
                      <p className="text-xs text-slate-500">
                        Contains {msg.ideaBoardData?.nodes.length} nodes and {msg.ideaBoardData?.connections.length} connections.
                      </p>
                    </div>
                    <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600 group-hover/board:text-black">
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent bubbling 
                          if (msg.ideaBoardData) onViewBoard(msg.ideaBoardData);
                        }}
                        className="flex items-center gap-1 hover:text-emerald-600 transition-colors w-full cursor-pointer p-1"
                      >
                        <span>Edit Board</span>
                        <ArrowUpRight size={14} className="ml-auto" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing Indicators */}
        {(typingUsers.length > 0 || isBotTyping) && (
          <div className="flex items-center gap-2 animate-pulse pl-11">
            <div className="flex items-center gap-1 bg-slate-100 px-3 py-2 rounded-2xl rounded-bl-none">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {isBotTyping
                ? "QT is thinking..."
                : `${typingUsers.join(', ')} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`
              }
            </span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          {/* Reply Preview Banner */}
          {replyingTo && (
            <div className="mb-2 flex items-center justify-between bg-slate-50 border-l-2 border-blue-500 p-3 rounded-r-lg shadow-sm animate-in slide-in-from-bottom-2">
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-blue-600 mb-0.5">Replying to {replyingTo.senderName}</div>
                <div className="text-xs text-slate-500 truncate">{replyingTo.content}</div>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            </div>
          )}

          <div className="flex items-end gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-100 transition-all">
            {/* File Attachment Button (No AI) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              title="Attach File (Image/PDF)"
            >
              <Paperclip size={18} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileSelect}
              accept="image/*,application/pdf"
            />

            <input
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={replyingTo ? "Type your reply..." : `Message #${channel.name}...`}
              className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 text-sm py-2.5 max-h-32 overflow-y-auto placeholder:text-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="p-2 bg-black text-white rounded-lg hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          Messages are end-to-end encrypted and stored locally.
        </p>
      </div>
    </div>
  );
};

export default ChatArea;