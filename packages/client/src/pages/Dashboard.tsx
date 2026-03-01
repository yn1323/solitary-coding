import { useState } from 'react';
import { useTasks } from '../hooks/use-tasks';
import { useSystemStatus } from '../hooks/use-system-status';
import { TaskList } from '../components/tasks/TaskList';
import { TaskCreateDialog } from '../components/tasks/TaskCreateDialog';
import { TaskDocumentViewer } from '../components/tasks/TaskDocumentViewer';
import { SystemStatus } from '../components/controls/SystemStatus';
import { api } from '../lib/api';

export function Dashboard() {
  const { tasks, loading, refresh } = useTasks();
  const { status, refresh: refreshStatus } = useSystemStatus();
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleTrigger = async () => {
    try {
      await api.system.trigger();
      await refresh();
      await refreshStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Trigger failed');
    }
  };

  const handlePause = async () => {
    try {
      await api.system.pause();
      await refreshStatus();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Pause toggle failed');
    }
  };

  const handleTaskCreated = async () => {
    setShowCreateDialog(false);
    await refresh();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.tasks.delete(id);
      if (selectedTaskId === id) setSelectedTaskId(null);
      await refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">
            Solitary Coding
          </h1>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePause}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                status?.isPaused
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-yellow-500 text-white hover:bg-yellow-600'
              }`}
            >
              {status?.isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={handleTrigger}
              disabled={status?.isRunning}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status?.isRunning ? 'Running...' : 'Trigger'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* System Status */}
        <SystemStatus status={status} />

        {/* Task List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-gray-800"
            >
              + Add Task
            </button>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-500">Loading...</div>
          ) : (
            <TaskList
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelect={setSelectedTaskId}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Document Viewer */}
        {selectedTaskId && (
          <TaskDocumentViewer taskId={selectedTaskId} />
        )}
      </main>

      {/* Create Dialog */}
      {showCreateDialog && (
        <TaskCreateDialog
          onCreated={handleTaskCreated}
          onCancel={() => setShowCreateDialog(false)}
        />
      )}
    </div>
  );
}
