import type { ToolCallInfo } from '../types/chat';

interface Props {
  toolCall: ToolCallInfo;
}

const TOOL_LABELS: Record<string, string> = {
  getCurrentTime: '⏰ 时间查询',
  calculator: '🔢 计算器',
  createTodo: '✅ 创建待办',
  listTodos: '📋 查看待办',
  completeTodo: '✔️ 完成待办',
  deleteTodo: '🗑️ 删除待办',
  queryEmployee: '👤 员工查询',
};

/** 严谨类型判断：是否为非 null 对象 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** 结构化展示参数 */
function renderArgs(args: Record<string, unknown>): string | null {
  const entries = Object.entries(args).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return null;

  // 特殊工具：美化展示
  return entries
    .map(([key, val]) => {
      const label = { title: '标题', priority: '优先级', dueDate: '截止', status: '状态', name: '姓名', department: '部门', expression: '表达式' }[key] || key;
      const valStr = typeof val === 'string' ? val : JSON.stringify(val);
      return `${label}: ${valStr}`;
    })
    .join(' · ');
}

/** 从 result.data 中提取可读摘要 */
function renderResultSummary(data: unknown): string | null {
  if (isRecord(data)) {
    // 如果有 summary 字段，直接用
    if (typeof data.summary === 'string') return data.summary;
    // 如果有 count
    if (typeof data.count === 'number') {
      return `${data.count} 条结果`;
    }
  }
  return null;
}

export function ToolCallCard({ toolCall }: Props) {
  const label = TOOL_LABELS[toolCall.name] || `🔧 ${toolCall.name}`;
  const isSuccess = toolCall.result.success;
  const argsText = renderArgs(toolCall.arguments);
  const resultSummary = isSuccess ? renderResultSummary(toolCall.result.data) : null;

  return (
    <details className="bg-gray-50 border border-gray-200 rounded-lg text-xs group" open>
      <summary className="px-3 py-2 cursor-pointer select-none flex items-center gap-1.5 text-gray-500 hover:text-gray-700">
        <span>{label}</span>
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
          isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {isSuccess ? '✓ 成功' : '✗ 失败'}
        </span>
      </summary>

      <div className="px-3 pb-2 space-y-1.5">
        {/* 参数 */}
        {argsText && (
          <div className="text-gray-400">{argsText}</div>
        )}

        {/* 成功结果 */}
        {isSuccess && resultSummary && (
          <div className="text-gray-700">{resultSummary}</div>
        )}

        {/* 失败错误 */}
        {!isSuccess && (
          <div className="text-red-500">
            {toolCall.result.error || '未知错误'}
          </div>
        )}
      </div>
    </details>
  );
}
