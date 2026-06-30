import type { ToolDefinition, ToolResult } from '../types/index.js';

/**
 * 安全计算器 - 不使用 eval，通过白名单正则 + Function 构造器安全执行
 */
export const calculatorTool: ToolDefinition = {
  name: 'calculator',
  description: '安全计算数学表达式，支持加减乘除、括号、百分比和小数',
  parameters: [
    { name: 'expression', type: 'string', description: '数学表达式，如 "2 + 3 * 4" 或 "(100 - 20) * 0.15"', required: true },
  ],
  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const expression = (args.expression as string)?.trim();

    if (!expression) {
      return { success: false, error: '表达式不能为空' };
    }

    // 白名单校验：只允许数字、运算符、括号、空格、小数点、百分号
    const ALLOWED_PATTERN = /^[\d\s+\-*/().%]+$/;
    if (!ALLOWED_PATTERN.test(expression)) {
      return { success: false, error: `表达式包含不允许的字符。只支持数字、+、-、*、/、(、)、.、%` };
    }

    // 检查是否有实际的运算符（防止纯数字或空括号）
    if (!/[+\-*/%]/.test(expression.replace(/\s/g, ''))) {
      return { success: false, error: '表达式缺少运算符，请输入有效的数学表达式' };
    }

    try {
      // 使用 Function 构造器安全执行（白名单已过滤所有危险字符）
      const result = new Function(`return (${expression})`)();

      if (typeof result !== 'number' || !isFinite(result)) {
        return { success: false, error: `计算结果无效: ${result}` };
      }

      // 格式化结果（避免浮点数精度问题）
      const formatted = Number.isInteger(result) ? result : parseFloat(result.toFixed(10));

      return {
        success: true,
        data: {
          expression,
          result: formatted,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `表达式计算失败: ${err instanceof Error ? err.message : '语法错误'}`,
      };
    }
  },
};
