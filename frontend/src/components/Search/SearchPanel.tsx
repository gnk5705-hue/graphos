import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store';
import * as api from '../../api/client';
import type { GraphNode, Message } from '../../types';

const TYPE_COLORS: Record<string, string> = {
  topic: '#60a5fa',
  project: '#34d399',
  task: '#fbbf24',
  concept: '#a78bfa',
  document: '#f472b6',
};

export default function SearchPanel({ onClose }: { onClose: () => void }) {
  const { searchQuery, setSearchQuery, setSelectedNode, setNodeDetail, setNodeDetailLoading, setRightPanel } = useAppStore();
  const [results, setResults] = useState<{ nodes: GraphNode[]; messages: Message[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await api.semanticSearch(searchQuery);
        setResults(data);
      } catch {
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery]);

  const handleNodeClick = async (node: GraphNode) => {
    setSelectedNode(node.id);
    setRightPanel('node_detail');
    setNodeDetailLoading(true);
    onClose();
    try {
      const detail = await api.getNodeDetail(node.id);
      setNodeDetail(detail);
    } catch {
      setNodeDetail(null);
    } finally {
      setNodeDetailLoading(false);
    }
  };

  const handleMessageClick = async (msg: Message) => {
    const { setActiveConversation, setMessages } = useAppStore.getState();
    setActiveConversation(msg.conversation_id);
    try {
      const msgs = await api.getMessages(msg.conversation_id);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
    onClose();
  };

  const isEmpty = !results || (results.nodes.length === 0 && results.messages.length === 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Semantic search... (e.g. quantum computing, project plan)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-gray-100 placeholder-gray-600 outline-none text-sm"
          />
          {isLoading && (
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          )}
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 transition-colors text-xs">
            ESC
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {!searchQuery.trim() && (
            <div className="py-10 text-center text-gray-600 text-sm">
              Type a query and AI will find related nodes and conversations by meaning
            </div>
          )}

          {searchQuery.trim() && !isLoading && isEmpty && (
            <div className="py-10 text-center text-gray-600 text-sm">
              No related results found
            </div>
          )}

          {results && results.nodes.length > 0 && (
            <div className="p-3">
              <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider px-2 mb-2">
                Nodes ({results.nodes.length})
              </p>
              <div className="space-y-1">
                {results.nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => handleNodeClick(node)}
                    className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors group"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: TYPE_COLORS[node.node_type] ?? '#6b7280' }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 group-hover:text-white truncate">
                        {node.label}
                      </p>
                      {node.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{node.description}</p>
                      )}
                    </div>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 mt-0.5"
                      style={{ color: TYPE_COLORS[node.node_type], background: (TYPE_COLORS[node.node_type] ?? '#6b7280') + '22' }}
                    >
                      {node.node_type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {results && results.messages.length > 0 && (
            <div className="p-3 border-t border-gray-800">
              <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider px-2 mb-2">
                Related Messages ({results.messages.length})
              </p>
              <div className="space-y-1">
                {results.messages.map((msg) => (
                  <button
                    key={msg.id}
                    onClick={() => handleMessageClick(msg)}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-800 transition-colors group"
                  >
                    <p className="text-xs text-gray-400 group-hover:text-gray-200 line-clamp-2 leading-relaxed">
                      {msg.content}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-1">
                      {new Date(msg.created_at).toLocaleDateString('en-US')}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
