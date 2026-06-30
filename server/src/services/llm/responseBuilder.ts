/**
 * 回复生成模块（智能增强版）
 * 包含：工具结果 → 自然语言回复、多层级智能闲聊
 */

import type { LLMResponse, Message } from '../../types/index.js';

// ============================================================
// 过渡语库（随机选用，避免机械重复）
// ============================================================
const transitions = {
  done: ['好的，', '收到，', '明白了，', '已为你', '帮你处理好了，', '搞定了，'],
  info: ['帮你查了一下，', '查到了，', '来看一下：', '这是结果：'],
  suggest: [
    '还有什么需要帮你的吗？',
    '还有其他事情要处理吗？',
    '需要继续帮你做什么吗？',
    '有新的任务随时告诉我～',
  ],
};

function pick(arr: string[], lastIdx?: number): { text: string; idx: number } {
  let idx: number;
  do {
    idx = Math.floor(Math.random() * arr.length);
  } while (idx === lastIdx && arr.length > 1);
  return { text: arr[idx], idx };
}

let transIdx = -1;
let suggestIdx = -1;

function transition(): string {
  const r = pick(transitions.done, transIdx);
  transIdx = r.idx;
  return r.text;
}

function suggestion(): string {
  const r = pick(transitions.suggest, suggestIdx);
  suggestIdx = r.idx;
  return ` ${r.text}`;
}

