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
  mergeGlobalNodes: (data: GraphData) => void;
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

function assignPositions(
  nodes: { id: string }[],
  existing: Record<string, Position>
): { positions: Record<string, Position> } {
  const positions = { ...existing };
  const existingCount = Object.keys(positions).length;
  let newCount = 0;
  nodes.forEach((node) => {
    if (!positions[node.id]) {
      positions[node.id] = calcPosition(existingCount + newCount);
      newCount++;
    }
  });
  return { positions };
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
      const { positions } = assignPositions(data.nodes, state.nodePositions);
      return { graphData: data, nodePositions: positions };
    }),

  mergeGlobalNodes: (data) =>
    set((state) => {
      const nodeById = new Map(state.graphData.nodes.map((n) => [n.id, n]));
      data.nodes.forEach((n) => nodeById.set(n.id, n));
      const mergedNodes = Array.from(nodeById.values());

      const edgeById = new Map(state.graphData.edges.map((e) => [e.id, e]));
      data.edges.forEach((e) => edgeById.set(e.id, e));
      const mergedEdges = Array.from(edgeById.values());

      const { positions } = assignPositions(mergedNodes, state.nodePositions);
      return { graphData: { nodes: mergedNodes, edges: mergedEdges }, nodePositions: positions };
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
