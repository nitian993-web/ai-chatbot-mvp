// ============================================================
// 共享类型定义 - 前后端协议保持一致
// ============================================================

/** 消息角色 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

/** 工具参数定义（JSON Schema 风格） */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  description: string;
  required: boolean;
}

/** 工具定义 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  /** 执行工具，返回结果 */
  execute: (args: Record<string, unknown>) => Promise<ToolResult>;
}

/** 工具调用请求 */
export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

/** 工具执行结果 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/** 单条消息 */
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  timestamp: number;
}

/** 会话 */
export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

/** 聊天 API 请求 */
export interface ChatRequest {
  conversationId: string | null;
  message: string;
}

/** 聊天 API 响应 */
export interface ChatResponse {
  conversationId: string;
  message: Message;
  toolCalls?: {
    name: string;
    arguments: Record<string, unknown>;
    result: ToolResult;
  }[];
}

/** LLM Provider 接口 */
export interface LLMResponse {
  content: string | null;
  toolCalls: ToolCall[];
}

export interface LLMProvider {
  chat(messages: Message[], tools: ToolDefinition[]): Promise<LLMResponse>;
}
