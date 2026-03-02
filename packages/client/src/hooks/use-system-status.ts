import { useState, useEffect, useCallback } from 'react';
import { api, type SystemStatus } from '../lib/api';

export function useSystemStatus(pollIntervalMs = 5000) {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.system.status();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch system status:', err);
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

  return { status, refresh };
}
