
import { Channel, ChatMessage, IdeaBoardData, UserProfile, Workspace, DocQAMessage } from "../types";

const KEYS = {
  PROFILE: 'nexus_profile',
  CHANNELS: 'nexus_channels',
  MESSAGES: 'nexus_messages',
  IDEAS: 'nexus_ideas',
  WORKSPACES: 'nexus_workspaces',
  DOC_CHATS: 'nexus_doc_chats',
  GEMINI_KEY: 'nexus_gemini_key'
};

export const storageService = {
  // --- Profile ---
  saveProfile: (profile: UserProfile) => {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  },
  getProfile: (): UserProfile | null => {
    const data = localStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  },

  // --- Channels ---
  saveChannels: (channels: Channel[]) => {
    localStorage.setItem(KEYS.CHANNELS, JSON.stringify(channels));
  },
  getChannels: (): Channel[] | null => {
    const data = localStorage.getItem(KEYS.CHANNELS);
    return data ? JSON.parse(data) : null;
  },

  // --- Messages ---
  saveMessages: (messages: ChatMessage[]) => {
    // Basic limit to prevent localStorage overflow
    const recent = messages.slice(-500); 
    localStorage.setItem(KEYS.MESSAGES, JSON.stringify(recent));
  },
  getMessages: (): ChatMessage[] => {
    const data = localStorage.getItem(KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
  },

  // --- Idea Board ---
  saveIdeaBoard: (data: IdeaBoardData) => {
    localStorage.setItem(KEYS.IDEAS, JSON.stringify(data));
  },
  getIdeaBoard: (): IdeaBoardData => {
    const data = localStorage.getItem(KEYS.IDEAS);
    return data ? JSON.parse(data) : { nodes: [], connections: [] };
  },

  // --- Workspaces ---
  saveWorkspaces: (workspaces: Workspace[]) => {
      localStorage.setItem(KEYS.WORKSPACES, JSON.stringify(workspaces));
  },
  getWorkspaces: (): Workspace[] => {
      const data = localStorage.getItem(KEYS.WORKSPACES);
      return data ? JSON.parse(data) : [];
  },

  // --- Document Chats ---
  getAllDocChats: (): Record<string, DocQAMessage[]> => {
      const data = localStorage.getItem(KEYS.DOC_CHATS);
      return data ? JSON.parse(data) : {};
  },
  getDocChat: (docId: string): DocQAMessage[] => {
      const chats = storageService.getAllDocChats();
      return chats[docId] || [];
  },
  saveDocChat: (docId: string, messages: DocQAMessage[]) => {
      const chats = storageService.getAllDocChats();
      chats[docId] = messages;
      localStorage.setItem(KEYS.DOC_CHATS, JSON.stringify(chats));
  },

  // --- Gemini Key ---
  saveGeminiKey: (key: string) => {
    localStorage.setItem(KEYS.GEMINI_KEY, key);
  },
  getGeminiKey: (): string | null => {
    return localStorage.getItem(KEYS.GEMINI_KEY);
  },

  // --- Clear ---
  clearAll: () => {
    localStorage.clear();
  }
};