// ============================================================
// 工具结果 → 自然语言回复
// ============================================================
export function buildFinalResponse(
  toolResult: { toolName: string; success: boolean; data?: unknown; error?: string },
  userInput: string
): LLMResponse {
  if (!toolResult.success) {
    return {
      content: `抱歉，${toolResult.error || '工具执行时出错了'}，请稍后重试或换个方式提问。`,
      toolCalls: [],
    };
  }

  const data = toolResult.data as Record<string, unknown> | undefined;
  let content: string;

  switch (toolResult.toolName) {
    case 'getCurrentTime': {
      const datetime = data?.datetime || '未知时间';
      const dayOfWeek = data?.dayOfWeek ? `（${data.dayOfWeek}）` : '';
      const now = new Date();
      const hour = now.getHours();
      const period = hour < 6 ? '夜深了，注意休息 🌙' : hour < 12 ? '上午好！☀️' : hour < 14 ? '中午好！☀️' : hour < 18 ? '下午好！🌤️' : '晚上好！🌙';
      content = `${period} 现在是 ${datetime}${dayOfWeek}。需要我帮你安排今天的待办吗？`;
      break;
    }

    case 'calculator': {
      const expression = data?.expression || userInput;
      const result = data?.result ?? '计算失败';
      content = `好的，帮你算了一下：${expression} = ${result}`;
      // 如果结果是整数且比较大的，给点实用建议
      if (typeof result === 'number' && Number.isInteger(result) && result > 1000) {
        content += `\n💡 需要我再算点别的吗？`;
      }
      break;
    }

    case 'createTodo': {
      content = `${transition()}${data?.summary || '待办已创建！'}`;
      // 主动建议：询问是否需要设置提醒
      if (!data?.hasDueDate) {
        content += '\n💡 需要为这个待办设置截止时间吗？比如"截止明天下午"。';
      }
      // 如果已有截止日期，提醒一下
      if (data?.dueDate) {
        const dueMs = new Date(data.dueDate as string).getTime();
        const nowMs = Date.now();
        const daysLeft = Math.ceil((dueMs - nowMs) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 1) {
          content += `\n⚠️ 截止日期很近，只剩 ${daysLeft} 天了，记得优先处理！`;
        } else if (daysLeft <= 3) {
          content += `\n📅 还有 ${daysLeft} 天到期，时间还算充裕。`;
        }
      }
      break;
    }

    case 'completeTodo': {
      content = `${transition()}${data?.summary || '已标记完成！'}`;
      const remainingCount = data?.remainingCount as number | undefined;
      const totalCount = data?.totalCount as number | undefined;
      if (remainingCount !== undefined && remainingCount === 0 && totalCount && totalCount > 0) {
        content += '\n🎉 太厉害了，所有待办都完成了！';
      } else if (remainingCount !== undefined && remainingCount > 0) {
        content += `\n你还有 ${remainingCount} 个待办未完成，继续加油 💪`;
      }
      break;
    }

    case 'deleteTodo': {
      content = `${transition()}${data?.summary || '待办已删除！'}`;
      const remainingAfterDelete = data?.totalCount as number | undefined;
      if (remainingAfterDelete !== undefined && remainingAfterDelete > 0) {
        content += `\n还剩 ${remainingAfterDelete} 个待办。`;
      } else if (remainingAfterDelete === 0) {
        content += '\n现在没有待办事项了，清清爽爽！✨';
      }
      break;
    }

    case 'listTodos': {
      const todos = data?.todos as Array<Record<string, unknown>> | undefined;
      const count = data?.count as number || 0;

      if (!todos || count === 0) {
        content = '你目前没有待办事项。\n💡 试试说"帮我建一个待办：明天上午开会"，我来帮你记录。';
        break;
      }

      const priorityLabel: Record<string, string> = { high: '🔴 高', medium: '🟡 中', low: '🟢 低' };
      // 分离未完成/已完成，未完成的排前面
      const pending = todos.filter((t) => !t.completed);
      const done = todos.filter((t) => t.completed);

      let list = '';
      if (pending.length > 0) {
        list += '⏳ **进行中**\n';
        list += pending
          .map((t) => {
            const prio = priorityLabel[t.priority as string] || '🟡 中';
            const due = t.dueDate ? ` 📅${t.dueDate}` : '';
            return `  ☐ ${t.title}  ${prio}${due}`;
          })
          .join('\n');
      }
      if (done.length > 0) {
        if (list) list += '\n\n';
        list += '✅ **已完成**\n';
        list += done.map((t) => `  ☑ ${t.title}`).join('\n');
      }

      content = `${transition()}你共有 ${count} 个待办：\n${list}`;
      if (pending.length > 0) {
        const urgent = pending.filter((t) => t.priority === 'high').length;
        if (urgent > 0) {
          content += `\n\n⚠️ 其中有 ${urgent} 个高优先级，建议优先完成！`;
        } else {
          content += `\n\n📌 还有 ${pending.length} 个待完成，加油！`;
        }
      }
      break;
    }

    case 'queryEmployee': {
      const employees = data?.employees as Array<Record<string, string>> | undefined;
      const count = data?.count as number || 0;
      const queryName = data?.queryName as string | undefined;
      const queryDept = data?.queryDept as string | undefined;

      if (!employees || count === 0) {
        content = '抱歉，没有找到匹配的员工信息。\n💡 试试查具体的人名（如"张三"）或部门名（如"技术部"）。';
        break;
      }

      const list = employees
        .map((e) => {
          const dept = e.department || '';
          const pos = e.position || '';
          const email = e.email || '';
          return `- **${e.name}** · ${dept} · ${pos}\n  📧 ${email}`;
        })
        .join('\n');

      if (count === 1 && queryName) {
        content = `${transition()}找到了 ${queryName} 的信息：\n${list}`;
      } else if (queryDept) {
        content = `${transition()}${queryDept}共有 ${count} 位同事：\n${list}`;
      } else {
        content = `${transition()}找到了 ${count} 位员工：\n${list}`;
      }
      break;
    }

    default:
      content = `工具 ${toolResult.toolName} 执行完成。`;
  }

  return { content, toolCalls: [] };
}

// ============================================================
// 智能闲聊回复（多层匹配 + 上下文感知）
// ============================================================

let lastReplyIndex = -1;

