import type { ToolDefinition, ToolResult } from '../types/index.js';
import { getTodoList } from './createTodo.js';

export const listTodosTool: ToolDefinition = {
  name: 'listTodos',
  description: '查询当前用户的所有待办事项列表，可按状态和优先级筛选',
  parameters: [
    { name: 'status', type: 'string', description: '筛选状态：pending（未完成）/ completed（已完成）/ all（全部），默认 all', required: false },
    { name: 'priority', type: 'string', description: '筛选优先级：high / medium / low，默认不筛选', required: false },
  ],
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    let todos = getTodoList();

    // 按状态筛选
    const status = (args.status as string)?.toLowerCase() || 'all';
    if (status === 'pending') {
      todos = todos.filter((t) => !t.completed);
    } else if (status === 'completed') {
      todos = todos.filter((t) => t.completed);
    }

    // 按优先级筛选
    const priority = args.priority as string | undefined;
    if (priority && ['high', 'medium', 'low'].includes(priority.toLowerCase())) {
      todos = todos.filter((t) => t.priority === priority.toLowerCase());
    }

    if (todos.length === 0) {
      const filterDesc = status !== 'all'
        ? `${status === 'completed' ? '已完成' : '未完成'}的`
        : '';
      return {
        success: true,
        data: {
          count: 0,
          todos: [],
          summary: `你目前没有${filterDesc}待办事项。`,
        },
      };
    }

    return {
      success: true,
      data: {
        count: todos.length,
        todos: todos.map((t) => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          dueDate: t.dueDate,
          completed: t.completed,
          createdAt: t.createdAt,
        })),
        summary: `你共有 ${todos.length} 个待办事项`,
      },
    };
  },
};
