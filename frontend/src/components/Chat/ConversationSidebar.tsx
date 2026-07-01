import { useAppStore } from '../../store';
import * as api from '../../api/client';

export default function ConversationSidebar() {
  const {
    conversations,
    activeConversationId,
    setActiveConversation,
    setMessages,
    setConversations,
  } = useAppStore();

  const handleSelect = async (id: string) => {
    setActiveConversation(id);
    try {
      const msgs = await api.getMessages(id);
      setMessages(msgs);
    } catch {
      setMessages([]);
    }
  };

  const handleNew = () => {
    setActiveConversation(null);
    setMessages([]);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.deleteConversation(id);
      const updated = conversations.filter((c) => c.id !== id);
      setConversations(updated);
      if (activeConversationId === id) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch {
      // ignore
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('ko-KR', { weekday: 'short' });
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-52 flex-shrink-0 border-r border-gray-800 flex flex-col bg-gray-950">
      <div className="p-3 border-b border-gray-800">
        <button
          onClick={handleNew}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          새 대화
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {conversations.length === 0 && (
          <p className="text-gray-600 text-xs text-center mt-8 px-3">
            대화를 시작하면<br />여기에 목록이 표시됩니다
          </p>
        )}
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => handleSelect(conv.id)}
            className={`group flex items-start gap-2 mx-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
              activeConversationId === conv.id
                ? 'bg-indigo-900/50 text-white'
                : 'text-gray-400 hover:bg-gray-800/60 hover:text-gray-200'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate leading-tight">{conv.title}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{formatDate(conv.updated_at)}</p>
            </div>
            <button
              onClick={(e) => handleDelete(e, conv.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-400 transition-all flex-shrink-0 mt-0.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