export function generateChatResponse(input: string, messages: Message[]): string {
  const text = input.trim();
  const lower = text.toLowerCase();

  // ── 第 1 层：精确意图匹配 ──

  // 问候（排除"你好X"这类带额外内容的输入，但允许"你好啊"/"你好呀"等）
  if (/^(你好[啊呀哦]?|hi|hello|嗨|hey|在吗|早啊|晚上好|下午好|早上好)[!！。.~～\s]*$/i.test(lower)) {
    return greet();
  }

  // 再见
  if (/^(再见|拜拜|bye|晚安|回头见|下次聊)/i.test(lower)) {
    return '再见！有需要随时回来找我，我一直在这儿～';
  }

  // 感谢
  if (/谢谢|感谢|thanks|thank|多谢|谢啦/i.test(lower)) {
    return thank();
  }

  // 自我介绍
  if (/你是谁|你叫什么|你的名字|what are you|介绍一下自己/i.test(lower)) {
    return `我是内部员工 AI 助手 🤖
你可以把我当成一个随时在线的同事，我能帮你：
• ⏰ 查时间 • 🔢 算数据 • ✅ 管待办 • 👤 查同事

直接告诉我想做什么就行，不用客气～`;
  }

  // 功能询问
  if (/你能做什么|你有什么功能|你会什么|帮助|help|怎么用|使用说明/i.test(lower)) {
    return showHelp();
  }

  // ── 第 2 层：上下文感知 ──
  // 检查上一轮对话，判断是否是追问

  const lastAssistantMsg = findLastAssistantMsg(messages);
  const userMsgCount = messages.filter((m) => m.role === 'user').length;

  // 用户刚进入对话（第一轮）
  if (userMsgCount <= 1) {
    return `你好！我是你的 AI 助手，可以帮你查时间、做计算、管理待办、查员工信息。\n直接告诉我你想做什么吧～`;
  }

  // 如果上一轮是帮助信息，用户可能是想尝试某个功能
  if (lastAssistantMsg && /我可以帮你做这些事情/.test(lastAssistantMsg)) {
    return `试试直接告诉我具体需求，比如"现在几点"、"创建待办：提交周报"、"128×256等于多少"～`;
  }

  // 如果上一轮是待办列表为空，用户可能想创建
  if (lastAssistantMsg && /没有待办/.test(lastAssistantMsg)) {
    return `要现在创建一个吗？直接说"创建待办：你要做的事"就行～`;
  }

  // ── 第 3 层：话题感知 ──

  // 工作相关
  if (/加班|开会|周报|项目|需求|上线|排期|进度|ddl|deadline/i.test(lower)) {
    return workTopic(lower);
  }

  // 抱怨 / 情绪
  if (/好累|好烦|压力|不想上班|emo|崩溃|救救/i.test(lower)) {
    return comfort();
  }

  // 天气 / 日常
  if (/天气|下雨|晴天|好热|好冷|舒服/i.test(lower)) {
    return `确实～这种天气最适合待在工位写代码了 😄 需要我帮你做点什么吗？`;
  }

  // 吃饭 / 休息
  if (/吃饭|午饭|晚饭|外卖|食堂|喝|咖啡|奶茶|休息/i.test(lower)) {
    return `人是铁饭是钢！🍚 去吃点好的补充能量吧～ 回来如果需要处理工作，随时找我。`;
  }

  // 夸奖
  if (/厉害|不错|牛|棒|好用|方便/i.test(lower)) {
    return `哈哈谢谢！😄 能帮到你就好。有什么其他需求随时说～`;
  }

  // 疑问 / 不确定
  if (/可以.*吗|能不能|行不行|怎么办|怎么弄|不确定|不知道/i.test(lower)) {
    return `不确定的话可以先试试看～ 告诉我具体想做什么，我帮你判断能不能处理。`;
  }

  // 简短确认（好、嗯、行、ok）
  if (/^(好|嗯|行|ok|哦|对|是的|没错|可以)[!！。.]*$/i.test(lower)) {
    return `${suggestion().trim()}`;
  }

  // ── 第 4 层：默认兜底（20 条，带去重 + 话题关联） ──
  return defaultReply();
}

// ============================================================
// 子回复函数
// ============================================================

function greet(): string {
  const hour = new Date().getHours();
  const timeGreet = hour < 6 ? '夜深了' : hour < 9 ? '早上好' : hour < 12 ? '上午好' : hour < 14 ? '中午好' : hour < 18 ? '下午好' : '晚上好';
  return `${timeGreet}！我是内部员工 AI 助手，可以帮你查时间、做计算、管理待办、查询员工信息。有什么可以帮你的？`;
}

function thank(): string {
  const replies = [
    '不客气！随时找我～',
    '应该的，有需要再叫我。',
    '举手之劳！还有什么可以帮你的？',
    '客气啦，能帮到你就行 😊',
    '不用谢，记得有任务就来找我记录哦～',
  ];
  return replies[Math.floor(Math.random() * replies.length)];
}

