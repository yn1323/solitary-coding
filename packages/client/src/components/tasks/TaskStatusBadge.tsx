import type { TaskStatus } from '../../lib/api';

const STATUS_STYLES: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-700',
  prioritizing: 'bg-blue-100 text-blue-700',
  discussing: 'bg-purple-100 text-purple-700',
  planned: 'bg-indigo-100 text-indigo-700',
  executing: 'bg-yellow-100 text-yellow-700',
  testing: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  stopped: 'bg-red-200 text-red-800',
};

interface Props {
  status: TaskStatus;
}

export function TaskStatusBadge({ status }: Props) {
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700';

  return (
    <span
      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}
