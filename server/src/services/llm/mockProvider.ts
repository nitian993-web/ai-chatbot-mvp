/**
 * Mock LLM Provider（精简版）
 *
 * 职责：编排意图识别 → 工具路由 → 回复生成
 * 意图识别与参数提取 → intentDetector.ts
 * 回复生成 → responseBuilder.ts
 */

import type { LLMProvider, LLMResponse, Message, ToolDefinition } from '../../types/index.js';
import { detectIntent } from './intentDetector.js';
import { buildFinalResponse, generateChatResponse } from './responseBuilder.js';

export const SYSTEM_PROMPT = `你是一个友好的内部员工 AI 助手。你可以：
1. 进行自然语言对话，回答常见问题
2. 在合适的时候自动调用工具来完成任务

可用的工具有：
- getCurrentTime: 查询当前时间和日期
- calculator: 进行数学计算
- createTodo: 创建待办事项
- listTodos: 查看待办事项列表
- completeTodo: 标记待办为已完成
- deleteTodo: 删除待办事项
- queryEmployee: 查询员工信息

当用户的问题需要用到这些工具时，你会自动调用，并将结果用自然语言告诉用户。`;

export class MockProvider implements LLMProvider {
  async chat(messages: Message[], _tools: ToolDefinition[]): Promise<LLMResponse> {
    const userMessages = messages.filter((m) => m.role === 'user');
    const lastUserMsg = userMessages[userMessages.length - 1];
    if (!lastUserMsg) {
      return { content: '你好！请问有什么可以帮你的？', toolCalls: [] };
    }

    const input = lastUserMsg.content;

    // 本轮是否有未消费的工具结果
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf('user');
    const currentRoundMessages = messages.slice(lastUserIndex + 1);
    const lastToolResult = findLastToolResult(currentRoundMessages);

    if (lastToolResult) {
      return buildFinalResponse(lastToolResult, input);
    }

    // 意图识别 → 工具路由
    const intent = detectIntent(input);
    return this.routeIntent(intent, input, messages);
  }

  // ============================================================
  // 工具路由
  // ============================================================
  private routeIntent(intent: ReturnType<typeof detectIntent>, input: string, messages: Message[]): LLMResponse {
    switch (intent.type) {
      case 'time_query':
        return {
          content: null,
          toolCalls: [
            { name: 'getCurrentTime', arguments: intent.timezone ? { timezone: intent.timezone } : {} },
          ],
        };

      case 'calculator':
        return {
          content: null,
          toolCalls: [{ name: 'calculator', arguments: { expression: intent.expression } }],
        };

      case 'create_todo':
        return {
          content: null,
          toolCalls: [{
            name: 'createTodo',
            arguments: {
              title: intent.title,
              ...(intent.priority ? { priority: intent.priority } : {}),
              ...(intent.dueDate ? { dueDate: intent.dueDate } : {}),
            },
          }],
        };

      case 'complete_todo':
        return {
          content: null,
          toolCalls: [{
            name: 'completeTodo',
            arguments: {
              ...(intent.title ? { title: intent.title } : {}),
              ...(intent.id ? { id: intent.id } : {}),
            },
          }],
        };

      case 'delete_todo':
        return {
          content: null,
          toolCalls: [{
            name: 'deleteTodo',
            arguments: {
              ...(intent.title ? { title: intent.title } : {}),
              ...(intent.id ? { id: intent.id } : {}),
            },
          }],
        };

      case 'list_todos':
        return {
          content: null,
          toolCalls: [{
            name: 'listTodos',
            arguments: {
              ...(intent.status ? { status: intent.status } : {}),
              ...(intent.priority ? { priority: intent.priority } : {}),
            },
          }],
        };

      case 'query_employee':
        return {
          content: null,
          toolCalls: [{
            name: 'queryEmployee',
            arguments: {
              ...(intent.name ? { name: intent.name } : {}),
              ...(intent.department ? { department: intent.department } : {}),
            },
          }],
        };

      case 'chat':
      default:
        return { content: generateChatResponse(input, messages), toolCalls: [] };
    }
  }
}

// ============================================================
// 查找未消费的工具结果
// ============================================================
function findLastToolResult(messages: Message[]): {
  toolName: string;
  success: boolean;
  data?: unknown;
  error?: string;
} | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (
      msg.role === 'assistant' &&
      msg.content === '' &&
      msg.toolResults &&
      msg.toolResults.length > 0
    ) {
      const tr = msg.toolResults[msg.toolResults.length - 1];
      const tcName = msg.toolCalls?.[msg.toolCalls.length - 1]?.name || 'unknown';
      return { toolName: tcName, success: tr.success, data: tr.data, error: tr.error };
    }
  }
  return null;
}
