// Shared event/message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export type { StepEvent } from '../AgentTimeline';
