import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeChange,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useAppStore } from '../../store';
import * as apiClient from '../../api/client';
import CustomNode from './CustomNode';
import type { NodeType } from '../../types';

const NODE_TYPES = { custom: CustomNode };

const TYPE_COLORS: Record<string, string> = {
  topic: '#60a5fa',
  project: '#34d399',
  task: '#fbbf24',
  concept: '#a78bfa',
  document: '#f472b6',
  agent: '#2dd4bf',
};

export default function GraphPanel({ onOpenAgent }: { onOpenAgent?: (node: import('../../types').GraphNode) => void }) {
  const {
    graphData,
    nodePositions,
    updateNodePosition,
    selectedNodeId,
    setSelectedNode,
    setNodeDetail,
    setNodeDetailLoading,
    setRightPanel,
  } = useAppStore();

  const rfNodes: Node[] = useMemo(
    () =>
      graphData.nodes.map((n) => ({
        id: n.id,
        type: 'custom',
        position: nodePositions[n.id] ?? { x: 100, y: 100 },
        data: {
          label: n.label,
          node_type: n.node_type,
          description: n.description,
        },
        selected: n.id === selectedNodeId,
      })),
    [graphData.nodes, nodePositions, selectedNodeId]
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      graphData.edges.map((e) => ({
        id: e.id,
        source: e.source_id,
        target: e.target_id,
        label: e.relationship,
        type: 'smoothstep',
        style: { stroke: '#374151', strokeWidth: 1.5 },
        labelStyle: { fill: '#6b7280', fontSize: 9 },
        labelBgStyle: { fill: '#111827', fillOpacity: 0.8 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#374151', width: 16, height: 16 },
        animated: e.source_id === selectedNodeId || e.target_id === selectedNodeId,
      })),
    [graphData.edges, selectedNodeId]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [updateNodePosition]
  );

  const handleNodeClick = useCallback(
    async (_: React.MouseEvent, node: Node) => {
      const graphNode = graphData.nodes.find((n) => n.id === node.id);

      // Agent nodes open the Agent Panel overlay instead of NodeDetail
      if (graphNode?.node_type === ('agent' as string) && onOpenAgent) {
        onOpenAgent(graphNode);
        return;
      }

      setSelectedNode(node.id);
      setRightPanel('node_detail');
      setNodeDetailLoading(true);
      try {
        const detail = await apiClient.getNodeDetail(node.id);
        setNodeDetail(detail);
      } catch {
        setNodeDetail(null);
      } finally {
        setNodeDetailLoading(false);
      }
    },
    [graphData.nodes, onOpenAgent, setSelectedNode, setRightPanel, setNodeDetailLoading, setNodeDetail]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="relative w-full h-full bg-gray-950">
      {graphData.nodes.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-700 z-10 pointer-events-none">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <circle cx="12" cy="12" r="3" />
            <circle cx="4" cy="6" r="2" />
            <circle cx="20" cy="6" r="2" />
            <circle cx="4" cy="18" r="2" />
            <circle cx="20" cy="18" r="2" />
            <line x1="6" y1="6" x2="10" y2="10" />
            <line x1="18" y1="6" x2="14" y2="10" />
            <line x1="6" y1="18" x2="10" y2="14" />
            <line x1="18" y1="18" x2="14" y2="14" />
          </svg>
          <p className="text-sm text-center">
            대화를 시작하면<br />여기에 마인드맵이 생성됩니다
          </p>
        </div>
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.2}
        maxZoom={2}
        style={{ background: 'transparent' }}
      >
        <Background color="#1f2937" gap={24} size={1} />
        <Controls
          style={{
            background: '#111827',
            border: '1px solid #374151',
            borderRadius: '8px',
          }}
        />
        <MiniMap
          nodeColor={(node) => {
            const type = (node.data as { node_type: NodeType }).node_type;
            return TYPE_COLORS[type] ?? '#6b7280';
          }}
          style={{ background: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>

      <div className="absolute top-3 left-3 z-10">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Live Mind Map
        </h2>
        {graphData.nodes.length > 0 && (
          <p className="text-[10px] text-gray-700 mt-0.5">
            {graphData.nodes.length}개 노드 · {graphData.edges.length}개 연결
          </p>
        )}
      </div>
    </div>
  );
}
