import { useCallback, useEffect, useRef, useState } from 'react';
import { DEBOUNCE_WRITE_MS } from '../constants/persistence';

export function usePersistentStore<T>(
  key: string,
  load: () => Promise<T | undefined>,
  save: (value: T) => Promise<void>,
  initial: T,
): {
  value: T;
  setValue: (v: T | ((prev: T) => T)) => void;
  flush: () => Promise<void>;
  isLoading: boolean;
} {
  const [value, setValueState] = useState<T>(initial);
  const [isLoading, setIsLoading] = useState(true);

  const valueRef = useRef(value);
  const isLoadingRef = useRef(isLoading);

  const savesAfterMountRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadGenerationRef = useRef(0);

  const persist = useCallback(
    async (next: T) => {
      await save(next);
    },
    [save],
  );

  const flush = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    await persist(valueRef.current);
  }, [persist]);

  const schedulePersist = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void persist(valueRef.current);
    }, DEBOUNCE_WRITE_MS);
  }, [persist]);

  const setValue = useCallback(
    (v: T | ((prev: T) => T)) => {
      savesAfterMountRef.current += 1;
      setValueState((prev) => {
        const next = typeof v === 'function' ? (v as (prev: T) => T)(prev) : v;
        valueRef.current = next;
        return next;
      });
      if (!isLoadingRef.current) {
        schedulePersist();
      }
    },
    [schedulePersist],
  );

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    const generation = ++loadGenerationRef.current;
    savesAfterMountRef.current = 0;
    let cancelled = false;

    async function hydrate() {
      try {
        const loaded = await load();
        if (cancelled || generation !== loadGenerationRef.current) {
          return;
        }
        if (savesAfterMountRef.current === 0 && loaded !== undefined) {
          valueRef.current = loaded;
          setValueState(loaded);
        }
      } finally {
        if (!cancelled && generation === loadGenerationRef.current) {
          setIsLoading(false);
          if (savesAfterMountRef.current > 0) {
            schedulePersist();
          }
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [key, load, schedulePersist]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { value, setValue, flush, isLoading };
}
