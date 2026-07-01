import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from './store';
import * as api from './api/client';
import ConversationSidebar from './components/Chat/ConversationSidebar';
import ChatPanel from './components/Chat/ChatPanel';
import GraphPanel from './components/Graph/GraphPanel';
import NodeDetail from './components/NodeDetail/NodeDetail';
import SearchPanel from './components/Search/SearchPanel';
import TimelinePanel from './components/Timeline/TimelinePanel';
import AgentPanel from './components/Agent/AgentPanel';
import CreateAgentModal from './components/Agent/CreateAgentModal';
import IntegrationConfig from './components/Integration/IntegrationConfig';
import type { GraphData, GraphNode } from './types';

export default function App() {
  const {
    setConversations,
    setGraphData,
    rightPanel,
    searchQuery,
    setSearchQuery,
    showSearchPanel,
    setShowSearchPanel,
    showTimelinePanel,
    setShowTimelinePanel,
  } = useAppStore();

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  // Phase 3 state
  const [activeAgentNode, setActiveAgentNode] = useState<GraphNode | null>(null);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [showIntegrationConfig, setShowIntegrationConfig] = useState(false);

  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket('ws://localhost:8000/ws');
    wsRef.current = ws;
    setWsStatus('connecting');
    ws.onopen = () => setWsStatus('connected');
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'graph_update') {
          setGraphData({ nodes: data.nodes, edges: data.edges } as GraphData);
        }
      } catch { /* ignore */ }
    };
    ws.onclose = () => {
      setWsStatus('disconnected');
      reconnectRef.current = setTimeout(connectWebSocket, 3000);
    };
    ws.onerror = () => ws.close();
  }, [setGraphData]);

  useEffect(() => {
    const init = async () => {
      try {
        const [conversations, graph] = await Promise.all([
          api.getConversations(),
          api.getGraph(),
        ]);
        setConversations(conversations);
        setGraphData(graph);
      } catch { /* backend may not be ready */ }
    };
    init();
    connectWebSocket();
    return () => {
      wsRef.current?.close();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchPanel(true);
      }
      if (e.key === 'Escape') {
        setShowSearchPanel(false);
        setShowTimelinePanel(false);
        setActiveAgentNode(null);
        setShowCreateAgent(false);
        setShowIntegrationConfig(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // When an agent node is selected, open Agent Panel
  const handleOpenAgent = (node: GraphNode) => {
    setActiveAgentNode(node);
  };

  return (
    <div
      className="flex flex-col h-screen bg-gray-950 text-gray-100 overflow-hidden"
      style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Top bar */}
      <div className="h-10 flex-shrink-0 bg-gray-950 border-b border-gray-800 flex items-center px-4 gap-3 z-20">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" />
              <circle cx="4" cy="4" r="2" /><circle cx="20" cy="4" r="2" />
              <circle cx="20" cy="20" r="2" /><circle cx="4" cy="20" r="2" />
              <line x1="6" y1="6" x2="10" y2="10" /><line x1="18" y1="6" x2="14" y2="10" />
              <line x1="6" y1="18" x2="10" y2="14" /><line x1="18" y1="18" x2="14" y2="14" />
            </svg>
          </div>
          <span className="text-sm font-bold text-white tracking-tight">GraphOS</span>
          <span className="text-[10px] text-gray-600 font-medium">Beta</span>
        </div>

        {/* Search */}
        <button
          onClick={() => setShowSearchPanel(true)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-1 transition-colors flex-1 max-w-xs text-left"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="text-xs text-gray-600 flex-1">{searchQuery || '의미 기반 검색...'}</span>
          <span className="text-[10px] text-gray-700 hidden sm:block">⌘K</span>
        </button>

        {/* Timeline */}
        <button
          onClick={() => setShowTimelinePanel(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors text-xs"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="2" x2="12" y2="22" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          Timeline
        </button>

        {/* Add Agent */}
        <button
          onClick={() => setShowCreateAgent(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-teal-500 hover:text-teal-300 hover:bg-teal-900/30 border border-teal-900/50 transition-colors text-xs"
        >
          <span className="text-sm">★</span>
          Agent
        </button>

        {/* Integration config */}
        <button
          onClick={() => setShowIntegrationConfig(true)}
          className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors"
          title="연동 설정"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* WS status */}
        <div className="ml-auto flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
            wsStatus === 'connected' ? 'bg-emerald-500' :
            wsStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
          }`} />
          <span className="text-[10px] text-gray-600">
            {wsStatus === 'connected' ? 'Live' : wsStatus === 'connecting' ? '연결 중' : '오프라인'}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        <ConversationSidebar />

        <div className="flex flex-1 min-w-0">
          {/* Chat pane */}
          <div className="flex flex-col border-r border-gray-800" style={{ width: '45%', minWidth: 0 }}>
            <ChatPanel />
          </div>

          {/* Right pane */}
          <div className="flex-1 min-w-0 flex flex-col">
            {rightPanel === 'graph' ? (
              <GraphPanel onOpenAgent={handleOpenAgent} />
            ) : (
              <NodeDetail />
            )}
          </div>
        </div>
      </div>

      {/* Overlays */}
      {showSearchPanel && (
        <SearchPanel onClose={() => { setShowSearchPanel(false); setSearchQuery(''); }} />
      )}
      {showTimelinePanel && (
        <TimelinePanel onClose={() => setShowTimelinePanel(false)} />
      )}
      {activeAgentNode && (
        <AgentPanel agentNode={activeAgentNode} onClose={() => setActiveAgentNode(null)} />
      )}
      {showCreateAgent && (
        <CreateAgentModal
          onClose={() => setShowCreateAgent(false)}
          onCreated={() => setShowCreateAgent(false)}
        />
      )}
      {showIntegrationConfig && (
        <IntegrationConfig onClose={() => setShowIntegrationConfig(false)} />
      )}
    </div>
  );
}
