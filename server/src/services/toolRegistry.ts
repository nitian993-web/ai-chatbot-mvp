import type { ToolDefinition, ToolResult } from '../types/index.js';

/**
 * 工具注册中心
 * 管理所有可用工具的注册、查找和执行
 */
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  /** 注册一个工具 */
  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`工具 "${tool.name}" 已注册`);
    }
    this.tools.set(tool.name, tool);
  }

  /** 获取所有已注册工具的定义 */
  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /** 获取工具的定义描述（用于发送给 LLM） */
  getToolDescriptions(): Array<{ name: string; description: string; parameters: ToolDefinition['parameters'] }> {
    return this.getAll().map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }

  /** 执行指定工具 */
  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, error: `未找到工具: ${name}` };
    }
    try {
      return await tool.execute(args);
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : '工具执行异常',
      };
    }
  }
}
