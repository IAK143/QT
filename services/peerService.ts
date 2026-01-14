import { Peer, DataConnection } from "peerjs";
import { ChatMessage, Channel, P2PMessage, IdeaBoardData, TypingStatus } from "../types";

type ConnectionHandler = (peerId: string, peerName: string) => void;
type MessageHandler = (msg: ChatMessage) => void;
type ChannelSyncHandler = (channels: Channel[]) => void;
type BoardUpdateHandler = (data: IdeaBoardData) => void;
type MessageDeleteHandler = (messageId: string) => void;
type TypingHandler = (status: TypingStatus) => void;

export class PeerService {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  // Pending INCOMING connections
  private pendingIncoming: Map<string, DataConnection> = new Map();
  // Pending OUTGOING connections
  private pendingOutgoing: Map<string, DataConnection> = new Map();
  
  private onMessageCallback: MessageHandler | null = null;
  private onConnectionRequestCallback: ConnectionHandler | null = null;
  private onPeerConnectedCallback: ConnectionHandler | null = null;
  private onPeerDisconnectedCallback: ((peerId: string) => void) | null = null;
  private onChannelSyncCallback: ChannelSyncHandler | null = null;
  private onBoardUpdateCallback: BoardUpdateHandler | null = null;
  private onMessageDeletedCallback: MessageDeleteHandler | null = null;
  private onTypingCallback: TypingHandler | null = null;

  private myName: string = '';

