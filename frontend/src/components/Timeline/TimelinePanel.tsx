import { useEffect, useState } from 'react';
import * as api from '../../api/client';

interface TimelineEvent {
  type: 'node_created' | 'conversation_started';
  date: string;
  data: {
    id: string;
    label?: string;
    node_type?: string;
    description?: string;
    title?: string;
    message_count?: number;
  };
}

interface TimelineGroup {
  date: string;
  events: TimelineEvent[];
}

interface TimelineData {
  grouped: TimelineGroup[];
  stats: { total_nodes: number; total_conversations: number; period_days: number };
}

const NODE_COLORS: Record<string, string> = {
  topic: '#60a5fa',
  project: '#34d399',
  task: '#fbbf24',
  concept: '#a78bfa',
  document: '#f472b6',
};

const PERIOD_OPTIONS = [
  { label: '7일', value: 7 },
  { label: '30일', value: 30 },
  { label: '90일', value: 90 },
  { label: '1년', value: 365 },
];

export default function TimelinePanel({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState(30);

  useEffect(() => {
    setIsLoading(true);
    api.getTimeline(period)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false));
  }, [period]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 86400000;
    if (diff < 1) return '오늘';
    if (diff < 2) return '어제';
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      <div
        className="h-full w-full max-w-md bg-gray-900 border-l border-gray-700 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-sm font-bold text-white">Timeline</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">지식 그래프의 성장 과정</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 gap-2 p-4 border-b border-gray-800">
            <div className="bg-gray-800/60 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{data.stats.total_nodes}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">전체 노드</p>
            </div>
            <div className="bg-gray-800/60 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-white">{data.stats.total_conversations}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">전체 대화</p>
            </div>
          </div>
        )}

        {/* Period selector */}
        <div className="flex gap-1.5 px-4 py-2.5 border-b border-gray-800">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`flex-1 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                period === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!isLoading && (!data || data.grouped.length === 0) && (
            <div className="text-center text-gray-600 text-sm py-16">
              해당 기간에 활동이 없습니다
            </div>
          )}

          {!isLoading && data && data.grouped.map((group) => (
            <div key={group.date} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-gray-800" />
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider px-2">
                  {formatDate(group.date)}
                </span>
                <div className="h-px flex-1 bg-gray-800" />
              </div>

              <div className="space-y-2 ml-2">
                {group.events.map((event, i) => (
                  <div key={i} className="flex gap-3">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center flex-shrink-0 mt-1">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          background: event.type === 'node_created'
                            ? (NODE_COLORS[event.data.node_type ?? 'topic'] ?? '#6b7280')
                            : '#6366f1',
                        }}
                      />
                      {i < group.events.length - 1 && (
                        <div className="w-px flex-1 bg-gray-800 mt-1 min-h-[16px]" />
                      )}
                    </div>

                    {/* Event content */}
                    <div className="flex-1 pb-3">
                      {event.type === 'node_created' ? (
                        <div className="bg-gray-800/50 rounded-xl p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={{
                                  color: NODE_COLORS[event.data.node_type ?? 'topic'],
                                  background: (NODE_COLORS[event.data.node_type ?? 'topic'] ?? '#6b7280') + '22',
                                }}
                              >
                                {event.data.node_type}
                              </span>
                            </div>
                            <span className="text-[10px] text-gray-600">{formatTime(event.date)}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-200 mt-1">{event.data.label}</p>
                          {event.data.description && (
                            <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{event.data.description}</p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-xl p-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9px] text-indigo-400 font-semibold uppercase tracking-wider">
                              대화 시작
                            </span>
                            <span className="text-[10px] text-gray-600">{formatTime(event.date)}</span>
                          </div>
                          <p className="text-xs font-semibold text-gray-200 mt-1 line-clamp-1">{event.data.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{event.data.message_count}개 메시지</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
