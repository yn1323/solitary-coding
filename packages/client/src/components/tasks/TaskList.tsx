import type { Task } from '../../lib/api';
import { TaskStatusBadge } from './TaskStatusBadge';

interface Props {
  tasks: Task[];
  selectedTaskId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (task: Task) => void;
}

export function TaskList({
  tasks,
  selectedTaskId,
  onSelect,
  onDelete,
  onEdit,
}: Props) {
  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No tasks yet. Click "+ Add Task" to create one.
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="text-left text-sm text-gray-500 border-b border-gray-100">
          <th className="px-6 py-3 font-medium">#</th>
          <th className="px-6 py-3 font-medium">Type</th>
          <th className="px-6 py-3 font-medium">Title</th>
          <th className="px-6 py-3 font-medium">Status</th>
          <th className="px-6 py-3 font-medium">Retries</th>
          <th className="px-6 py-3 font-medium w-28"></th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <tr
            key={task.id}
            onClick={() => onSelect(task.id)}
            className={`border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
              selectedTaskId === task.id ? 'bg-blue-50' : ''
            }`}
          >
            <td className="px-6 py-3 text-sm font-mono text-gray-500">
              {String(task.id).padStart(3, '0')}
            </td>
            <td className="px-6 py-3">
              <span
                className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  task.type === 'bug'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {task.type}
              </span>
            </td>
            <td className="px-6 py-3 text-sm text-gray-900">{task.title}</td>
            <td className="px-6 py-3">
              <TaskStatusBadge status={task.status} />
            </td>
            <td className="px-6 py-3 text-sm text-gray-500">
              {task.retryCount > 0 ? task.retryCount : '-'}
            </td>
            <td className="px-6 py-3">
              {task.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(task);
                    }}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                    }}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
