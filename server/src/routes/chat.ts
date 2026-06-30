import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { ChatRequest, ChatResponse, Message, ToolCall, ToolResult } from '../types/index.js';
import { ConversationManager } from '../services/conversationManager.js';
import { ToolRegistry } from '../services/toolRegistry.js';
import { MockProvider } from '../services/llm/mockProvider.js';
import { OpenAIProvider } from '../services/llm/openaiProvider.js';
import {
  getCurrentTimeTool,
  calculatorTool,
  createTodoTool,
  listTodosTool,
  completeTodoTool,
  deleteTodoTool,
  queryEmployeeTool,
} from '../tools/index.js';

// ============================================================
// 初始化服务
// ============================================================
const conversationManager = new ConversationManager();
const toolRegistry = new ToolRegistry();

// 注册所有工具
toolRegistry.register(getCurrentTimeTool);
toolRegistry.register(calculatorTool);
toolRegistry.register(createTodoTool);
toolRegistry.register(listTodosTool);
toolRegistry.register(completeTodoTool);
toolRegistry.register(deleteTodoTool);
toolRegistry.register(queryEmployeeTool);

// 选择 LLM Provider：有 API Key 用 OpenAI，否则用 Mock
const llmProvider = process.env.OPENAI_API_KEY
  ? new OpenAIProvider()
  : new MockProvider();

// ============================================================
// 系统提示词
// ============================================================
const SYSTEM_PROMPT = `你是一个友好的内部员工 AI 助手。你可以：
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

重要规则：
- 当用户问时间相关的问题时，调用 getCurrentTime
- 当用户要求计算或输入了数学表达式时，调用 calculator
- 当用户要求创建待办、提醒或任务时，调用 createTodo
- 当用户询问"我有什么待办""查看待办"时，调用 listTodos
- 当用户要求完成/标记完成待办时，调用 completeTodo
- 当用户要求删除待办时，调用 deleteTodo
- 当用户查询员工或部门信息时，调用 queryEmployee
- 工具调用成功后，将结果用自然语言告诉用户
- 工具调用失败时，友好地告知用户失败原因`;

// ============================================================
// 路由
// ============================================================
export const chatRouter = Router();

/**
 * POST /api/chat
 *
 * 完整流程：
 * 1. 获取/创建会话
 * 2. 追加用户消息到会话历史
 * 3. 组装上下文（系统提示 + 历史消息）
 * 4. 调用 LLM → 可能返回工具调用
 * 5. 工具调用循环：执行工具 → 追加结果 → 再次调用 LLM
 * 6. 追加最终回复到会话历史
 * 7. 返回响应
 */
chatRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { conversationId, message } = req.body as ChatRequest;

    // 参数校验
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'message 字段不能为空' });
      return;
    }

    // 1. 获取或创建会话
    const conversation = conversationManager.getOrCreate(conversationId);

    // 如果是新会话，添加系统提示
    if (conversation.messages.length === 0) {
      conversationManager.appendMessage(conversation.id, {
        id: uuidv4(),
        role: 'system',
        content: SYSTEM_PROMPT,
        timestamp: Date.now(),
      });
    }

    // 2. 追加用户消息
    const userMsg: Message = {
      id: uuidv4(),
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    };
    conversationManager.appendMessage(conversation.id, userMsg);

    // 3. 获取完整上下文
    const context = conversationManager.getMessages(conversation.id);
    const tools = toolRegistry.getAll();

    // 4. 调用 LLM（可能包含工具调用循环）
    const MAX_TOOL_ROUNDS = 3; // 防止无限循环
    let llmResponse = await llmProvider.chat(context, tools);
    const executedToolCalls: Array<{
      name: string;
      arguments: Record<string, unknown>;
      result: ToolResult;
    }> = [];

    // 5. 工具调用循环
    let toolRound = 0;
    while (llmResponse.toolCalls.length > 0 && toolRound < MAX_TOOL_ROUNDS) {
      toolRound++;

      const toolResults: ToolResult[] = [];

      for (const toolCall of llmResponse.toolCalls) {
        const result = await toolRegistry.execute(toolCall.name, toolCall.arguments);
        toolResults.push(result);
        executedToolCalls.push({
          name: toolCall.name,
          arguments: toolCall.arguments,
          result,
        });
      }

      // 追加助手消息（含工具调用信息）
      const toolMsg: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: '',
        toolCalls: llmResponse.toolCalls,
        toolResults,
        timestamp: Date.now(),
      };
      conversationManager.appendMessage(conversation.id, toolMsg);

      // 更新上下文后再次调用 LLM
      const updatedContext = conversationManager.getMessages(conversation.id);
      llmResponse = await llmProvider.chat(updatedContext, tools);
    }

    // 6. 获取最终回复文本
    const finalContent = llmResponse.content || '抱歉，我暂时无法回答这个问题。';

    // 7. 追加最终助手回复
    const assistantMsg: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: finalContent,
      timestamp: Date.now(),
    };
    conversationManager.appendMessage(conversation.id, assistantMsg);

    // 8. 返回响应
    const response: ChatResponse = {
      conversationId: conversation.id,
      message: {
        id: assistantMsg.id,
        role: 'assistant',
        content: finalContent,
        timestamp: assistantMsg.timestamp,
      },
      toolCalls: executedToolCalls.length > 0 ? executedToolCalls : undefined,
    };

    res.json(response);
  } catch (err) {
    console.error('[Chat API] 错误:', err);
    res.status(500).json({
      error: '服务器内部错误',
      message: err instanceof Error ? err.message : '未知错误',
    });
  }
});

/**
 * GET /api/conversations/:id
 * 获取会话历史（调试用）
 */
chatRouter.get('/conversations/:id', (req: Request, res: Response) => {
  const messages = conversationManager.getMessages(req.params.id);
  res.json({ id: req.params.id, messages });
});
