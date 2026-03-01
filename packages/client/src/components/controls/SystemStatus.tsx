import type { SystemStatus as SystemStatusType } from '../../lib/api';

interface Props {
  status: SystemStatusType | null;
}

export function SystemStatus({ status }: Props) {
  if (!status) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-6 py-4">
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Status:</span>
          <span
            className={`inline-flex items-center gap-1.5 font-medium ${
              status.isPaused
                ? 'text-yellow-600'
                : status.isRunning
                  ? 'text-blue-600'
                  : 'text-green-600'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                status.isPaused
                  ? 'bg-yellow-500'
                  : status.isRunning
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-green-500'
              }`}
            />
            {status.isPaused
              ? 'Paused'
              : status.isRunning
                ? 'Running'
                : 'Idle'}
          </span>
        </div>
        {status.currentTaskId && (
          <div>
            <span className="text-gray-500">Current Task:</span>{' '}
            <span className="font-medium">
              #{String(status.currentTaskId).padStart(3, '0')}
            </span>
          </div>
        )}
        <div>
          <span className="text-gray-500">Timer:</span>{' '}
          <span className="font-medium">
            {status.timerActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
    </div>
  );
}
