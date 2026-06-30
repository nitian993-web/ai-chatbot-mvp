import type { ChatMessage } from '../types/chat';
import { MessageBubble } from './MessageBubble';

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  onRetry: () => void;
}

export function MessageList({ messages, loading, onRetry }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <p className="text-2xl mb-2">💬</p>
          <p>发送消息开始对话</p>
          <p className="text-xs mt-1">试试问时间、做计算、创建待办</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} onRetry={onRetry} />
      ))}
      {loading && (
        <div className="flex items-center gap-2 text-gray-400 text-sm pl-2">
          <span className="animate-pulse">●</span>
          <span>AI 思考中...</span>
        </div>
      )}
    </div>
  );
}
