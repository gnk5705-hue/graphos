import axios from 'axios';
import type { Conversation, Message, GraphData, NodeDetail } from '../types';

const BASE = 'http://localhost:8000';
const api = axios.create({ baseURL: BASE });

// ── Chat (SSE streaming) ─────────────────────────────────────────────────────

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (data: { message_id: string; conversation_id: string }) => void;
  onError: (err: Error) => void;
}

export const sendMessageStream = async (
  message: string,
  conversationId: string | null,
  callbacks: StreamCallbacks
): Promise<void> => {
  let convId = '';

  const response = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, conversation_id: conversationId }),
  });

  if (!response.ok || !response.body) {
    callbacks.onError(new Error(`서버 오류: ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.conversation_id) convId = data.conversation_id;
        if (data.token !== undefined) callbacks.onToken(data.token);
        if (data.done) callbacks.onDone({ message_id: data.message_id, conversation_id: convId });
      } catch {
        // skip malformed line
      }
    }
  }
};

// ── Conversations & Messages ─────────────────────────────────────────────────

export const getConversations = async (): Promise<Conversation[]> => {
  const { data } = await api.get('/api/conversations');
  return data;
};

export const getMessages = async (conversationId: string): Promise<Message[]> => {
  const { data } = await api.get(`/api/conversations/${conversationId}/messages`);
  return data;
};

export const deleteConversation = async (conversationId: string) => {
  await api.delete(`/api/conversations/${conversationId}`);
};

// ── Graph ────────────────────────────────────────────────────────────────────

export const getGraph = async (): Promise<GraphData> => {
  const { data } = await api.get('/api/graph');
  return data;
};

export const getMemoryGraph = async () => {
  const { data } = await api.get('/api/graph/memory');
  return data;
};

// ── Nodes ────────────────────────────────────────────────────────────────────

export const getNodeDetail = async (nodeId: string): Promise<NodeDetail> => {
  const { data } = await api.get(`/api/nodes/${nodeId}`);
  return data;
};

export const getConversationReplay = async (nodeId: string) => {
  const { data } = await api.get(`/api/nodes/${nodeId}/replay`);
  return data;
};

// ── Search ───────────────────────────────────────────────────────────────────

export const semanticSearch = async (query: string, limit = 10) => {
  const { data } = await api.post('/api/search', { query, limit });
  return data as { nodes: import('../types').GraphNode[]; messages: Message[] };
};

// ── Timeline ─────────────────────────────────────────────────────────────────

export const getTimeline = async (days = 30) => {
  const { data } = await api.get(`/api/timeline?days=${days}`);
  return data;
};

// ── Agents ───────────────────────────────────────────────────────────────────

export const listAgents = async () => {
  const { data } = await api.get('/api/agents');
  return data;
};

export const getAgentPersonas = async () => {
  const { data } = await api.get('/api/agents/personas');
  return data;
};

export const createAgent = async (params: {
  persona_key: string;
  custom_name?: string;
  custom_system_prompt?: string;
}) => {
  const { data } = await api.post('/api/agents', params);
  return data;
};

export const getAgentSessions = async (agentNodeId: string) => {
  const { data } = await api.get(`/api/agents/${agentNodeId}/sessions`);
  return data;
};

export const createAgentSession = async (agentNodeId: string) => {
  const { data } = await api.post(`/api/agents/${agentNodeId}/sessions`);
  return data;
};

export const getAgentSessionMessages = async (agentNodeId: string, sessionId: string) => {
  const { data } = await api.get(`/api/agents/${agentNodeId}/sessions/${sessionId}`);
  return data;
};

export interface AgentStreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export const chatWithAgent = async (
  agentNodeId: string,
  sessionId: string,
  message: string,
  callbacks: AgentStreamCallbacks,
): Promise<void> => {
  const response = await fetch(`${BASE}/api/agents/${agentNodeId}/sessions/${sessionId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    callbacks.onError(new Error(`서버 오류: ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.token !== undefined) callbacks.onToken(data.token);
        if (data.done) callbacks.onDone();
      } catch { /* skip */ }
    }
  }
};

// ── Actions ──────────────────────────────────────────────────────────────────

export interface ActionStreamCallbacks {
  onToken: (token: string) => void;
  onNodeCreated: (node: unknown) => void;
  onDone: (result: Record<string, unknown>) => void;
  onError: (err: Error) => void;
}

export const executeAction = async (
  nodeId: string,
  actionType: string,
  callbacks: ActionStreamCallbacks,
): Promise<void> => {
  const response = await fetch(`${BASE}/api/nodes/${nodeId}/actions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action_type: actionType }),
  });

  if (!response.ok || !response.body) {
    callbacks.onError(new Error(`서버 오류: ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'token') callbacks.onToken(data.content);
        if (data.type === 'node_created') callbacks.onNodeCreated(data.node);
        if (data.type === 'done') callbacks.onDone(data.result ?? {});
      } catch { /* skip */ }
    }
  }
};

export const executeActionSync = async (nodeId: string, actionType: string) => {
  const { data } = await api.post(`/api/nodes/${nodeId}/actions`, { action_type: actionType });
  return data;
};

// ── Integrations ─────────────────────────────────────────────────────────────

export const getIntegrationStatus = async (): Promise<{ github: boolean; notion: boolean }> => {
  const { data } = await api.get('/api/integrations/status');
  return data;
};
