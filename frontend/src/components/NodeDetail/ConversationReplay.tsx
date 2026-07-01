import { useEffect, useState } from 'react';
import * as api from '../../api/client';
import { useAppStore } from '../../store';

interface ReplayMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
  conversation_id: string;
}

interface ReplayThread {
  conversation_id: string;
  conversation_title: string;
  messages: ReplayMessage[];
}

interface ReplayData {
  node_label: string;
  node_type: string;
  threads: ReplayThread[];
}

export default function ConversationReplay({ nodeId }: { nodeId: string }) {
  const [data, setData] = useState<ReplayData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setActiveConversation, setMessages } = useAppStore();

  useEffect(() => {
    setIsLoading(true);
    api.getConversationReplay(nodeId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [nodeId]);

  const handleJumpToConversation = async (conversationId: string) => {
    setActiveConversation(conversationId);
    try {
      const msgs = await api.getMessages(conversationId);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || data.threads.length === 0) {
    return (
      <div className="py-8 text-center text-gray-600 text-xs">
        이 노드와 관련된 대화가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.threads.map((thread) => (
        <div key={thread.conversation_id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {/* Thread header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-800/40">
            <p className="text-xs font-medium text-gray-300 truncate flex-1">{thread.conversation_title}</p>
            <button
              onClick={() => handleJumpToConversation(thread.conversation_id)}
              className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors ml-2 flex-shrink-0"
            >
              원본 열기
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="p-2 space-y-2">
            {thread.messages.map((msg, i) => (
              <div key={msg.id} className="flex items-start gap-2">
                {/* Thread line */}
                <div className="flex flex-col items-center flex-shrink-0 pt-1">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                      msg.role === 'user' ? 'bg-indigo-800 text-indigo-300' : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {msg.role === 'user' ? 'U' : 'AI'}
                  </div>
                  {i < thread.messages.length - 1 && (
                    <div className="w-px flex-1 bg-gray-800 min-h-[8px] mt-1" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">{msg.content}</p>
                  <p className="text-[9px] text-gray-700 mt-0.5">
                    {new Date(msg.created_at).toLocaleString('ko-KR', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
