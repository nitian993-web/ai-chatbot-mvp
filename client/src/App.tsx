import { useState, useCallback } from 'react';
import { ChatContainer } from './components/ChatContainer';
import { TabBar } from './components/TabBar';

interface TabInfo {
  id: string;
  name: string;
}

/** 从已有标签中找出最小可用的编号 */
function findLowestAvailable(tabs: TabInfo[]): number {
  const used = new Set(tabs.map((t) => parseInt(t.name.match(/\d+/)?.[0] || '0')));
  let num = 1;
  while (used.has(num)) num++;
  return num;
}

function App() {
  const [tabs, setTabs] = useState<TabInfo[]>([
    { id: 'tab-1', name: '对话 1' },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  // 新建标签：回收最小可用编号
  const handleNewTab = useCallback(() => {
    setTabs((prev) => {
      const num = findLowestAvailable(prev);
      const newTab: TabInfo = { id: `tab-${num}`, name: `对话 ${num}` };
      setActiveTabId(newTab.id);
      return [...prev, newTab];
    });
  }, []);

  // 关闭标签
  const handleCloseTab = useCallback(
    (id: string) => {
      setTabs((prev) => prev.filter((t) => t.id !== id));
      // 如果关闭的是当前活跃标签，切换到相邻标签
      setActiveTabId((prevActive) => {
        if (prevActive !== id) return prevActive;
        const remaining = tabs.filter((t) => t.id !== id);
        if (remaining.length === 0) return 'tab-1';
        // 切换到关闭标签后面的那个（如果存在），否则前一个
        const closedIdx = tabs.findIndex((t) => t.id === id);
        const nextIdx = Math.min(closedIdx, remaining.length - 1);
        return remaining[nextIdx].id;
      });
    },
    [tabs]
  );

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b px-6 py-2 shadow-sm flex-shrink-0">
        <h1 className="text-lg font-semibold">AI Chatbot MVP</h1>
        <p className="text-xs text-gray-500">内部员工助手 · Mock 模式</p>
      </header>

      {/* 标签栏 */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelect={setActiveTabId}
        onClose={handleCloseTab}
        onNew={handleNewTab}
      />

      {/* 对话区域：每个标签渲染一个 ChatContainer，仅活跃标签可见 */}
      <main className="flex-1 overflow-hidden">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="h-full"
            style={{ display: tab.id === activeTabId ? undefined : 'none' }}
          >
            <ChatContainer />
          </div>
        ))}
      </main>
    </div>
  );
}

export default App;
