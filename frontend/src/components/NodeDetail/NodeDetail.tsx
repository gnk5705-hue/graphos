import { useState } from 'react';
import { useAppStore } from '../../store';
import * as api from '../../api/client';
import ConversationReplay from './ConversationReplay';
import ActionPanel from './ActionPanel';

const TYPE_CONFIG: Record<string, { color: string; label: string }> = {
  topic: { color: '#60a5fa', label: '주제' },
  project: { color: '#34d399', label: '프로젝트' },
  task: { color: '#fbbf24', label: '작업' },
  concept: { color: '#a78bfa', label: '개념' },
  document: { color: '#f472b6', label: '문서' },
  agent: { color: '#2dd4bf', label: '에이전트' },
};

type Tab = 'summary' | 'replay' | 'actions';

export default function NodeDetail() {
  const {
    nodeDetail,
    selectedNodeId,
    isNodeDetailLoading,
    setRightPanel,
    setSelectedNode,
    setActiveConversation,
    setMessages,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<Tab>('summary');

  const handleBack = () => {
    setRightPanel('graph');
    setSelectedNode(null);
  };

  const handleJumpToConversation = async (conversationId: string) => {
    setActiveConversation(conversationId);
    try {
      const msgs = await api.getMessages(conversationId);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  };

  if (isNodeDetailLoading) {
    return (
      <div className="flex flex-col h-full bg-gray-950">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <button onClick={handleBack} className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-800">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-xs text-gray-500">노드 상세</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-1.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!nodeDetail) {
    return (
      <div className="flex flex-col h-full bg-gray-950">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
          <button onClick={handleBack} className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-800">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
          노드 정보를 불러올 수 없습니다
        </div>
      </div>
    );
  }

  const { node, summary, related_messages, conversation_excerpts } = nodeDetail;
  const config = TYPE_CONFIG[node.node_type] ?? TYPE_CONFIG.concept;
  const updatedAt = new Date(node.updated_at).toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <button
          onClick={handleBack}
          className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-800"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-xs text-gray-500">마인드맵으로 돌아가기</span>
      </div>

      {/* Node identity */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/50 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ color: config.color, background: config.color + '22' }}
          >
            {config.label}
          </span>
          <span className="text-[10px] text-gray-600">{updatedAt}</span>
        </div>
        <h2 className="text-lg font-bold text-white leading-tight">{node.label}</h2>
        {node.description && (
          <p className="text-sm text-gray-400 mt-1 leading-relaxed">{node.description}</p>
        )}

        {/* Stats row */}
        <div className="flex gap-3 mt-2">
          <span className="text-[10px] text-gray-600">
            관련 메시지 <span className="text-gray-400">{related_messages?.length ?? 0}개</span>
          </span>
          <span className="text-[10px] text-gray-600">
            대화 <span className="text-gray-400">{conversation_excerpts?.length ?? 0}개</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 flex-shrink-0">
        {(['summary', 'replay', 'actions'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-indigo-500'
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            {tab === 'summary' ? 'AI 요약' : tab === 'replay' ? 'Replay' : 'Actions'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'summary' && (
          <div>
            {/* AI Summary */}
            {summary && (
              <div className="px-4 py-3 border-b border-gray-800/50">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">AI 요약</h3>
                <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-3">
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
                </div>
              </div>
            )}

            {/* Conversation excerpts */}
            {conversation_excerpts && conversation_excerpts.length > 0 && (
              <div className="px-4 py-3 border-b border-gray-800/50">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  관련 대화 ({conversation_excerpts.length}개)
                </h3>
                <div className="space-y-2">
                  {conversation_excerpts.map((excerpt: { conversation_id: string; conversation_title: string; messages: { id: string; role: string; content: string }[] }) => (
                    <div key={excerpt.conversation_id} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-gray-300 truncate flex-1">{excerpt.conversation_title}</p>
                        <button
                          onClick={() => handleJumpToConversation(excerpt.conversation_id)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 ml-2 flex-shrink-0 flex items-center gap-1 transition-colors"
                        >
                          열기
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </div>
                      {excerpt.messages?.slice(0, 2).map((msg: { id: string; role: string; content: string }) => (
                        <div key={msg.id} className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">
                          <span className="text-gray-600 font-medium">{msg.role === 'user' ? 'User: ' : 'AI: '}</span>
                          {msg.content}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related messages */}
            {related_messages && related_messages.length > 0 && (
              <div className="px-4 py-3">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">
                  관련 메시지 ({related_messages.length}개)
                </h3>
                <div className="space-y-2">
                  {related_messages.slice(0, 5).map((msg) => (
                    <div key={msg.id} className="bg-gray-900 rounded-xl p-3 border border-gray-800">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={`text-[9px] font-medium uppercase px-1.5 py-0.5 rounded-full ${
                            msg.role === 'user' ? 'bg-indigo-900/50 text-indigo-400' : 'bg-gray-800 text-gray-500'
                          }`}
                        >
                          {msg.role === 'user' ? 'User' : 'AI'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'replay' && selectedNodeId && (
          <div className="px-4 py-3">
            <p className="text-[10px] text-gray-500 mb-3">
              이 노드와 관련된 메시지들을 주제별 스레드로 정리했습니다
            </p>
            <ConversationReplay nodeId={selectedNodeId} />
          </div>
        )}

        {activeTab === 'actions' && (
          <ActionPanel node={nodeDetail.node} />
        )}
      </div>
    </div>
  );
}
