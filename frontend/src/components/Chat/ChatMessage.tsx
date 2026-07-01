import ReactMarkdown from 'react-markdown';
import type { Message } from '../../types';

interface Props {
  message: Message;
  highlight?: boolean;
}

export default function ChatMessage({ message, highlight }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 px-4 py-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} ${highlight ? 'bg-indigo-950/40 rounded-xl' : ''}`}
    >
      <div
        className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'
        }`}
      >
        {isUser ? 'U' : 'AI'}
      </div>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm'
            : 'bg-gray-800 text-gray-100 rounded-tl-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
