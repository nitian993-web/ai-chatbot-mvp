// ============================================================
// 前端类型定义 - 与后端 ChatResponse 保持一致
// ============================================================

export interface ToolCallInfo {
  name: string;
  arguments: Record<string, unknown>;
  result: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCallInfo[];
  timestamp: number;
}

export interface ChatResponse {
  conversationId: string;
  message: {
    id: string;
    role: 'assistant';
    content: string;
    timestamp: number;
  };
  toolCalls?: ToolCallInfo[];
}
