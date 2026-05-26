import { useCallback, useEffect, useState } from 'react';
import { loadDashboardStats, type DashboardStats } from '../storage/dashboardStats';

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await loadDashboardStats();
      setStats(next);
    } catch (err) {
      console.warn('Failed to load dashboard stats:', err);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stats, isLoading, refresh };
}
