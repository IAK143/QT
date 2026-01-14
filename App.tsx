import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Layout/Sidebar';
import ChatArea from './components/Chat/ChatArea';
import RightPanel from './components/Layout/RightPanel';
import IdeaBoard from './components/IdeaBoard/IdeaBoard';
import DocumentAnalyst from './components/DocumentAnalyst/DocumentAnalyst';
import SecondBrain from './components/SecondBrain/SecondBrain';
import Onboarding from './components/Onboarding/Onboarding';
import LandingPage from './components/Layout/LandingPage';
import { CommandPalette } from './components/ui/CommandPalette';
import { Channel, ChatMessage, AnalysisResult, ChatInsight, IdeaNode, IdeaConnection, UserProfile, PeerUser, ConnectionRequest, ReplyContext, IdeaBoardData } from './types';
import { analyzeDocument, analyzeConversation, askBot } from './services/geminiService';
import { peerService } from './services/peerService';
import { storageService } from './services/storageService';
import { fileToBase64 } from './utils/fileHelpers';
import { Users, UserPlus, Check, X, Copy, ArrowUpRight, Loader2, UserMinus, Maximize, Minimize, Brain, MessageSquare, Layout, FileText, Zap } from 'lucide-react';
import { cn } from './utils/cn';

const App: React.FC = () => {
    // --- App State ---
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [showLanding, setShowLanding] = useState(true);
    const [setupPhase, setSetupPhase] = useState<'none' | 'loading' | 'complete'>('none');
    const [loadingStep, setLoadingStep] = useState(0); // 0: Init, 1: Keys, 2: Database, 3: Network

    const [initError, setInitError] = useState<string | null>(null);

    const [activeView, setActiveView] = useState<'chat' | 'ideas' | 'network' | 'analysis' | 'second-brain'>('chat');

    // UX State
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isCmdPaletteOpen, setIsCmdPaletteOpen] = useState(false);

    // Data State
    const [channels, setChannels] = useState<Channel[]>([]);
    const [activeChannelId, setActiveChannelId] = useState<string>('general');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

    // Typing State
    const [typingUsers, setTypingUsers] = useState<Record<string, { name: string, channelId: string }>>({}); // userId -> info
    const [isBotTyping, setIsBotTyping] = useState(false);

    // Ref to track activeChannelId inside event callbacks to avoid stale closures
    const activeChannelRef = useRef(activeChannelId);

    // P2P State
    const [peers, setPeers] = useState<PeerUser[]>([]);
    const [pendingRequests, setPendingRequests] = useState<ConnectionRequest[]>([]); // Incoming
    const [sentRequests, setSentRequests] = useState<string[]>([]); // Outgoing IDs
    const [addPeerInput, setAddPeerInput] = useState('');
    const [showInvitePopup, setShowInvitePopup] = useState<string | null>(null);

    // AI State
    const [activeDoc, setActiveDoc] = useState<AnalysisResult | null>(null);
    const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);
    const [chatInsight, setChatInsight] = useState<ChatInsight | null>(null);
    const [isAnalyzingChat, setIsAnalyzingChat] = useState(false);

    // Idea Board State
    const [ideaNodes, setIdeaNodes] = useState<IdeaNode[]>([]);
    const [ideaConnections, setIdeaConnections] = useState<IdeaConnection[]>([]);
    const [isLiveBoard, setIsLiveBoard] = useState(false);
    const ignoreNextBoardUpdate = useRef(false);

    const activeChannel = channels.find(c => c.id === activeChannelId) || channels[0];

    useEffect(() => {
        activeChannelRef.current = activeChannelId;
    }, [activeChannelId]);

    // --- Initialization & Persistence ---

    // 1. Load Data from Storage
    useEffect(() => {
        const savedProfile = storageService.getProfile();
        const savedChannels = storageService.getChannels();
        const savedMessages = storageService.getMessages();
        const savedBoard = storageService.getIdeaBoard();

        if (savedProfile) {
            setProfile(savedProfile);
            setShowLanding(false); // Skip landing if profile exists
            setSetupPhase('complete');
        }

        if (savedChannels) setChannels(savedChannels);
        else setChannels([{ id: 'general', name: 'General', type: 'social' }]);

        if (savedMessages) setMessages(savedMessages);
        if (savedBoard) {
            setIdeaNodes(savedBoard.nodes);
            setIdeaConnections(savedBoard.connections);
        }
    }, []);

    // 2. Initialize Peer Service
    useEffect(() => {
        if (profile) {
            // Initialize if not already running
            if (!peerService.isInitialized()) {
                peerService.initialize(profile.id, profile.name)
                    .then(() => {
                        console.log("Peer Service Ready");
                        setInitError(null);
                    })
                    .catch(err => {
                        console.error("Init Error", err);
                        if (err.message === 'ID_TAKEN') {
                            setProfile(null);
                            setShowLanding(false); // Show onboarding again
                            setSetupPhase('none');
                            setInitError("This ID is already taken. Please choose another.");
                        } else {
                            setInitError("Failed to connect to P2P network.");
                        }
                    });
            }

            // Setup Callbacks
            peerService.onMessage((msg) => {
                setMessages(prev => {
                    const updated = [...prev, msg];
                    storageService.saveMessages(updated);
                    return updated;
                });

                // Clear typing status if we get a message from that user
                setTypingUsers(prev => {
                    const next = { ...prev };
                    delete next[msg.senderId];
                    return next;
                });

                if (msg.channelId !== activeChannelRef.current) {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [msg.channelId]: (prev[msg.channelId] || 0) + 1
                    }));
                }
            });

            peerService.onConnectionRequest((peerId, peerName) => {
                setPendingRequests(prev => {
                    if (prev.find(r => r.peerId === peerId)) return prev;
                    return [...prev, { peerId, peerName }];
                });
            });

            peerService.onPeerConnected((peerId, peerName) => {
                setPendingRequests(prev => prev.filter(r => r.peerId !== peerId));
                setSentRequests(prev => prev.filter(id => id !== peerId));

                setPeers(prev => {
                    if (prev.find(p => p.id === peerId)) return prev;
                    return [...prev, { id: peerId, name: peerName || peerId, isConnected: true }];
                });

                peerService.syncChannels(channels);
            });

            peerService.onPeerDisconnected((peerId) => {
                setPeers(prev => prev.filter(p => p.id !== peerId));
                setTypingUsers(prev => {
                    const next = { ...prev };
                    delete next[peerId];
                    return next;
                });
            });

            peerService.onChannelSync((syncedChannels) => {
                setChannels(prev => {
                    const existingIds = new Set(prev.map(c => c.id));
                    const newChannels = syncedChannels.filter(c => !existingIds.has(c.id));
                    return [...prev, ...newChannels];
                });
            });

            peerService.onBoardUpdate((data) => {
                ignoreNextBoardUpdate.current = true;
                setIdeaNodes(data.nodes);
                setIdeaConnections(data.connections);
            });

            peerService.onMessageDeleted((id) => {
                setMessages(prev => {
                    const updated = prev.filter(m => m.id !== id);
                    storageService.saveMessages(updated);
                    return updated;
                });
            });

            peerService.onTypingStatus((status) => {
                setTypingUsers(prev => {
                    if (status.isTyping) {
                        return {
                            ...prev,
                            [status.userId]: { name: status.userName, channelId: status.channelId }
                        };
                    } else {
                        const next = { ...prev };
                        delete next[status.userId];
                        return next;
                    }
                });
            });
        }
    }, [profile, channels]);

    // 3. Auto-save effects
    useEffect(() => {
        if (channels.length > 0) storageService.saveChannels(channels);
    }, [channels]);

    useEffect(() => {
        storageService.saveIdeaBoard({ nodes: ideaNodes, connections: ideaConnections });
    }, [ideaNodes, ideaConnections]);

    useEffect(() => {
        if (showInvitePopup) {
            const timer = setTimeout(() => setShowInvitePopup(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [showInvitePopup]);

    // 4. Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsCmdPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // --- Logic Handlers ---

    const handleChannelSelect = (channelId: string) => {
        setActiveChannelId(channelId);
        setActiveView('chat');
        setUnreadCounts(prev => ({
            ...prev,
            [channelId]: 0
        }));
    };

    const handleOnboardingComplete = async (newProfile: UserProfile) => {
        setInitError(null);

        // Start fake loading sequence for UX
        setSetupPhase('loading');

        // Step 1
        setLoadingStep(1);
        await new Promise(r => setTimeout(r, 800));

        // Step 2
        setLoadingStep(2);
        await new Promise(r => setTimeout(r, 800));

        // Step 3 (Try Real Init)
        setLoadingStep(3);
        try {
            await peerService.initialize(newProfile.id, newProfile.name);
            setProfile(newProfile);
            storageService.saveProfile(newProfile);

            if (channels.length === 0) {
                const defaults: Channel[] = [{ id: 'general', name: 'General', type: 'social' }];
                setChannels(defaults);
                storageService.saveChannels(defaults);
            }

            await new Promise(r => setTimeout(r, 600)); // Final polish delay
            setSetupPhase('complete');
        } catch (err: any) {
            console.error("Onboarding failed:", err);
            setSetupPhase('none'); // Reset to show onboarding again
            if (err.message === 'ID_TAKEN') {
                setInitError("ID is already taken. Please choose another.");
            } else {
                setInitError("Connection failed. Please check your internet.");
            }
        }
    };

    const handleSendMessage = async (text: string, replyTo?: ReplyContext) => {
        if (!profile) return;
        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            senderId: profile.id,
            senderName: profile.name,
            timestamp: Date.now(),
            content: text,
            channelId: activeChannelId,
            type: 'text',
            replyTo: replyTo
        };

        setMessages(prev => {
            const updated = [...prev, newMessage];
            storageService.saveMessages(updated);
            return updated;
        });
        peerService.broadcast(newMessage);

        // AI Bot Trigger: Check if message starts with @QT
        const qtMatch = text.match(/^@QT\s+(.+)/i);
        if (qtMatch) {
            const question = qtMatch[1];
            setIsBotTyping(true);
            try {
                // Generate answer using Gemini
                const answer = await askBot(question);

                const botMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    senderName: 'QT',
                    content: answer,
                    channelId: activeChannelId,
                    type: 'text',
                    replyTo: {
                        id: newMessage.id,
                        senderName: newMessage.senderName,
                        content: newMessage.content
                    }
                };

                setMessages(prev => {
                    const updated = [...prev, botMessage];
                    storageService.saveMessages(updated);
                    return updated;
                });
                peerService.broadcast(botMessage);
            } catch (e) {
                console.error("Bot failed", e);
            } finally {
                setIsBotTyping(false);
            }
        }
    };

    const handleDeleteMessage = (messageId: string) => {
        // Optimistically delete
        setMessages(prev => {
            const updated = prev.filter(m => m.id !== messageId);
            storageService.saveMessages(updated);
            return updated;
        });
        peerService.broadcastDelete(messageId);
    };

    const handleSendFile = async (file: File, replyTo?: ReplyContext) => {
        if (!profile) return;
        try {
            const base64 = await fileToBase64(file);
            const newMessage: ChatMessage = {
                id: Date.now().toString(),
                senderId: profile.id,
                senderName: profile.name,
                timestamp: Date.now(),
                content: '',
                channelId: activeChannelId,
                type: 'file',
                replyTo: replyTo,
                fileData: {
                    url: base64,
                    name: file.name,
                    type: file.type,
                    size: file.size
                }
            };

            setMessages(prev => {
                const updated = [...prev, newMessage];
                storageService.saveMessages(updated);
                return updated;
            });
            peerService.broadcast(newMessage);

        } catch (e) {
            console.error("File send error", e);
            alert("Failed to send file.");
        }
    };

    const handleFileUpload = async (file: File) => {
        if (!profile) return;
        setIsAnalyzingDoc(true);
        try {
            const analysis = await analyzeDocument(file);
            setActiveDoc(analysis);
        } catch (e) {
            console.error(e);
            alert("Failed to analyze document");
        } finally {
            setIsAnalyzingDoc(false);
        }
    };

    const handleShareAnalysis = (targetChannelId: string) => {
        if (!profile || !activeDoc) return;
        const analysisMessage: ChatMessage = {
            id: Date.now().toString(),
            senderId: profile.id,
            senderName: profile.name,
            timestamp: Date.now(),
            content: `Shared Analysis: ${activeDoc.documentType}`,
            channelId: targetChannelId,
            type: 'analysis',
            attachment: activeDoc
        };

        setMessages(prev => {
            const updated = [...prev, analysisMessage];
            storageService.saveMessages(updated);
            return updated;
        });
        peerService.broadcast(analysisMessage);
        handleChannelSelect(targetChannelId);
    };

    const handleAnalyzeChat = async () => {
        const channelMsgs = messages.filter(m => m.channelId === activeChannelId);
        if (channelMsgs.length === 0) return;

        setIsAnalyzingChat(true);
        try {
            const insight = await analyzeConversation(channelMsgs.slice(-50));
            setChatInsight(insight);
        } catch (e) {
            console.error(e);
        } finally {
            setIsAnalyzingChat(false);
        }
    };

    const handleCreateChannel = (name: string) => {
        const newChannel: Channel = {
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            type: 'project'
        };
        if (!channels.find(c => c.id === newChannel.id)) {
            setChannels(prev => [...prev, newChannel]);
            handleChannelSelect(newChannel.id);
            peerService.syncChannels([...channels, newChannel]);
        }
    };

    const handleBoardNodesChange = (newNodes: IdeaNode[]) => {
        setIdeaNodes(newNodes);
        if (isLiveBoard) {
            if (ignoreNextBoardUpdate.current) {
                ignoreNextBoardUpdate.current = false;
            } else {
                peerService.broadcastBoard({ nodes: newNodes, connections: ideaConnections });
            }
        }
    };

    const handleBoardConnectionsChange = (newConns: IdeaConnection[]) => {
        setIdeaConnections(newConns);
        if (isLiveBoard) {
            if (ignoreNextBoardUpdate.current) {
                ignoreNextBoardUpdate.current = false;
            } else {
                peerService.broadcastBoard({ nodes: ideaNodes, connections: newConns });
            }
        }
    };

    const handleShareBoard = (targetChannelId: string, snapshot?: string) => {
        if (!profile) return;
        const snapshotNodes = [...ideaNodes];
        const snapshotConnections = [...ideaConnections];

        const shareMessage: ChatMessage = {
            id: Date.now().toString(),
            senderId: profile.id,
            senderName: profile.name,
            timestamp: Date.now(),
            content: 'Shared Idea Framework',
            channelId: targetChannelId,
            type: 'idea-board',
            ideaBoardData: {
                nodes: snapshotNodes,
                connections: snapshotConnections,
                snapshot: snapshot
            }
        };
        setMessages(prev => {
            const updated = [...prev, shareMessage];
            storageService.saveMessages(updated);
            return updated;
        });
        peerService.broadcast(shareMessage);
        if (activeChannelId !== targetChannelId) {
            handleChannelSelect(targetChannelId);
        }
        setActiveView('chat');
    };

    const handleViewSharedBoard = (data: { nodes: IdeaNode[], connections: IdeaConnection[] }) => {
        // Directly switch to board view with data without blocking confirm dialog
        const newNodes = data.nodes.map(n => ({ ...n }));
        const newConnections = data.connections.map(c => ({ ...c }));
        setIdeaNodes(newNodes);
        setIdeaConnections(newConnections);
        setActiveView('ideas');
        setIsLiveBoard(false);
    };

    const handleAddPeer = (peerId: string) => {
        if (peerId === profile?.id) return alert("You cannot invite yourself.");
        if (peers.some(p => p.id === peerId)) return alert("Already connected to this peer.");
        if (sentRequests.includes(peerId)) return alert("Invite already sent.");
        if (pendingRequests.some(r => r.peerId === peerId)) return alert("This peer has already sent you an invite. Check 'Received Invites'.");

        peerService.connectToPeer(peerId);
        setSentRequests(prev => [...prev, peerId]);
        setShowInvitePopup(peerId);
    };

    const handleCancelInvite = (peerId: string) => {
        peerService.cancelRequest(peerId);
        setSentRequests(prev => prev.filter(id => id !== peerId));
    };
    const handleAcceptRequest = (peerId: string) => { peerService.acceptConnection(peerId); };
    const handleRejectRequest = (peerId: string) => {
        peerService.rejectConnection(peerId);
        setPendingRequests(prev => prev.filter(r => r.peerId !== peerId));
    };
    const handleRemovePeer = (peerId: string) => {
        if (confirm("Are you sure you want to disconnect from this peer?")) {
            peerService.disconnectPeer(peerId);
        }
    };

    // --- RENDERING VIEWS ---

    if (showLanding) {
        return <LandingPage onEnter={() => setShowLanding(false)} />;
    }

    if (setupPhase === 'none' && !profile) {
        return <Onboarding onComplete={handleOnboardingComplete} error={initError} />;
    }

    // --- New Loading Sequence ---
    if (setupPhase === 'loading') {
        return (
            <div className="fixed inset-0 bg-[#fcfcfc] flex flex-col items-center justify-center">
                <div className="w-full max-w-xs space-y-8">
                    <div className="flex justify-between items-end px-1">
                        <span className="text-xs font-bold text-slate-900 tracking-wider uppercase">Initializing Workspace</span>
                        <span className="text-xs font-mono text-slate-400">{loadingStep}/3</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-slate-900 transition-all duration-700 ease-out"
                            style={{ width: `${(loadingStep / 3) * 100}%` }}
                        />
                    </div>

                    <div className="space-y-3">
                        <div className={cn("flex items-center gap-3 transition-opacity duration-500", loadingStep >= 1 ? "opacity-100" : "opacity-30")}>
                            <div className={cn("w-2 h-2 rounded-full", loadingStep > 1 ? "bg-emerald-500" : "bg-slate-300 animate-pulse")} />
                            <span className="text-sm text-slate-600">Generating encryption keys...</span>
                        </div>
                        <div className={cn("flex items-center gap-3 transition-opacity duration-500", loadingStep >= 2 ? "opacity-100" : "opacity-30")}>
                            <div className={cn("w-2 h-2 rounded-full", loadingStep > 2 ? "bg-emerald-500" : "bg-slate-300 animate-pulse")} />
                            <span className="text-sm text-slate-600">Syncing local database...</span>
                        </div>
                        <div className={cn("flex items-center gap-3 transition-opacity duration-500", loadingStep >= 3 ? "opacity-100" : "opacity-30")}>
                            <div className={cn("w-2 h-2 rounded-full", loadingStep > 3 ? "bg-emerald-500" : "bg-slate-300 animate-pulse")} />
                            <span className="text-sm text-slate-600">Establishing P2P listener...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Filter typing users for current channel
    const activeTypers = (Object.values(typingUsers) as { name: string, channelId: string }[])
        .filter(u => u.channelId === activeChannelId)
        .map(u => u.name);

    // --- Main App ---
    if (!profile) return null; // Should be handled by setupPhase but safety check

    const actions = [
        { id: 'focus', label: isFocusMode ? 'Exit Focus Mode' : 'Enter Focus Mode', icon: isFocusMode ? <Minimize size={16} /> : <Maximize size={16} />, shortcut: 'F', action: () => setIsFocusMode(!isFocusMode) },
        { id: 'brain', label: 'Open Second Brain', icon: <Brain size={16} />, shortcut: 'B', action: () => setActiveView('second-brain') },
        { id: 'chat', label: 'Go to Chat', icon: <MessageSquare size={16} />, shortcut: 'C', action: () => setActiveView('chat') },
        { id: 'ideas', label: 'Idea Framework', icon: <Layout size={16} />, shortcut: 'I', action: () => setActiveView('ideas') },
        { id: 'analysis', label: 'Document Analyst', icon: <FileText size={16} />, shortcut: 'D', action: () => setActiveView('analysis') },
        { id: 'network', label: 'Manage Network', icon: <Users size={16} />, shortcut: 'N', action: () => setActiveView('network') },
        { id: 'synth', label: 'Analyze Current Chat', icon: <Zap size={16} />, action: handleAnalyzeChat },
    ];

    return (
        <div className="h-screen w-screen flex bg-slate-50 overflow-hidden font-sans text-slate-900 relative animate-fade-in">
            {/* Global Elements */}
            <CommandPalette isOpen={isCmdPaletteOpen} onClose={() => setIsCmdPaletteOpen(false)} actions={actions} />

            {/* Invite Popup */}
            {showInvitePopup && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                        <ArrowUpRight size={14} />
                    </div>
                    <div>
                        <div className="font-bold text-sm">Invite Sent</div>
                        <div className="text-xs text-slate-300">Waiting for {showInvitePopup} to accept...</div>
                    </div>
                </div>
            )}

            {/* Focus Mode Exit Button */}
            {isFocusMode && (
                <button
                    onClick={() => setIsFocusMode(false)}
                    className="fixed bottom-6 right-6 z-50 bg-black/80 hover:bg-black text-white px-4 py-2 rounded-full backdrop-blur shadow-lg text-xs font-bold transition-all flex items-center gap-2 hover:scale-105 active:scale-95"
                >
                    <Minimize size={14} /> Exit Focus
                </button>
            )}



            {!isFocusMode && (
                <Sidebar
                    myId={profile.id}
                    activeView={activeView}
                    activeChannelId={activeChannelId}
                    channels={channels}
                    peers={peers}
                    pendingRequests={pendingRequests}
                    unreadCounts={unreadCounts}
                    onChangeView={setActiveView}
                    onSelectChannel={handleChannelSelect}
                    onCreateChannel={handleCreateChannel}
                    onAddPeer={handleAddPeer}
                    onAcceptPeer={handleAcceptRequest}
                    onRejectPeer={handleRejectRequest}
                />
            )}

            <main className="flex-1 flex h-full relative transition-all duration-300">
                {activeView === 'chat' && (
                    <ChatArea
                        channel={activeChannel}
                        messages={messages}
                        myId={profile.id}
                        typingUsers={activeTypers}
                        isBotTyping={isBotTyping}
                        onSendMessage={handleSendMessage}
                        onSendFile={handleSendFile}
                        onViewAnalysis={(doc) => { setActiveDoc(doc); setActiveView('analysis'); }}
                        onViewBoard={handleViewSharedBoard}
                        onDeleteMessage={handleDeleteMessage}
                    />
                )}

                {activeView === 'analysis' && (
                    <DocumentAnalyst
                        activeDoc={activeDoc}
                        onFileUpload={handleFileUpload}
                        isAnalyzing={isAnalyzingDoc}
                        channels={channels}
                        onShare={handleShareAnalysis}
                    />
                )}

                {activeView === 'ideas' && (
                    <IdeaBoard
                        nodes={ideaNodes}
                        connections={ideaConnections}
                        channels={channels}
                        isLive={isLiveBoard}
                        onNodesChange={handleBoardNodesChange}
                        onConnectionsChange={handleBoardConnectionsChange}
                        onShare={handleShareBoard}
                        onToggleLive={() => setIsLiveBoard(!isLiveBoard)}
                    />
                )}

                {activeView === 'second-brain' && (
                    <SecondBrain />
                )}

                {activeView === 'network' && (
                    <div className="flex-1 overflow-y-auto p-8 bg-[#f9fafb]">
                        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 mb-2">Network Management</h1>
                                <p className="text-slate-500">Connect with peers to collaborate in real-time.</p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <div className="text-xs font-bold uppercase text-slate-400 mb-2">My Unique ID</div>
                                <div className="flex gap-2">
                                    <code className="flex-1 bg-slate-50 p-3 rounded-lg font-mono text-sm border border-slate-200 select-all">
                                        {profile.id}
                                    </code>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(profile.id)}
                                        className="bg-black text-white px-4 rounded-lg font-medium text-sm hover:opacity-80 transition-opacity flex items-center gap-2 active:scale-95"
                                    >
                                        <Copy size={16} /> Copy
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">Share this ID with others so they can invite you.</p>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <UserPlus size={20} className="text-slate-400" /> Send Invite
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        value={addPeerInput}
                                        onChange={(e) => setAddPeerInput(e.target.value)}
                                        placeholder="Enter Peer ID..."
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:outline-none focus:border-slate-400 transition-all"
                                    />
                                    <button
                                        onClick={() => { if (addPeerInput) { handleAddPeer(addPeerInput); setAddPeerInput(''); } }}
                                        className="bg-black text-white px-6 rounded-lg font-bold text-sm hover:opacity-80 transition-opacity active:scale-95"
                                    >
                                        Connect
                                    </button>
                                </div>
                            </div>

                            {sentRequests.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Sent Requests</h3>
                                    <div className="space-y-2">
                                        {sentRequests.map(id => (
                                            <div key={id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                                                        <Loader2 size={16} className="animate-spin text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm">{id}</div>
                                                        <div className="text-xs text-slate-400">Request pending...</div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleCancelInvite(id)}
                                                    className="p-2 text-slate-400 hover:bg-slate-50 hover:text-red-500 rounded-lg transition-colors"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {pendingRequests.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Received Invites</h3>
                                    <div className="space-y-2">
                                        {pendingRequests.map(req => (
                                            <div key={req.peerId} className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between">
                                                <div>
                                                    <div className="font-bold text-slate-900">{req.peerName}</div>
                                                    <div className="text-xs font-mono text-slate-400">{req.peerId}</div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAcceptRequest(req.peerId)}
                                                        className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                                    >
                                                        <Check size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectRequest(req.peerId)}
                                                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {peers.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">Connected Peers ({peers.length})</h3>
                                    <div className="grid grid-cols-1 gap-2">
                                        {peers.map(p => (
                                            <div key={p.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                                                        {p.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm text-slate-900">{p.name}</div>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                            <span className="text-[10px] text-emerald-600 font-medium">Active</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleRemovePeer(p.id)}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <UserMinus size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeView === 'chat' && !isFocusMode && (
                    <RightPanel
                        chatInsight={chatInsight}
                        isAnalyzing={isAnalyzingChat}
                        onAnalyzeChat={handleAnalyzeChat}
                    />
                )}
            </main>
        </div>
    );
};

export default App;