  initialize(userId: string, userName: string): Promise<string> {
    this.myName = userName;
    // If already initialized with same ID, just resolve
    if (this.peer && !this.peer.destroyed && this.peer.id === userId) {
        return Promise.resolve(userId);
    }

    return new Promise((resolve, reject) => {
      this.peer = new Peer(userId, {
        debug: 1, 
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.peer.on('open', (id) => {
        console.log('PeerService Initialized:', id);
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error("Peer Error", err);
        if (err.type === 'unavailable-id') {
            reject(new Error('ID_TAKEN'));
        } else {
            reject(err);
        }
      });
    });
  }

  isInitialized() {
      return this.peer !== null && !this.peer.destroyed;
  }

  // --- Initiating Connection ---
  connectToPeer(peerId: string) {
    if (!this.peer) return;
    if (this.connections.has(peerId)) return; 
    
    // Close existing pending outgoing if retrying
    if (this.pendingOutgoing.has(peerId)) {
        this.pendingOutgoing.get(peerId)?.close();
    }

    console.log("Initiating connection to", peerId);
    const conn = this.peer.connect(peerId, { metadata: { name: this.myName } });
    
    // Store in outgoing pending
    this.pendingOutgoing.set(peerId, conn);

    conn.on('open', () => {
      // Send Handshake
      const handshake: P2PMessage = { type: 'HANDSHAKE_INIT', payload: { name: this.myName } };
      conn.send(handshake);
    });

    this.setupDataListener(conn);
  }

  // --- Handling Incoming ---
  private handleIncomingConnection(conn: DataConnection) {
    console.log("Incoming connection from", conn.peer);
    
    conn.on('open', () => {
        this.setupDataListener(conn);
    });
  }

  private setupDataListener(conn: DataConnection) {
    conn.on('data', (data: any) => {
        const msg = data as P2PMessage;

        if (msg.type === 'HANDSHAKE_INIT') {
            // Received invite (INCOMING)
            const peerName = msg.payload.name;
            this.pendingIncoming.set(conn.peer, conn);
            if (this.onConnectionRequestCallback) {
                this.onConnectionRequestCallback(conn.peer, peerName);
            }
        } 
        else if (msg.type === 'HANDSHAKE_ACCEPT') {
            // They accepted our invite (Response to OUTGOING)
            const peerName = msg.payload.name;
            // Remove from outgoing pending, move to active
            this.pendingOutgoing.delete(conn.peer);
            this.finalizeConnection(conn, peerName);
        } 
        else if (msg.type === 'CHAT_MESSAGE') {
            // Regular Chat
            if (this.onMessageCallback) {
                this.onMessageCallback(msg.payload as ChatMessage);
            }
        }
        else if (msg.type === 'CHANNEL_SYNC') {
            if (this.onChannelSyncCallback && Array.isArray(msg.payload)) {
                this.onChannelSyncCallback(msg.payload as Channel[]);
            }
        }
        else if (msg.type === 'BOARD_UPDATE') {
            if (this.onBoardUpdateCallback) {
                this.onBoardUpdateCallback(msg.payload as IdeaBoardData);
            }
        }
        else if (msg.type === 'DELETE_MESSAGE') {
            if (this.onMessageDeletedCallback) {
                this.onMessageDeletedCallback(msg.payload.id);
            }
        }
        else if (msg.type === 'TYPING_STATUS') {
            if (this.onTypingCallback) {
                this.onTypingCallback(msg.payload as TypingStatus);
            }
        }
    });

    conn.on('close', () => {
        this.connections.delete(conn.peer);
        this.pendingIncoming.delete(conn.peer);
        this.pendingOutgoing.delete(conn.peer);
        if (this.onPeerDisconnectedCallback) {
            this.onPeerDisconnectedCallback(conn.peer);
        }
    });
    
    conn.on('error', (err) => {
        console.error("Connection Error", err);
        this.connections.delete(conn.peer);
        this.pendingOutgoing.delete(conn.peer);
    });
  }

  // --- Actions ---
  acceptConnection(peerId: string) {
    const conn = this.pendingIncoming.get(peerId);
    if (conn) {
        const response: P2PMessage = { type: 'HANDSHAKE_ACCEPT', payload: { name: this.myName } };
        conn.send(response);
        this.pendingIncoming.delete(peerId);
        this.finalizeConnection(conn, peerId); 
    }
  }

  rejectConnection(peerId: string) {
    // Reject Incoming
    const conn = this.pendingIncoming.get(peerId);
    if (conn) {
        conn.close();
        this.pendingIncoming.delete(peerId);
    }
  }

  cancelRequest(peerId: string) {
      // Cancel Outgoing
      const conn = this.pendingOutgoing.get(peerId);
      if (conn) {
          conn.close();
          this.pendingOutgoing.delete(peerId);
      }
  }

  disconnectPeer(peerId: string) {
      const conn = this.connections.get(peerId);
      if (conn) {
          conn.close();
          this.connections.delete(peerId);
          if (this.onPeerDisconnectedCallback) {
            this.onPeerDisconnectedCallback(peerId);
          }
      }
  }

  private finalizeConnection(conn: DataConnection, name: string) {
      this.connections.set(conn.peer, conn);
      console.log("Connection finalized with", conn.peer);
      if (this.onPeerConnectedCallback) {
          this.onPeerConnectedCallback(conn.peer, name);
      }
  }

  broadcast(message: ChatMessage) {
    const packet: P2PMessage = { type: 'CHAT_MESSAGE', payload: message };
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(packet);
      }
    });
  }
  
  broadcastDelete(messageId: string) {
      const packet: P2PMessage = { type: 'DELETE_MESSAGE', payload: { id: messageId } };
      this.connections.forEach((conn) => {
          if (conn.open) conn.send(packet);
      });
  }

  syncChannels(channels: Channel[]) {
      const packet: P2PMessage = { type: 'CHANNEL_SYNC', payload: channels };
      this.connections.forEach((conn) => {
          if (conn.open) conn.send(packet);
      });
  }

  broadcastBoard(data: IdeaBoardData) {
      const packet: P2PMessage = { type: 'BOARD_UPDATE', payload: data };
      this.connections.forEach((conn) => {
          if (conn.open) conn.send(packet);
      });
  }

  broadcastTyping(channelId: string, isTyping: boolean) {
      if (!this.peer) return;
      const packet: P2PMessage = { 
          type: 'TYPING_STATUS', 
          payload: { 
              userId: this.peer.id,
              userName: this.myName,
              channelId,
              isTyping
          } 
      };
      this.connections.forEach((conn) => {
          if (conn.open) conn.send(packet);
      });
  }

  // --- Callbacks ---
  onMessage(cb: MessageHandler) { this.onMessageCallback = cb; }
  onConnectionRequest(cb: ConnectionHandler) { this.onConnectionRequestCallback = cb; }
  onPeerConnected(cb: ConnectionHandler) { this.onPeerConnectedCallback = cb; }
  onPeerDisconnected(cb: (id: string) => void) { this.onPeerDisconnectedCallback = cb; }
  onChannelSync(cb: ChannelSyncHandler) { this.onChannelSyncCallback = cb; }
  onBoardUpdate(cb: BoardUpdateHandler) { this.onBoardUpdateCallback = cb; }
  onMessageDeleted(cb: MessageDeleteHandler) { this.onMessageDeletedCallback = cb; }
  onTypingStatus(cb: TypingHandler) { this.onTypingCallback = cb; }
}

export const peerService = new PeerService();
