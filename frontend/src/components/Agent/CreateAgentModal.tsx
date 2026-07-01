import { useState } from 'react';
import * as api from '../../api/client';
import { useAppStore } from '../../store';

interface Persona {
  key: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

const PERSONAS: Persona[] = [
  { key: 'pm', name: 'PM Agent', description: 'PRD, 로드맵, 유저 스토리 작성', color: '#34d399', icon: '📋' },
  { key: 'research', name: 'Research Agent', description: '시장 조사, 논문 분석, 인사이트 도출', color: '#60a5fa', icon: '🔬' },
  { key: 'engineer', name: 'Engineer Agent', description: '코드 작성, 아키텍처 설계, 기술 문서', color: '#a78bfa', icon: '💻' },
  { key: 'designer', name: 'Designer Agent', description: 'UX 흐름, 와이어프레임, 디자인 명세', color: '#f472b6', icon: '🎨' },
  { key: 'legal', name: 'Legal Agent', description: '계약 검토, 법적 리스크 분석, 컴플라이언스', color: '#fbbf24', icon: '⚖️' },
  { key: 'custom', name: 'Custom Agent', description: '직접 페르소나 설정', color: '#94a3b8', icon: '✨' },
];

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateAgentModal({ onClose, onCreated }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customName, setCustomName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { setGraphData } = useAppStore();

  const handleCreate = async () => {
    if (!selected) return;
    setIsCreating(true);
    try {
      await api.createAgent({
        persona_key: selected,
        custom_name: selected === 'custom' ? customName : undefined,
        custom_system_prompt: selected === 'custom' ? customPrompt : undefined,
      });
      const graph = await api.getGraph();
      setGraphData(graph);
      onCreated();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div>
            <h2 className="text-sm font-bold text-white">에이전트 생성</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">AI 에이전트를 그래프에 추가합니다</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 p-1 rounded-lg hover:bg-gray-800">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PERSONAS.map((persona) => (
              <button
                key={persona.key}
                onClick={() => setSelected(persona.key)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  selected === persona.key
                    ? 'border-opacity-100 bg-opacity-20'
                    : 'border-gray-800 hover:border-gray-700'
                }`}
                style={selected === persona.key ? {
                  borderColor: persona.color,
                  background: persona.color + '15',
                } : {}}
              >
                <span className="text-lg">{persona.icon}</span>
                <p className="text-xs font-semibold text-gray-200 mt-1">{persona.name}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-snug">{persona.description}</p>
              </button>
            ))}
          </div>

          {selected === 'custom' && (
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">
                  에이전트 이름
                </label>
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="예: Marketing Agent"
                  className="w-full bg-gray-800 text-gray-100 placeholder-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block mb-1">
                  시스템 프롬프트
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="당신은 마케팅 전문가입니다..."
                  rows={3}
                  className="w-full bg-gray-800 text-gray-100 placeholder-gray-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={!selected || isCreating || (selected === 'custom' && !customName.trim())}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isCreating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                에이전트 추가
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
