import type { SystemStatus as SystemStatusType } from '../../lib/api';

const PHASES = [
  { key: 'prioritizing', label: 'Prioritize' },
  { key: 'discussing', label: 'Discuss' },
  { key: 'planning', label: 'Plan' },
  { key: 'executing', label: 'Execute' },
  { key: 'testing', label: 'Test' },
  { key: 'merging', label: 'Merge' },
];

interface Props {
  status: SystemStatusType | null;
}

export function SystemStatus({ status }: Props) {
  if (!status) return null;

  const currentPhaseIndex = status.currentPhase
    ? PHASES.findIndex((p) => p.key === status.currentPhase)
    : -1;

  return (
    <div className="bg-white rounded-lg border border-gray-200 px-6 py-4 space-y-3">
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

      {status.isRunning && status.currentPhase && (
        <div className="flex items-center gap-1">
          {PHASES.map((phase, index) => {
            const isCompleted = index < currentPhaseIndex;
            const isCurrent = index === currentPhaseIndex;

            return (
              <div key={phase.key} className="flex items-center">
                {index > 0 && (
                  <div
                    className={`w-6 h-0.5 ${
                      isCompleted ? 'bg-green-400' : 'bg-gray-200'
                    }`}
                  />
                )}
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    isCurrent
                      ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                      : isCompleted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {phase.label}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
