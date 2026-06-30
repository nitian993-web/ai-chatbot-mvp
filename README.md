# AI Chatbot MVP

内部员工智能助手，支持时间查询、数学计算、待办管理、员工信息查询。Mock 模式开箱即用，无需 API Key。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React + TypeScript + Vite + Tailwind CSS |
| 后端 | Express + TypeScript (tsx 热加载) |
| LLM | Mock Provider（本地意图识别 + 规则路由） |

## 快速开始

### 环境要求

- Node.js ≥ 18.x
- npm ≥ 9.x
- 操作系统：Windows / macOS / Linux

### 安装 & 启动

```bash
# 1. 进入项目目录
cd ai-chatbot-mvp

# 2. 安装依赖
cd client && npm install
cd ../server && npm install

# 3. 启动后端（新终端窗口 1）
cd server && npm run dev
# 看到 [Server] AI Chatbot MVP 后端已启动: http://localhost:3001
# 看到 [Server] Mock 模式: 启用 (无 API Key)

# 4. 启动前端（新终端窗口 2）
cd client && npm run dev
# 看到 VITE v5.x.x  ready in xxx ms
# 看到 ➜  Local:   http://localhost:5173/
```

打开浏览器访问 **http://localhost:5173** 即可使用。

### 故障排查

如果启动时报 `EADDRINUSE`（端口被占用）：

```bash
# Windows PowerShell
netstat -ano | findstr ":3001"
taskkill /PID <PID> /F

# macOS / Linux
lsof -i :3001
kill -9 <PID>
```

### 验证启动成功

在浏览器打开 http://localhost:5173，输入以下消息快速验证：

| 输入 | 预期结果 |
|---|---|
| `现在几点` | 返回当前时间 |
| `128 * 256` | 返回 32768 |
| `创建待办：测试` | 创建成功 |

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `PORT` | 否 | `3001` | 后端服务端口 |
| `OPENAI_API_KEY` | 否 | （空） | 设置后自动切换为真实 LLM；不设置则使用 Mock 模式 |
| `OPENAI_MODEL` | 否 | `gpt-4o-mini` | 真实 LLM 模型名 |
| `OPENAI_BASE_URL` | 否 | `https://api.openai.com/v1` | 兼容 API 的自定义地址 |

**Mock 模式是默认行为**：不设置任何环境变量即可零配置启动，所有功能正常可用。如需切换真实 LLM，复制 `.env.example` 为 `.env` 并填入 `OPENAI_API_KEY`。

## 项目结构

```
ai-chatbot-mvp/
├── client/                      # 前端
│   └── src/
│       ├── App.tsx              # 多标签页管理入口
│       ├── components/
│       │   ├── ChatContainer.tsx # 单对话容器
│       │   ├── ChatInput.tsx     # 输入框
│       │   ├── MessageList.tsx   # 消息列表
│       │   ├── MessageBubble.tsx # 消息气泡（含重试）
│       │   ├── ToolCallCard.tsx  # 工具调用卡片
│       │   └── TabBar.tsx        # 多标签栏
│       └── api/
│           └── chat.ts          # API 请求封装
├── server/                      # 后端
│   └── src/
│       ├── index.ts             # 入口
│       ├── routes/
│       │   └── chat.ts          # POST /api/chat
│       ├── services/
│       │   └── llm/
│       │       ├── mockProvider.ts    # Mock LLM 编排
│       │       ├── intentDetector.ts  # 意图识别 + 参数提取
│       │       └── responseBuilder.ts # 回复构建 + 过渡语
│       └── tools/               # 工具实现
│           ├── getCurrentTime.ts
│           ├── calculator.ts
│           ├── createTodo.ts
│           ├── listTodos.ts
│           ├── completeTodo.ts
│           ├── deleteTodo.ts
│           └── queryEmployee.ts
└── README.md
```

## 功能清单

| # | 功能 | 示例输入 |
|---|---|---|
| 1 | 时间查询 | "现在几点" |
| 2 | 数学计算 | "128×256 等于多少" |
| 3 | 创建待办 | "创建待办：提交周报，高优先级，截止2026-07-01" |
| 4 | 查看待办 | "我有什么待办" |
| 5 | 完成待办 | "完成周报"（模糊匹配） |
| 6 | 删除待办 | "删除review代码" |
| 7 | 员工查询 | "张三在哪个部门" |

## 工具调用说明

系统通过正则意图识别自动判断该调用哪个工具，无需用户手动选择：

```
用户输入
  │
  ▼
IntentDetector（正则意图识别 + 参数提取）
  ├── 时间查询   → getCurrentTime
  ├── 数学计算   → calculator（含日期表达式守卫）
  ├── 完成待办   → completeTodo（模糊匹配）
  ├── 删除待办   → deleteTodo（模糊匹配）
  ├── 创建待办   → createTodo（含标题/疑问句守卫）
  ├── 查看待办   → listTodos
  ├── 员工查询   → queryEmployee
  └── 闲聊兜底   → responseBuilder（4 层智能回复）
  │
  ▼
MockProvider → Tool.execute() → ResponseBuilder
  │
  ▼
返回 JSON { message, toolCalls }
  │
  ▼
前端 → MessageBubble（自然语言）+ ToolCallCard（可折叠详情）
```

**意图判断优先级**：按上表顺序依次匹配，先命中先返回。

**守卫机制**（防止误判）：
- 日期表达式守卫：`2026-07-01` 不会进入计算器，防止日期被当成算术表达式
- 疑问句守卫：`可以帮我记个待办吗` 识别为询问而非创建指令
- 标题长度守卫：`完成了` `删除了` 不会被误判为待办操作

## 多标签页

- 顶部 **TabBar** 管理多个独立对话
- 点击 **+ 新对话** 创建新标签，自动切换到新标签
- 点击标签名切换对话，每个标签独立保存消息历史
- 悬停标签显示 × 关闭按钮（至少保留一个标签）
- 标签编号自动回收：关闭某个标签后，新建标签会复用最小的可用编号

## Mock 模式

项目不需要 OpenAI API Key。后端使用本地规则引擎：

```
用户输入 → IntentDetector（正则意图识别）
         → MockProvider（路由）
         → Tool（执行业务逻辑）
         → ResponseBuilder（构建回复 + "好的/帮你"过渡语）
```

意图检测优先级：时间 → 计算器 → 完成/删除待办 → 创建待办 → 查看待办 → 员工查询 → 闲聊兜底。

## 待办管理完整流程

```
创建                     查看                      完成/删除
┌──────────┐           ┌──────────┐              ┌──────────┐
│ 提交周报   │    →     │ ☐ 提交周报  │     →      │ ☑ 提交周报  │
│ 高优先级   │          │ 🔴 高     │             │ (已完成)    │
│ 截止7/1   │          │ 📅 7/1    │             └──────────┘
└──────────┘           │ ☐ 整理文档  │
                       │ 🟢 低     │              ┌──────────┐
                       └──────────┘              │ 🗑️ 已删除  │
                                                 └──────────┘
```

- 完成：通过标题模糊匹配（如"完成周报" → 匹配"提交周报"），不要求完整标题
- 删除：同样支持模糊匹配
- 日常用语"完成了""删除了"不会被误判为待办操作

## 提交物检查

- [x] 完整代码（GitHub 仓库）
- [x] README（本文件，含启动方式、环境变量说明、Mock 模式说明、工具调用说明）
- [x] 不含真实 API Key 或敏感信息
- [ ] 录屏视频链接
