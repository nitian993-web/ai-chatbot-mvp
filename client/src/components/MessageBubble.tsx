import type { ChatMessage } from '../types/chat';
import { ToolCallCard } from './ToolCallCard';

interface Props {
  message: ChatMessage;
  onRetry?: () => void;
}

export function MessageBubble({ message, onRetry }: Props) {
  const isUser = message.role === 'user';
  const isError = message.id.startsWith('error-');

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
        {/* 消息气泡 */}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-white border text-gray-800 rounded-bl-md shadow-sm'
          }`}
        >
          {message.content}
          {/* 重试按钮 */}
          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
            >
              重新发送
            </button>
          )}
        </div>

        {/* 工具调用卡片 */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.toolCalls.map((tc, i) => (
              <ToolCallCard key={i} toolCall={tc} />
            ))}
          </div>
        )}

        {/* 时间戳 */}
        <p
          className={`text-[10px] text-gray-400 mt-1 ${
            isUser ? 'text-right mr-1' : 'ml-1'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  );
}
