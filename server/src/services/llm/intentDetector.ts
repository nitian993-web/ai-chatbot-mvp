/**
 * 意图识别 & 参数提取模块
 * 从 mockProvider 中独立出来，便于维护和测试
 */

// ============================================================
// 意图类型（从 mockProvider 中提升,外部也可引用）
// ============================================================
export type Intent =
  | { type: 'chat' }
  | { type: 'time_query'; timezone?: string }
  | { type: 'calculator'; expression: string }
  | { type: 'create_todo'; title: string; priority?: string; dueDate?: string }
  | { type: 'list_todos'; status?: string; priority?: string }
  | { type: 'query_employee'; name?: string; department?: string }
  | { type: 'complete_todo'; title?: string; id?: string }
  | { type: 'delete_todo'; title?: string; id?: string };

// ============================================================
// 意图识别
// ============================================================
export function detectIntent(input: string): Intent {
  const text = input.trim();

  // 1. 时间查询
  const timePatterns = [
    /现在几点|当前时间|几点了|现在时间|今天日期|今天几号|今天星期|现在是什么时候|查.*时间/,
    /what time|current time|now/i,
  ];
  for (const p of timePatterns) {
    if (p.test(text)) {
      const tzMatch = text.match(/时区[：:]\s*([\w/]+)/) || text.match(/([\w/]+)\s*时[区间]/);
      return { type: 'time_query', timezone: tzMatch?.[1] };
    }
  }

  // 2. 计算器（排除日期表达式如 2026-07-01）
  if (/[计帮].*算|算.*(一下|算)|求.*值|等于多少/.test(text)) {
    const expr = extractMathExpression(text);
    if (expr && !isDateExpression(expr)) {
      return { type: 'calculator', expression: expr };
    }
  }
  const pureMathExpr = extractMathExpression(text);
  if (pureMathExpr && /[\d]+\s*[+\-*/%]\s*[\d]+/.test(pureMathExpr) && !isDateExpression(pureMathExpr)) {
    return { type: 'calculator', expression: pureMathExpr };
  }

  // 3. 待办完成/删除（必须在创建之前，避免"完成 xx 待办"被创建匹配）
  if (/完成.*待办|标记.*完成|做完.*待办|待办.*完成|搞定.*待办|完成.*任务|完成\S{2,}/.test(text) ||
      /(?:已完成|做完了|done)/i.test(text) && /待办|任务/.test(text)) {
    const title = extractTitleAfterKeyword(text, /完成|标记|做完|搞定/);
    // 守卫：标题过短（如"了""啦"）说明是日常用语，退回普通对话
    if (title && title.length >= 2) {
      return { type: 'complete_todo', title };
    }
  }
  if (/删除.*待办|移除.*待办|删掉.*待办|取消.*待办|清除.*待办|删除.*任务|删除.*代码|删除.*提醒|删除\S{2,}/.test(text)) {
    const title = extractTitleAfterKeyword(text, /删除|移除|删掉|取消|清除|删了/);
    if (title && title.length >= 2) {
      return { type: 'delete_todo', title };
    }
  }

  // 疑问句守卫："可以...吗" "能不能..." 结尾带"吗"的句子是询问而非创建
  const looksLikeQuestion = /^(可以|能|能不能|可否|是否).*[吗？?]$/.test(text);

  // 4. 待办创建
  const todoPatterns = [
    /创建待办|添加待办|帮我.*待办|帮我记|提醒我|创建一个?.*任务|新建.*任务/,
    /设置提醒|加个提醒|待办.*创建/,
  ];
  for (const p of todoPatterns) {
    if (p.test(text)) {
      // 疑问句式是为询问能力，跳过创建
      if (looksLikeQuestion) return { type: 'chat' };
      const title = extractTodoTitle(text);
      // 守卫：标题无效（纯疑问语气词或空）说明用户在询问而非创建
      if (isInvalidTitle(title)) return { type: 'chat' };
      const priority = extractPriority(text);
      const dueDate = extractDate(text);
      return { type: 'create_todo', title, priority, dueDate };
    }
  }

  // 5. 待办查询
  const listTodoPatterns = [
    /我有.*待办|我的待办|查看待办|待办列表|有哪些待办|查询待办|还有.*待办|显示待办|列出待办/,
    /有什么.*任务|查看.*任务|任务列表/,
  ];
  for (const p of listTodoPatterns) {
    if (p.test(text)) {
      const status = /已完成|完成.*的/.test(text) ? 'completed' : /未完成|还没.*做/.test(text) ? 'pending' : undefined;
      const priority = extractPriority(text);
      return { type: 'list_todos', status, priority };
    }
  }

  // 6. 员工查询
  const empPatterns = [
    /查.*员工|员工.*查|谁.*部门|部门.*有谁|找.*同事|查询.*同事/,
    /技术部|产品部|设计部|市场部|人事部|财务部/,
    /张三|李四|王五|赵六|孙七|周八|吴九|郑十/,
  ];
  for (const p of empPatterns) {
    if (p.test(text)) {
      const name = extractEmployeeName(text);
      const department = extractDepartment(text);
      return { type: 'query_employee', name, department };
    }
  }

  // 7. 默认：普通对话
  return { type: 'chat' };
}

