import { useState } from 'react';
import * as api from '../../api/client';
import { useAppStore } from '../../store';
import type { GraphNode } from '../../types';

interface Action {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  streaming: boolean;
  requiresConfig?: 'github' | 'notion';
}

const ACTIONS: Action[] = [
  { key: 'generate_prd', label: 'PRD 생성', description: '제품 요구사항 문서 작성', icon: '📋', color: '#34d399', streaming: true },
  { key: 'generate_document', label: '문서 생성', description: '상세 문서/리포트 작성', icon: '📝', color: '#60a5fa', streaming: true },
  { key: 'generate_code', label: '코드 생성', description: '구현 코드 작성', icon: '💻', color: '#a78bfa', streaming: true },
  { key: 'generate_summary', label: '요약 생성', description: '핵심 내용 요약', icon: '✨', color: '#fbbf24', streaming: true },
  { key: 'create_task', label: '태스크 생성', description: '연결된 작업 노드 추가', icon: '✅', color: '#94a3b8', streaming: false },
  { key: 'github_issue', label: 'GitHub Issue', description: 'GitHub 이슈 생성', icon: '🐙', color: '#f472b6', streaming: false, requiresConfig: 'github' },
  { key: 'notion_export', label: 'Notion 내보내기', description: 'Notion 페이지로 저장', icon: '📔', color: '#6366f1', streaming: false, requiresConfig: 'notion' },
];

interface IntegrationStatus {
  github: boolean;
  notion: boolean;
}

interface Props {
  node: GraphNode;
}

export default function ActionPanel({ node }: Props) {
  const [output, setOutput] = useState<string | null>(null);
  const [outputTitle, setOutputTitle] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [result, setResult] = useState<{ type: string; url?: string; node?: unknown } | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const { setGraphData } = useAppStore();

  // Load integration status once
  const loadIntegrations = async () => {
    if (integrations) return;
    try {
      const status = await api.getIntegrationStatus();
      setIntegrations(status);
    } catch {
      setIntegrations({ github: false, notion: false });
    }
  };

  const handleAction = async (action: Action) => {
    if (runningAction) return;
    await loadIntegrations();

    setRunningAction(action.key);
    setOutput(null);
    setResult(null);
    setOutputTitle(action.label);

    if (action.streaming) {
      setIsStreaming(true);
      setOutput('');
      let accumulated = '';

      try {
        await api.executeAction(node.id, action.key, {
          onToken: (token) => {
            accumulated += token;
            setOutput(accumulated);
          },
          onNodeCreated: () => {
            api.getGraph().then(setGraphData).catch(() => {});
          },
          onDone: (res) => {
            setResult(res as { type: string; url?: string; node?: unknown });
            api.getGraph().then(setGraphData).catch(() => {});
          },
          onError: (err) => {
            setOutput(`오류: ${err.message}`);
          },
        });
      } finally {
        setIsStreaming(false);
        setRunningAction(null);
      }
    } else {
      try {
        const res = await api.executeActionSync(node.id, action.key);
        setResult(res);
        if (res.node) {
          api.getGraph().then(setGraphData).catch(() => {});
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setResult({ type: 'error', url: message });
      } finally {
        setRunningAction(null);
      }
    }
  };

  return (
    <div className="px-4 py-3">
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {ACTIONS.map((action) => {
          const isDisabled = runningAction !== null;
          const isRunning = runningAction === action.key;
          const needsConfig = action.requiresConfig &&
            integrations !== null &&
            !integrations[action.requiresConfig];

          return (
            <button
              key={action.key}
              onClick={() => !isDisabled && !needsConfig && handleAction(action)}
              disabled={isDisabled || needsConfig}
              className="relative text-left p-2.5 rounded-xl border border-gray-800 hover:border-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={isRunning ? { borderColor: action.color + '66', background: action.color + '11' } : {}}
              title={needsConfig ? `.env에 ${action.requiresConfig?.toUpperCase()} 설정이 필요합니다` : action.description}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{action.icon}</span>
                {isRunning && (
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" style={{ color: action.color }} />
                )}
                {needsConfig && (
                  <span className="text-[9px] text-gray-600">미설정</span>
                )}
              </div>
              <p className="text-[11px] font-semibold text-gray-300">{action.label}</p>
              <p className="text-[9px] text-gray-600 mt-0.5">{action.description}</p>
            </button>
          );
        })}
      </div>

      {/* Output area */}
      {(output !== null || result) && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <span className="text-[10px] text-gray-400 font-semibold">{outputTitle} 결과</span>
            <div className="flex items-center gap-2">
              {isStreaming && (
                <span className="text-[9px] text-indigo-400 animate-pulse">생성 중...</span>
              )}
              <button
                onClick={() => { setOutput(null); setResult(null); }}
                className="text-gray-600 hover:text-gray-400"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {output !== null && (
            <div className="p-3 max-h-64 overflow-y-auto">
              <pre className="text-[11px] text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">
                {output}
                {isStreaming && <span className="animate-pulse">▊</span>}
              </pre>
            </div>
          )}

          {result && !output && (
            <div className="p-3">
              {result.type === 'task_created' && (
                <p className="text-xs text-emerald-400">✅ 태스크 노드가 그래프에 추가됐습니다</p>
              )}
              {result.url && result.type !== 'error' && (
                <p className="text-xs text-indigo-400">
                  ✅ 생성 완료:{' '}
                  <a href={result.url} target="_blank" rel="noopener noreferrer" className="underline break-all">
                    {result.url}
                  </a>
                </p>
              )}
              {result.type === 'error' && (
                <p className="text-xs text-red-400">❌ {result.url}</p>
              )}
            </div>
          )}

          {output && !isStreaming && (
            <div className="px-3 pb-3 flex gap-2">
              <button
                onClick={() => navigator.clipboard.writeText(output)}
                className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                복사
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
