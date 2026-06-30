import type { ToolDefinition, ToolResult } from '../types/index.js';
import { deleteTodoByTitle } from './createTodo.js';

export const deleteTodoTool: ToolDefinition = {
  name: 'deleteTodo',
  description: '删除指定的待办事项',
  parameters: [
    { name: 'title', type: 'string', description: '待办标题关键词（支持模糊匹配）', required: true },
  ],
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const title = (args.title as string)?.trim();
    if (!title) {
      return { success: false, error: '请提供待办标题关键词' };
    }

    const todo = deleteTodoByTitle(title);
    if (!todo) {
      return { success: false, error: `未找到匹配的待办："${title}"` };
    }

    return {
      success: true,
      data: {
        todo: { id: todo.id, title: todo.title },
        summary: `已删除待办"${todo.title}" 🗑️`,
      },
    };
  },
};
