import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store';
import * as api from '../../api/client';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import type { Message } from '../../types';

export default function ChatPanel() {
  const {
    messages,
    isLoading,
    activeConversationId,
    setLoading,
    addMessage,
    addOrUpdateConversation,
    setActiveConversation,
  } = useAppStore();

  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = async (text: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversation_id: activeConversationId ?? '',
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };
    addMessage(userMessage);
    setLoading(true);
    setStreamingContent('');

    let finalMessageId = '';
    let finalConversationId = '';
    let accumulated = '';

    try {
      await api.sendMessageStream(text, activeConversationId, {
        onToken: (token) => {
          accumulated += token;
          setStreamingContent(accumulated);
        },
        onDone: ({ message_id, conversation_id }) => {
          finalMessageId = message_id;
          finalConversationId = conversation_id;
        },
        onError: (err) => {
          console.error(err);
          addMessage({
            id: crypto.randomUUID(),
            conversation_id: activeConversationId ?? '',
            role: 'assistant',
            content: '오류가 발생했습니다. 백엔드 서버 및 OpenAI API 키를 확인해주세요.',
            created_at: new Date().toISOString(),
          });
        },
      });

      if (finalMessageId) {
        const aiMessage: Message = {
          id: finalMessageId,
          conversation_id: finalConversationId,
          role: 'assistant',
          content: accumulated,
          created_at: new Date().toISOString(),
        };
        addMessage(aiMessage);

        if (!activeConversationId && finalConversationId) {
          setActiveConversation(finalConversationId);
        }

        try {
          const conversations = await api.getConversations();
          const conv = conversations.find((c) => c.id === finalConversationId);
          if (conv) addOrUpdateConversation(conv);
        } catch {
          // non-critical
        }
      }
    } finally {
      setStreamingContent(null);
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-gray-950">
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {messages.length === 0 && streamingContent === null && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-3 pb-20">
            <div className="w-14 h-14 rounded-2xl bg-indigo-900/30 border border-indigo-800/50 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-400">GraphOS에 오신 것을 환영합니다</p>
              <p className="text-xs mt-1">대화를 시작하면 AI가 자동으로 마인드맵을 생성합니다</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}

        {streamingContent !== null && (
          <div className="flex gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300 flex-shrink-0">
              AI
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed bg-gray-800 text-gray-100">
              {streamingContent.length === 0 ? (
                <span className="flex items-center gap-1.5 h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              ) : (
                <p className="whitespace-pre-wrap">{streamingContent}<span className="animate-pulse">▊</span></p>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
