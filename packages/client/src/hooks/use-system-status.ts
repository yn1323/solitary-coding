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
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  return { status, refresh };
}
