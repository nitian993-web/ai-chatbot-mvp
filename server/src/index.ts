import express from 'express';
import cors from 'cors';
import { chatRouter } from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 路由
app.use('/api', chatRouter);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`[Server] AI Chatbot MVP 后端已启动: http://localhost:${PORT}`);
  console.log(`[Server] Mock 模式: ${process.env.OPENAI_API_KEY ? '关闭 (使用真实 LLM)' : '启用 (无 API Key)'}`);
});
