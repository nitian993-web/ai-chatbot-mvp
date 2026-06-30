import type { ToolDefinition, ToolResult } from '../types/index.js';
import { completeTodoByTitle, getTodoList } from './createTodo.js';

export const completeTodoTool: ToolDefinition = {
  name: 'completeTodo',
  description: '将指定待办事项标记为已完成',
  parameters: [
    { name: 'title', type: 'string', description: '待办标题关键词（支持模糊匹配）', required: true },
  ],
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const title = (args.title as string)?.trim();
    if (!title) {
      return { success: false, error: '请提供待办标题关键词' };
    }

    const todo = completeTodoByTitle(title);
    if (!todo) {
      return { success: false, error: `未找到匹配的待办："${title}"` };
    }

    return {
      success: true,
      data: {
        todo: { id: todo.id, title: todo.title, priority: todo.priority, completed: todo.completed },
        summary: `已将"${todo.title}"标记为已完成 ✅`,
        totalCount: getTodoList().length,
        remainingCount: getTodoList().filter((t) => !t.completed).length,
      },
    };
  },
};
