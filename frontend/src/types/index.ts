export type NodeType = 'topic' | 'project' | 'task' | 'concept' | 'document';
export type MessageRole = 'user' | 'assistant';

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface GraphNode {
  id: string;
  label: string;
  node_type: NodeType;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  relationship: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ConversationExcerpt {
  conversation_id: string;
  conversation_title: string;
  messages: Message[];
}

export interface NodeDetail {
  node: GraphNode;
  summary: string;
  related_messages: Message[];
  conversation_excerpts: ConversationExcerpt[];
}
