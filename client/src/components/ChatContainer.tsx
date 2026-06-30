import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import type { ChatMessage, ChatResponse } from '../types/chat';

export function ChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUserInput, setLastUserInput] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setLastUserInput(text);

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message: text }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: ChatResponse = await res.json();

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      const aiMsg: ChatMessage = {
        id: data.message.id,
        role: 'assistant',
        content: data.message.content,
        toolCalls: data.toolCalls,
        timestamp: data.message.timestamp,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `抱歉，请求失败：${err instanceof Error ? err.message : '未知错误'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, loading]);

  const handleRetry = useCallback(() => {
    if (lastUserInput) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.id.startsWith('error-')) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      setTimeout(() => sendMessage(lastUserInput), 50);
    }
  }, [lastUserInput, sendMessage]);

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto">
      <div ref={listRef} className="flex-1 overflow-y-auto chat-scroll px-4 py-4">
        <MessageList messages={messages} loading={loading} onRetry={handleRetry} />
      </div>
      <div className="flex-shrink-0 border-t bg-white px-4 py-3">
        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  );
}