function showHelp(): string {
  return `我能帮你做这些：

1. ⏰ **查时间** — "现在几点"
2. 🔢 **算数据** — "计算 128×256"  
3. ✅ **建待办** — "创建待办：提交周报，截止周五"
4. 📋 **看待办** — "我有什么待办"
5. ✔️ **标完成** — "完成周报待办"
6. 🗑️ **删待办** — "删除 xx 待办"
7. 👤 **查同事** — "张三在哪个部门" / "技术部有谁"

这些功能全在本地运行，无需联网，秒级响应 ⚡`;
}

function workTopic(text: string): string {
  if (/周报/.test(text)) return '周报确实容易忘！需要我帮你创建一个"提交周报"的待办提醒吗？直接说"帮我建：提交周报"就行～';
  if (/开会|会议/.test(text)) {
    // 尝试提取时间信息
    const timeMatch = text.match(/(?:明天|后天|今天|周[一二三四五六日]|\d+[点时]\d*[分]?|下午|上午|晚上)/g);
    const timeHint = timeMatch ? timeMatch.join('') : '';
    return timeHint
      ? `需要我帮你记下会议待办吗？直接说"帮我建一个待办：${timeHint}开会"我就帮你创建 ✅`
      : '需要我帮你记下会议待办吗？直接说"帮我建一个待办：开会"我就帮你创建 ✅';
  }
  if (/加班/.test(text)) return '辛苦了！💪 需要我帮你记录今天的加班任务吗？说"帮我记一下：加班"就行～';
  if (/上线|排期|deadline|ddl/i.test(text)) return '听起来很紧急！需要我帮你创建高优先级待办来跟踪吗？直接说"帮我建待办：..."就可以～';
  return '工作的事情可以交给我一部分～ 需要帮你记待办、查时间还是算数据？';
}

function comfort(): string {
  const replies = [
    '🫂 辛苦了！适当摸鱼也是一种工作技巧。需要帮你分担点什么吗？',
    '理解理解～要不试试把压力变成待办清单？一件一件来会清晰很多。',
    '😮‍💨 打工人何苦为难打工人。需要帮忙管理任务的话我随时在！',
    '工作是做不完的，身体是自己的。🍵 喝口水休息下，回头我帮你一起搞定。',
  ];
  if (lastReplyIndex >= 0 && replies.length > 1) {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * replies.length);
    } while (idx === lastReplyIndex);
    lastReplyIndex = idx;
    return replies[idx];
  }
  lastReplyIndex = Math.floor(Math.random() * replies.length);
  return replies[lastReplyIndex];
}

function defaultReply(): string {
  const defaults = [
    '明白了。还有其他需要帮你的吗？',
    '收到！如果需要计算、查时间或者管理待办，随时告诉我。',
    '好的，我记下了。还有什么想了解的？',
    '了解！需要我帮你处理什么事情吗？',
    '没问题，有什么其他需求尽管说～',
    '收到指令。你可以试试问我时间、帮你计算、或者管理待办事项。',
    '好的，我会继续关注你的需求。',
    '了解，有需要随时找我。',
    '收到，还有什么可以帮你的？',
    '好的，有新的任务也可以让我帮你记录。',
    '了解啦～ 不如试试我的其他功能？比如查时间、算数据、管理待办。',
    '好的。想试试创建你的第一个待办吗？说"创建待办：要做的事"就可以。',
    '收到！如果工作中遇到需要计算的地方，我也可以帮忙哦。',
    '好嘞，需要查哪位同事的信息也可以问我～',
    '明白。随时可以问我"现在几点"，我比手机还快 😄',
    '收到。有什么想法尽管说，能帮你做的我都试试。',
    '好的。有需要就找我，我一直在线。',
    '没问题～记得有任务可以让我帮你记录下来。',
    '了解。需要我帮忙安排什么就说，不用客气。',
    '收到！我比较擅长：查时间、算数、记待办、查员工——挑一个试试？',
  ];

  let idx: number;
  do {
    idx = Math.floor(Math.random() * defaults.length);
  } while (idx === lastReplyIndex && defaults.length > 1);

  lastReplyIndex = idx;
  return defaults[idx];
}

// ============================================================
// 辅助函数
// ============================================================

function findLastAssistantMsg(messages: Message[]): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant' && messages[i].content) {
      return messages[i].content;
    }
  }
  return undefined;
}
