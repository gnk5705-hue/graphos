import { Handle, Position } from '@xyflow/react';
import type { NodeType } from '../../types';

type ExtendedNodeType = NodeType | 'agent';

const TYPE_CONFIG: Record<ExtendedNodeType, { color: string; bg: string; label: string; icon: string }> = {
  topic: { color: '#60a5fa', bg: '#1e3a5f', label: 'Topic', icon: '◉' },
  project: { color: '#34d399', bg: '#064e3b', label: 'Project', icon: '◈' },
  task: { color: '#fbbf24', bg: '#451a03', label: 'Task', icon: '◆' },
  concept: { color: '#a78bfa', bg: '#2e1065', label: 'Concept', icon: '◎' },
  document: { color: '#f472b6', bg: '#500724', label: 'Document', icon: '◇' },
  agent: { color: '#2dd4bf', bg: '#022c22', label: 'Agent', icon: '★' },
};

const AGENT_PERSONA_ICONS: Record<string, string> = {
  pm: '📋', research: '🔬', engineer: '💻', designer: '🎨', legal: '⚖️', custom: '✨',
};

interface NodeData {
  label: string;
  node_type: ExtendedNodeType;
  description?: string;
  selected?: boolean;
}

export default function CustomNode({ data, selected }: { data: NodeData; selected?: boolean }) {
  const config = TYPE_CONFIG[data.node_type] ?? TYPE_CONFIG.concept;
  const isAgent = data.node_type === 'agent';

  // Extract persona icon for agents
  let agentIcon = '★';
  if (isAgent && data.description) {
    try {
      const parsed = JSON.parse(data.description);
      agentIcon = AGENT_PERSONA_ICONS[parsed.persona_key] ?? '★';
    } catch { /* not JSON */ }
  }

  return (
    <div
      className="relative transition-all duration-200"
      style={{
        background: config.bg,
        border: `1.5px solid ${selected ? config.color : config.color + '66'}`,
        boxShadow: selected ? `0 0 20px ${config.color}55` : `0 2px 8px rgba(0,0,0,0.4)`,
        minWidth: isAgent ? '140px' : '120px',
        maxWidth: '180px',
        borderRadius: isAgent ? '16px' : '12px',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: config.color, width: 8, height: 8, top: -4 }}
      />

      <div className="px-3 py-2.5">
        {isAgent ? (
          <div className="flex items-center gap-2">
            <span className="text-xl flex-shrink-0">{agentIcon}</span>
            <div className="min-w-0">
              <span
                className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full block w-fit mb-1"
                style={{ color: config.color, background: config.color + '22' }}
              >
                {config.label}
              </span>
              <p className="text-xs font-bold text-white leading-tight break-words">{data.label}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 mb-1">
              <span style={{ color: config.color, fontSize: '10px' }}>{config.icon}</span>
              <span
                className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{ color: config.color, background: config.color + '22' }}
              >
                {config.label}
              </span>
            </div>
            <p className="text-xs font-semibold text-white leading-tight break-words">{data.label}</p>
            {data.description && !data.description.startsWith('{') && (
              <p className="text-[10px] text-gray-400 mt-1 leading-tight line-clamp-2">
                {data.description}
              </p>
            )}
          </>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: config.color, width: 8, height: 8, bottom: -4 }}
      />
    </div>
  );
}
