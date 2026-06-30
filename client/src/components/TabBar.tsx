interface TabInfo {
  id: string;
  name: string;
}

interface Props {
  tabs: TabInfo[];
  activeTabId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

export function TabBar({ tabs, activeTabId, onSelect, onClose, onNew }: Props) {
  return (
    <div className="flex-shrink-0 flex items-center border-b bg-white overflow-x-auto">
      {/* 标签列表 */}
      <div className="flex flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={`group flex items-center gap-1.5 px-3 py-2 text-xs border-r border-gray-100 transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-white text-blue-600 border-b-2 border-b-blue-600 -mb-px font-medium'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span className="max-w-[100px] truncate">{tab.name}</span>
              {/* 关闭按钮（至少保留一个标签） */}
              {tabs.length > 1 && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose(tab.id);
                  }}
                  className={`ml-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[10px] leading-none transition-opacity ${
                    isActive
                      ? 'opacity-60 hover:opacity-100 hover:bg-gray-200'
                      : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-gray-300'
                  }`}
                  title="关闭标签"
                >
                  ×
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 新建标签按钮 */}
      <button
        onClick={onNew}
        className="flex-shrink-0 px-3 py-2 text-xs text-blue-600 hover:bg-blue-50 transition-colors border-l border-gray-100"
      >
        + 新对话
      </button>
    </div>
  );
}
