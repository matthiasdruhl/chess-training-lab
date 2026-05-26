import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DASHBOARD_CONVERSION_QUIZ_CARDS,
  DASHBOARD_ENDGAME,
  DASHBOARD_LEAK_QUIZ_CARDS,
  DASHBOARD_MIDDLEGAME,
  DASHBOARD_OUT_OF_BOOK,
  DASHBOARD_REPERTOIRE_LINES,
  DASHBOARD_BRIDGE,
  DASHBOARD_TACTICS_PUZZLES,
} from '../constants/training';
import { resolveTodaySessionTargets } from '../services/dashboard/todaySessionTargets';
import type { TodaySessionState, TodaySessionStepId } from '../types/todaySession';
import type { AppSettings } from '../types/settings';

export const DEFAULT_TODAY_SESSION_ORDER: TodaySessionStepId[] = [
  'repertoire',
  'out-of-book',
  'bridge',
  'middlegame',
  'tactics',
  'leaks',
  'conversion',
  'endgame',
];

export interface TodaySessionStep {
  id: TodaySessionStepId;
  label: string;
  detail: string;
  href: string;
  done: boolean;
}

function localDateKey(): string {
  return new Date().toLocaleDateString('en-CA');
}

function buildHref(
  stepId: TodaySessionStepId,
  targets: TodaySessionState['targets'],
): string {
  switch (stepId) {
    case 'repertoire': {
      if (targets?.repertoireNodeId) {
        return `/repertoire?node=${encodeURIComponent(targets.repertoireNodeId)}`;
      }
      return '/repertoire';
    }
    case 'out-of-book': {
      const params = new URLSearchParams();
      if (targets?.deviationId) {
        params.set('deviation', targets.deviationId);
      }
      if (targets?.parentNodeId) {
        params.set('parent', targets.parentNodeId);
      }
      const query = params.toString();
      return query ? `/out-of-book?${query}` : '/out-of-book';
    }
    case 'bridge': {
      const params = new URLSearchParams();
      if (targets?.handoffId) {
        params.set('handoff', targets.handoffId);
      }
      if (targets?.repertoireNodeId) {
        params.set('node', targets.repertoireNodeId);
      }
      const query = params.toString();
      return query ? `/bridge?${query}` : '/bridge';
    }
    case 'middlegame':
      return targets?.middlegamePresetId
        ? `/middlegame?preset=${encodeURIComponent(targets.middlegamePresetId)}`
        : '/middlegame';
    case 'tactics':
      return targets?.tacticsPackId
        ? `/tactics?pack=${encodeURIComponent(targets.tacticsPackId)}`
        : '/tactics';
    case 'leaks':
      return '/leaks?tab=quiz';
    case 'conversion':
      return '/conversion?tab=quiz';
    case 'endgame':
      return targets?.endgamePresetId
        ? `/endgame?preset=${encodeURIComponent(targets.endgamePresetId)}`
        : '/endgame';
    default:
      return '/';
  }
}

function stepLabel(stepId: TodaySessionStepId): { label: string; detail: string } {
  switch (stepId) {
    case 'repertoire':
      return {
        label: 'Repertoire',
        detail: `${DASHBOARD_REPERTOIRE_LINES} due line`,
      };
    case 'out-of-book':
      return {
        label: 'Out-of-book',
        detail: `${DASHBOARD_OUT_OF_BOOK} deviation`,
      };
    case 'bridge':
      return {
        label: 'Bridge',
        detail: `${DASHBOARD_BRIDGE} handoff`,
      };
    case 'middlegame':
      return {
        label: 'Middlegame',
        detail: `${DASHBOARD_MIDDLEGAME} preset`,
      };
    case 'tactics':
      return {
        label: 'Tactics',
        detail: `${DASHBOARD_TACTICS_PUZZLES} puzzles from one pack`,
      };
    case 'leaks':
      return {
        label: 'Leak quiz',
        detail: `${DASHBOARD_LEAK_QUIZ_CARDS} cards`,
      };
    case 'conversion':
      return {
        label: 'Conversion quiz',
        detail: `${DASHBOARD_CONVERSION_QUIZ_CARDS} cards`,
      };
    case 'endgame':
      return {
        label: 'Endgame drill',
        detail: `${DASHBOARD_ENDGAME} preset`,
      };
    default:
      return { label: stepId, detail: '' };
  }
}

interface UseTodaySessionOptions {
  settings: AppSettings;
  onPersist: (session: TodaySessionState) => Promise<void>;
}

export function useTodaySession({ settings, onPersist }: UseTodaySessionOptions) {
  const today = localDateKey();
  const [targets, setTargets] = useState<TodaySessionState['targets']>();
  const [completedStepIds, setCompletedStepIds] = useState<TodaySessionStepId[]>([]);
  const [order, setOrder] = useState<TodaySessionStepId[]>(DEFAULT_TODAY_SESSION_ORDER);
  const [isResolvingTargets, setIsResolvingTargets] = useState(true);

  useEffect(() => {
    const stored = settings.todaySession;
    if (stored?.date === today) {
      setCompletedStepIds(stored.completedStepIds ?? []);
      setOrder(stored.order ?? DEFAULT_TODAY_SESSION_ORDER);
      setTargets(stored.targets);
      setIsResolvingTargets(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsResolvingTargets(true);
      const resolvedTargets = await resolveTodaySessionTargets();
      if (cancelled) {
        return;
      }
      setTargets(resolvedTargets);
      setCompletedStepIds([]);
      setOrder(DEFAULT_TODAY_SESSION_ORDER);
      setIsResolvingTargets(false);
      await onPersist({
        date: today,
        completedStepIds: [],
        order: DEFAULT_TODAY_SESSION_ORDER,
        targets: resolvedTargets,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [settings.todaySession, today, onPersist]);

  const persistSession = useCallback(
    async (nextCompleted: TodaySessionStepId[]) => {
      const payload: TodaySessionState = {
        date: today,
        completedStepIds: nextCompleted,
        order,
        targets,
      };
      await onPersist(payload);
    },
    [onPersist, order, targets, today],
  );

  const toggleStep = useCallback(
    (stepId: TodaySessionStepId) => {
      setCompletedStepIds((prev) => {
        const next = prev.includes(stepId)
          ? prev.filter((id) => id !== stepId)
          : [...prev, stepId];
        void persistSession(next);
        return next;
      });
    },
    [persistSession],
  );

  const resetForToday = useCallback(() => {
    setCompletedStepIds([]);
    void persistSession([]);
  }, [persistSession]);

  const steps = useMemo((): TodaySessionStep[] => {
    return order.map((stepId) => {
      const copy = stepLabel(stepId);
      return {
        id: stepId,
        label: copy.label,
        detail: copy.detail,
        href: buildHref(stepId, targets),
        done: completedStepIds.includes(stepId),
      };
    });
  }, [order, targets, completedStepIds]);

  const completedCount = completedStepIds.length;

  return {
    steps,
    completedCount,
    totalCount: order.length,
    isResolvingTargets,
    toggleStep,
    resetForToday,
  };
}
