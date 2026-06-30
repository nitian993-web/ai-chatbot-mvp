import type { ToolDefinition, ToolResult } from '../types/index.js';

export const getCurrentTimeTool: ToolDefinition = {
  name: 'getCurrentTime',
  description: '获取当前日期和时间，支持指定时区（默认 Asia/Shanghai）',
  parameters: [
    { name: 'timezone', type: 'string', description: '时区，如 Asia/Shanghai、America/New_York', required: false },
  ],
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const timezone = (args.timezone as string) || 'Asia/Shanghai';

    try {
      const now = new Date();
      const formatted = now.toLocaleString('zh-CN', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        weekday: 'long',
      });

      return {
        success: true,
        data: {
          datetime: formatted,
          iso: now.toISOString(),
          timezone,
          timestamp: now.getTime(),
        },
      };
    } catch {
      return {
        success: false,
        error: `无效的时区: ${timezone}。请使用如 Asia/Shanghai、America/New_York 等合法时区。`,
      };
    }
  },
};
