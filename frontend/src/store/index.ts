import { create } from 'zustand';
import type { Conversation, Message, GraphData, NodeDetail } from '../types';

interface Position {
  x: number;
  y: number;
}

interface AppState {
  conversations: Conversation[];
  activeConversationId: string | null;
  messages: Message[];
  isLoading: boolean;

  graphData: GraphData;
  nodePositions: Record<string, Position>;
  selectedNodeId: string | null;
  nodeDetail: NodeDetail | null;
  isNodeDetailLoading: boolean;

  rightPanel: 'graph' | 'node_detail';
  searchQuery: string;
  isSearching: boolean;
  showSearchPanel: boolean;
  showTimelinePanel: boolean;

  setConversations: (conversations: Conversation[]) => void;
  addOrUpdateConversation: (conversation: Conversation) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  setLoading: (loading: boolean) => void;

  setGraphData: (data: GraphData) => void;
  updateNodePosition: (nodeId: string, position: Position) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setNodeDetail: (detail: NodeDetail | null) => void;
  setNodeDetailLoading: (loading: boolean) => void;

  setRightPanel: (panel: 'graph' | 'node_detail') => void;
  setSearchQuery: (query: string) => void;
  setSearching: (v: boolean) => void;
  setShowSearchPanel: (v: boolean) => void;
  setShowTimelinePanel: (v: boolean) => void;
}

const NODE_COLS = 4;
const SPACING_X = 220;
const SPACING_Y = 160;
const ORIGIN_X = 80;
const ORIGIN_Y = 80;

function calcPosition(index: number): Position {
  return {
    x: ORIGIN_X + (index % NODE_COLS) * SPACING_X + (Math.random() - 0.5) * 40,
    y: ORIGIN_Y + Math.floor(index / NODE_COLS) * SPACING_Y + (Math.random() - 0.5) * 40,
  };
}

export const useAppStore = create<AppState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  isLoading: false,

  graphData: { nodes: [], edges: [] },
  nodePositions: {},
  selectedNodeId: null,
  nodeDetail: null,
  isNodeDetailLoading: false,

  rightPanel: 'graph',
  searchQuery: '',
  isSearching: false,
  showSearchPanel: false,
  showTimelinePanel: false,

  setConversations: (conversations) => set({ conversations }),

  addOrUpdateConversation: (conversation) =>
    set((state) => {
      const exists = state.conversations.find((c) => c.id === conversation.id);
      if (exists) {
        return {
          conversations: state.conversations.map((c) =>
            c.id === conversation.id ? conversation : c
          ),
        };
      }
      return { conversations: [conversation, ...state.conversations] };
    }),

  setActiveConversation: (id) => set({ activeConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (loading) => set({ isLoading: loading }),

  setGraphData: (data) =>
    set((state) => {
      const newPositions = { ...state.nodePositions };
      const existingCount = Object.keys(newPositions).length;
      let newCount = 0;
      data.nodes.forEach((node) => {
        if (!newPositions[node.id]) {
          newPositions[node.id] = calcPosition(existingCount + newCount);
          newCount++;
        }
      });
      return { graphData: data, nodePositions: newPositions };
    }),

  updateNodePosition: (nodeId, position) =>
    set((state) => ({
      nodePositions: { ...state.nodePositions, [nodeId]: position },
    })),

  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setNodeDetail: (detail) => set({ nodeDetail: detail }),
  setNodeDetailLoading: (loading) => set({ isNodeDetailLoading: loading }),

  setRightPanel: (panel) => set({ rightPanel: panel }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearching: (v) => set({ isSearching: v }),
  setShowSearchPanel: (v) => set({ showSearchPanel: v }),
  setShowTimelinePanel: (v) => set({ showTimelinePanel: v }),
}));
