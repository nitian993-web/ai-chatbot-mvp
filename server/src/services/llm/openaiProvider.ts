import type { LLMProvider, LLMResponse, Message, ToolDefinition } from '../../types/index.js';

/**
 * OpenAI Provider（可选）
 * 设置 OPENAI_API_KEY 环境变量后自动启用
 */
export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  async chat(messages: Message[], tools: ToolDefinition[]): Promise<LLMResponse> {
    // TODO: 步骤 5 实现真实的 OpenAI API 调用（含 function calling）
    throw new Error('OpenAI Provider 尚未实现，请先使用 Mock 模式');
  }
}
