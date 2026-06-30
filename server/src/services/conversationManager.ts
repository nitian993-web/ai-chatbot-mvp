import { v4 as uuidv4 } from 'uuid';
import type { Conversation, Message } from '../types/index.js';

/**
 * 会话管理器
 * 管理多轮对话的会话生命周期和消息历史
 * MVP 阶段使用内存存储（Map）
 */
export class ConversationManager {
  private conversations: Map<string, Conversation> = new Map();

  /** 创建新会话 */
  create(): Conversation {
    const conversation: Conversation = {
      id: uuidv4(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  /** 获取或创建会话 */
  getOrCreate(id: string | null): Conversation {
    if (id && this.conversations.has(id)) {
      return this.conversations.get(id)!;
    }
    return this.create();
  }

  /** 向会话追加消息 */
  appendMessage(conversationId: string, message: Message): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`会话不存在: ${conversationId}`);
    }
    conversation.messages.push(message);
    conversation.updatedAt = Date.now();
  }

  /** 获取会话完整消息历史 */
  getMessages(conversationId: string): Message[] {
    const conversation = this.conversations.get(conversationId);
    return conversation ? [...conversation.messages] : [];
  }
}
