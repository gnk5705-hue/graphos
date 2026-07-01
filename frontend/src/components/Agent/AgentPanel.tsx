import { useState, useEffect, useRef } from 'react';
import * as api from '../../api/client';
import type { GraphNode } from '../../types';

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AgentSession {
  id: string;
  title: string;
  created_at: string;
}

const AGENT_COLORS: Record<string, string> = {
  pm: '#34d399',
  research: '#60a5fa',
  engineer: '#a78bfa',
  designer: '#f472b6',
  legal: '#fbbf24',
  custom: '#94a3b8',
};

const AGENT_ICONS: Record<string, string> = {
  pm: '📋', research: '🔬', engineer: '💻', designer: '🎨', legal: '⚖️', custom: '✨',
};

interface Props {
  agentNode: GraphNode;
  onClose: () => void;
}

export default function AgentPanel({ agentNode, onClose }: Props) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const personaKey = (() => {
    try { return JSON.parse(agentNode.description || '{}').persona_key ?? 'custom'; }
    catch { return 'custom'; }
  })();
  const color = AGENT_COLORS[personaKey] ?? '#94a3b8';
  const icon = AGENT_ICONS[personaKey] ?? '✨';

  useEffect(() => {
    api.getAgentSessions(agentNode.id).then((data) => {
      setSessions(data);
    }).catch(() => {});
  }, [agentNode.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleNewSession = async () => {
    try {
      const session = await api.createAgentSession(agentNode.id);
      setSessions((prev) => [session, ...prev]);
      setActiveSessionId(session.id);
      setMessages([]);
    } catch { /* ignore */ }
  };

  const handleSelectSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    try {
      const msgs = await api.getAgentSessionMessages(agentNode.id, sessionId);
      setMessages(msgs);
    } catch { setMessages([]); }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      try {
        const session = await api.createAgentSession(agentNode.id);
        setSessions((prev) => [session, ...prev]);
        sessionId = session.id;
        setActiveSessionId(session.id);
      } catch { return; }
    }

    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);
    setStreamingContent('');
    let accumulated = '';

    try {
      await api.chatWithAgent(agentNode.id, sessionId!, text, {
        onToken: (token) => {
          accumulated += token;
          setStreamingContent(accumulated);
        },
        onDone: () => {
          setMessages((prev) => [...prev, { role: 'assistant', content: accumulated }]);
          setStreamingContent(null);

          // Refresh sessions list to update title
          api.getAgentSessions(agentNode.id).then(setSessions).catch(() => {});
        },
        onError: () => {
          setMessages((prev) => [...prev, { role: 'assistant', content: '오류가 발생했습니다.' }]);
          setStreamingContent(null);
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 flex-shrink-0"
          style={{ borderBottomColor: color + '44' }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: color + '22', border: `1.5px solid ${color}55` }}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-white">{agentNode.label}</h2>
            <p className="text-[10px] text-gray-500 truncate">
              {(() => { try { return JSON.parse(agentNode.description || '{}').description || ''; } catch { return agentNode.description || ''; } })()}
            </p>
          </div>
          <button
            onClick={handleNewSession}
            className="px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-700 transition-colors flex items-center gap-1"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            새 대화
          </button>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sessions sidebar */}
          {sessions.length > 0 && (
            <div className="w-40 flex-shrink-0 border-r border-gray-800 overflow-y-auto py-2">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`w-full text-left px-3 py-2 text-[11px] transition-colors ${
                    activeSessionId === s.id ? 'text-white bg-gray-800' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  <p className="truncate font-medium">{s.title}</p>
                  <p className="text-[9px] text-gray-700 mt-0.5">
                    {new Date(s.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 overflow-y-auto py-4 space-y-1">
              {messages.length === 0 && streamingContent === null && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600 pb-16">
                  <div className="text-3xl">{icon}</div>
                  <p className="text-xs text-center px-6">
                    {agentNode.label}에게 무엇이든 물어보세요.<br />
                    대화 내용은 자동으로 그래프에 반영됩니다.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 px-3 py-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={msg.role === 'assistant'
                      ? { background: color + '33', color }
                      : { background: '#4338ca', color: 'white' }
                    }
                  >
                    {msg.role === 'assistant' ? icon : 'U'}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-gray-800 text-gray-200 rounded-tl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {streamingContent !== null && (
                <div className="flex gap-2.5 px-3 py-2">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
                    style={{ background: color + '33', color }}>
                    {icon}
                  </div>
                  <div className="max-w-[85%] bg-gray-800 rounded-xl rounded-tl-sm px-3 py-2 text-xs text-gray-200 leading-relaxed">
                    {streamingContent.length === 0
                      ? <span className="flex gap-1"><span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:'0ms'}}/><span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:'150ms'}}/><span className="w-1 h-1 rounded-full bg-gray-500 animate-bounce" style={{animationDelay:'300ms'}}/></span>
                      : <p className="whitespace-pre-wrap">{streamingContent}<span className="animate-pulse">▊</span></p>
                    }
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-800 p-3 flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={`${agentNode.label}에게 메시지...`}
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-gray-800 text-gray-100 placeholder-gray-600 rounded-xl px-3 py-2 text-xs resize-none outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center disabled:opacity-40 transition-colors"
                style={{ background: color }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
