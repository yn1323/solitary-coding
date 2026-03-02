import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import {
  api,
  type TaskDocuments,
  type ExecutionLogSummary,
  type ExecutionLog,
} from '../../lib/api';

interface Props {
  taskId: number;
  errorMessage?: string | null;
}

type DocTab = 'discussion' | 'plan' | 'result' | 'logs';

export function TaskDocumentViewer({ taskId, errorMessage }: Props) {
  const [docs, setDocs] = useState<TaskDocuments | null>(null);
  const [logs, setLogs] = useState<ExecutionLogSummary[]>([]);
  const [logDetails, setLogDetails] = useState<Record<number, ExecutionLog>>(
    {},
  );
  const [activeTab, setActiveTab] = useState<DocTab>('discussion');
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    api.tasks
      .documents(taskId)
      .then(setDocs)
      .catch(() => setDocs(null))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    if (activeTab === 'logs') {
      api.logs.byTask(taskId).then(setLogs).catch(() => setLogs([]));
    }
  }, [taskId, activeTab]);

  const toggleLogExpanded = async (log: ExecutionLogSummary) => {
    const isExpanding = !expandedLogs.has(log.id);

    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(log.id)) {
        next.delete(log.id);
      } else {
        next.add(log.id);
      }
      return next;
    });

    // Fetch detail on first expand
    if (isExpanding && !logDetails[log.id]) {
      try {
        const detail = await api.logs.detail(log.taskId, log.id);
        setLogDetails((prev) => ({ ...prev, [log.id]: detail }));
      } catch {
        // ignore fetch error
      }
    }
  };

  const tabs: { key: DocTab; label: string }[] = [
    { key: 'discussion', label: 'Discussion' },
    { key: 'plan', label: 'Plan' },
    { key: 'result', label: 'Result' },
    { key: 'logs', label: 'Logs' },
  ];

  const renderContent = () => {
    if (loading) {
      return <p className="text-gray-500 text-sm">Loading...</p>;
    }

    if (activeTab === 'logs') {
      if (logs.length === 0) {
        return (
          <p className="text-gray-400 text-sm italic">
            No execution logs yet.
          </p>
        );
      }
      return (
        <div className="space-y-3">
          {logs.map((log) => {
            const detail = logDetails[log.id];
            const isExpanded = expandedLogs.has(log.id);

            return (
              <div key={log.id} className="border border-gray-200 rounded-md">
                <button
                  onClick={() => toggleLogExpanded(log)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {log.phase}
                    </span>
                    {log.exitCode !== null && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          log.exitCode === 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        exit: {log.exitCode}
                      </span>
                    )}
                    {log.durationMs !== null && (
                      <span className="text-xs text-gray-500">
                        {(log.durationMs / 1000).toFixed(1)}s
                      </span>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm">
                    {isExpanded ? '\u25B2' : '\u25BC'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-gray-100">
                    {!detail ? (
                      <p className="text-xs text-gray-400 mt-2">Loading...</p>
                    ) : (
                      <>
                        {detail.input && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              Input:
                            </p>
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                              {detail.input}
                            </pre>
                          </div>
                        )}
                        {detail.output && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-500 mb-1">
                              Output:
                            </p>
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                              {detail.output}
                            </pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    const content = docs?.[activeTab as 'discussion' | 'plan' | 'result'];

    return (
      <>
        {errorMessage && activeTab === 'result' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
          </div>
        )}
        {!content ? (
          <p className="text-gray-400 text-sm italic">
            No {activeTab} document yet.
          </p>
        ) : (
          <div className="prose prose-sm max-w-none">
            <Markdown>{content}</Markdown>
          </div>
        )}
      </>
    );
  };

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
      <div className="px-6 py-4 min-h-[200px]">{renderContent()}</div>
    </div>
  );
}
