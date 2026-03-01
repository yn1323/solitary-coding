import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import { api, type TaskDocuments } from '../../lib/api';

interface Props {
  taskId: number;
}

type DocTab = 'discussion' | 'plan' | 'result';

export function TaskDocumentViewer({ taskId }: Props) {
  const [docs, setDocs] = useState<TaskDocuments | null>(null);
  const [activeTab, setActiveTab] = useState<DocTab>('discussion');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.tasks
      .documents(taskId)
      .then(setDocs)
      .catch(() => setDocs(null))
      .finally(() => setLoading(false));
  }, [taskId]);

  const tabs: { key: DocTab; label: string }[] = [
    { key: 'discussion', label: 'Discussion' },
    { key: 'plan', label: 'Plan' },
    { key: 'result', label: 'Result' },
  ];

  const content = docs?.[activeTab];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-1">
        <span className="text-sm font-semibold text-gray-900 mr-4">
          Task #{String(taskId).padStart(3, '0')} Documents
        </span>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-900 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="px-6 py-4 min-h-[200px]">
        {loading ? (
          <p className="text-gray-500 text-sm">Loading...</p>
        ) : !content ? (
          <p className="text-gray-400 text-sm italic">
            No {activeTab} document yet.
          </p>
        ) : (
          <div className="prose prose-sm max-w-none">
            <Markdown>{content}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
