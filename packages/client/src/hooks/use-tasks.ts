import { useState, useEffect, useCallback } from 'react';
import { api, type Task } from '../lib/api';

export function useTasks(pollIntervalMs = 5000) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.tasks.list();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(refresh, pollIntervalMs);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        refresh();
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh, pollIntervalMs]);

  return { tasks, loading, refresh };
}
