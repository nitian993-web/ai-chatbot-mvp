import { v4 as uuidv4 } from 'uuid';
import type { ToolDefinition, ToolResult } from '../types/index.js';

/** 待办优先级 */
type Priority = 'high' | 'medium' | 'low';

interface TodoItem {
  id: string;
  title: string;
  priority: Priority;
  dueDate: string | null;
  completed: boolean;
  createdAt: string;
}

/** 内存待办存储（MVP 阶段） */
const todoStore: TodoItem[] = [];

export const createTodoTool: ToolDefinition = {
  name: 'createTodo',
  description: '创建一个新的待办事项，支持设置优先级和截止日期',
  parameters: [
    { name: 'title', type: 'string', description: '待办标题', required: true },
    { name: 'priority', type: 'string', description: '优先级：high（高）/ medium（中）/ low（低），默认 medium', required: false },
    { name: 'dueDate', type: 'string', description: '截止日期，格式 YYYY-MM-DD', required: false },
  ],
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const title = (args.title as string)?.trim();
    if (!title) {
      return { success: false, error: '待办标题不能为空' };
    }

    // 校验优先级
    const priorityInput = (args.priority as string)?.toLowerCase();
    const validPriorities: Priority[] = ['high', 'medium', 'low'];
    const priority: Priority = validPriorities.includes(priorityInput as Priority)
      ? (priorityInput as Priority)
      : 'medium';

    // 校验日期格式
    const dueDate = args.dueDate as string | undefined;
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return { success: false, error: '截止日期格式不正确，请使用 YYYY-MM-DD 格式' };
    }

    const todo: TodoItem = {
      id: uuidv4().slice(0, 8),
      title,
      priority,
      dueDate: dueDate || null,
      completed: false,
      createdAt: new Date().toISOString(),
    };

    todoStore.push(todo);

    // 只保留最近 100 条
    if (todoStore.length > 100) {
      todoStore.shift();
    }

    const priorityLabel: Record<Priority, string> = { high: '高', medium: '中', low: '低' };

    return {
      success: true,
      data: {
        todo,
        summary: `已创建待办: "${title}"（优先级: ${priorityLabel[priority]}${dueDate ? `，截止: ${dueDate}` : ''}）`,
        totalCount: todoStore.length,
      },
    };
  },
};

/** 导出待办列表（供查询使用） */
export function getTodoList(): TodoItem[] {
  return [...todoStore];
}

/** 按标题模糊匹配标记完成 */
export function completeTodoByTitle(title: string): TodoItem | null {
  // 优先精确匹配
  let todo = todoStore.find((t) => t.title.includes(title) && !t.completed);
  if (!todo) {
    // 降级：提取 2+ 字子串逐项匹配
    todo = todoStore.find((t) => !t.completed && hasWordOverlap(t.title, title));
  }
  if (todo) {
    todo.completed = true;
  }
  return todo || null;
}

/** 按标题模糊匹配删除 */
export function deleteTodoByTitle(title: string): TodoItem | null {
  let idx = todoStore.findIndex((t) => t.title.includes(title));
  if (idx === -1) {
    idx = todoStore.findIndex((t) => hasWordOverlap(t.title, title));
  }
  if (idx !== -1) {
    const [removed] = todoStore.splice(idx, 1);
    return removed;
  }
  return null;
}

/** 检查两段中文文本是否有重叠词（2+ 字公共子串） */
function hasWordOverlap(a: string, b: string): boolean {
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  for (let i = 0; i < shorter.length - 1; i++) {
    for (let j = i + 2; j <= shorter.length; j++) {
      if (longer.includes(shorter.slice(i, j))) return true;
    }
  }
  return false;
}