// ============================================================
// 参数提取
// ============================================================

/** 判断提取的标题是否为无效标题（疑问语气词、空串） */
function isInvalidTitle(title: string): boolean {
  return !title || title.length < 2 || /^[吗吧呢啊哦呀]$/.test(title);
}

/** 判断提取的表达式是否为纯日期（如 2026-07-01），避免误入计算器 */
function isDateExpression(expr: string): boolean {
  // 匹配 YYYY-MM-DD 或 YYYY/MM/DD
  return /^\d{4}[-\/]\d{2}[-\/]\d{2}$/.test(expr.trim());
}

export function extractMathExpression(text: string): string | null {
  const mathMatch = text.match(/([\d\s+\-*/().%]+)/);
  if (mathMatch) {
    const expr = mathMatch[1].trim();
    if (/[\d]/.test(expr) && /[+\-*/%]/.test(expr)) {
      return expr;
    }
  }
  return null;
}

export function extractTodoTitle(text: string): string {
  const patterns = [
    /待办[：:]?\s*(.+?)(?:[，,。.吗吧呢啊？?]|$)/,
    /提醒我\s*(.+?)(?:[，,。.吗吧呢啊？?]|$)/,
    /帮我记\s*(.+?)(?:[，,。.吗吧呢啊？?]|$)/,
    /创建.*?任务[：:]?\s*(.+?)(?:[，,。.吗吧呢啊？?]|$)/,
    /添加待办[：:]?\s*(.+?)(?:[，,。.吗吧呢啊？?]|$)/,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match?.[1]) {
      // 清除量词前缀和疑问后缀
      const raw = match[1].replace(/^[一个]?[个些点下]+/, '').trim();
      if (raw.length >= 2 && !/^[吗吧呢啊哦呀]$/.test(raw)) return raw;
    }
  }
  return text
    .replace(/创建待办|添加待办|帮我记|帮我|提醒我|请|一下/g, '')
    .replace(/[，,。.吗吧呢啊？?]/g, '')
    .trim() || '未命名待办';
}

/** 从关键词后提取标题（用于完成/删除操作） */
function extractTitleAfterKeyword(text: string, keywordPattern: RegExp): string | undefined {
  const match = text.match(new RegExp('(?:' + keywordPattern.source + ')[：:]*\s*(.+?)(?:[，,。.]|$)'));
  return match?.[1]?.trim() || undefined;
}

export function extractPriority(text: string): string | undefined {
  if (/高优先|优先.*高|紧急|urgent/i.test(text)) return 'high';
  if (/低优先|优先.*低|不急/i.test(text)) return 'low';
  return undefined;
}

export function extractDate(text: string): string | undefined {
  const match = text.match(/(\d{4}[-/]\d{2}[-/]\d{2})/);
  if (match) return match[1].replace(/\//g, '-');

  const now = new Date();
  if (/明天/.test(text)) {
    now.setDate(now.getDate() + 1);
    return now.toISOString().slice(0, 10);
  }
  if (/后天/.test(text)) {
    now.setDate(now.getDate() + 2);
    return now.toISOString().slice(0, 10);
  }
  return undefined;
}

export function extractEmployeeName(text: string): string | undefined {
  const knownNames = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十'];
  for (const name of knownNames) {
    if (text.includes(name)) return name;
  }
  return undefined;
}

export function extractDepartment(text: string): string | undefined {
  const depts = ['技术部', '产品部', '设计部', '市场部', '人事部', '财务部'];
  for (const dept of depts) {
    if (text.includes(dept)) return dept;
  }
  return undefined;
}
