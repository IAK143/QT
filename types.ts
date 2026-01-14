
export interface ExtractedField {
  id: string;
  label: string;
  value: string | number;
  confidence?: number;
}

export interface TableRow {
  [key: string]: string | number;
}

export interface ExtractedTable {
  title: string;
  headers: string[];
  rows: TableRow[];
}

export interface AnalysisResult {
  id?: string;
  summary: string;
  documentType: 'Invoice' | 'Receipt' | 'Report' | 'Form' | 'Other';
  structuredData: ExtractedTable[];
  keyEntities: ExtractedField[];
  suggestedActions: string[];
}

export interface IdeaNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  color?: string;
}

export interface IdeaConnection {
  id: string;
  from: string;
  to: string;
}

export interface IdeaBoardData {
  nodes: IdeaNode[];
  connections: IdeaConnection[];
  snapshot?: string;
}

export interface ReplyContext {
  id: string;
  senderName: string;
  content: string;
}

export interface FileAttachment {
  url: string; // Base64
  name: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  content: string;
  channelId: string;
  type: 'text' | 'analysis' | 'idea-board' | 'system' | 'file'; 
  attachment?: AnalysisResult; 
  ideaBoardData?: IdeaBoardData;
  fileData?: FileAttachment;
  replyTo?: ReplyContext;
}

export interface Channel {
  id: string;
  name: string;
  type: 'work' | 'project' | 'social';
}

export interface UserProfile {
  id: string;
  name: string;
}

export interface PeerUser {
  id: string;
  name: string;
  isConnected: boolean;
}

export interface ConnectionRequest {
  peerId: string;
  peerName: string; // Name provided during handshake
}

export interface ChatInsight {
  summary: string;
  actionItems: string[];
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  topics: string[];
}

export interface DocQAMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
}

// --- Protocol Messages for P2P Handshake ---
export type P2PMessageType = 'HANDSHAKE_INIT' | 'HANDSHAKE_ACCEPT' | 'CHAT_MESSAGE' | 'CHANNEL_SYNC' | 'BOARD_UPDATE' | 'DELETE_MESSAGE' | 'TYPING_STATUS';

export interface P2PMessage {
  type: P2PMessageType;
  payload: any;
}

export interface TypingStatus {
    userId: string;
    userName: string;
    channelId: string;
    isTyping: boolean;
}

// --- Second Brain ---
export interface BrainMessage {
    id: string;
    role: 'user' | 'ai';
    content: string;
    image?: string; // base64
    timestamp: number;
}

// --- Workspace / Outcomes ---
export type WorkspaceType = 'decision' | 'proposal' | 'review' | 'sprint';

export interface WorkspaceSection {
    id: string;
    title: string;
    content: string;
    placeholder: string;
    helpText: string;
}

export interface Workspace {
    id: string;
    title: string;
    type: WorkspaceType;
    objective: string;
    status: 'active' | 'locked';
    sections: WorkspaceSection[];
    createdAt: number;
    updatedAt: number;
}

export interface WorkspaceChatMessage {
    id: string;
    role: 'user' | 'ai';
    text: string;
    timestamp: number;
}
