import { useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  collectQueueTags,
  filterQueueByParams,
  type QueueStatusFilter,
} from '../components/review/QueueFilters';

const VALID_STATUS_FILTERS: QueueStatusFilter[] = ['all', 'open', 'mastered'];

function parseStatusFilter(raw: string | null): QueueStatusFilter {
  if (raw === 'open' || raw === 'mastered') {
    return raw;
  }
  return 'all';
}

export function useQueueFilters<T extends { userState: { status: string }; tags: string[] }>(
  items: T[],
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus = searchParams.get('status');
  const status = parseStatusFilter(rawStatus);
  const tag = searchParams.get('tag') ?? '';

  useEffect(() => {
    if (rawStatus && !VALID_STATUS_FILTERS.includes(rawStatus as QueueStatusFilter)) {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.delete('status');
          return params;
        },
        { replace: true },
      );
    }
  }, [rawStatus, setSearchParams]);

  const availableTags = useMemo(() => collectQueueTags(items), [items]);

  const filteredItems = useMemo(
    () => filterQueueByParams(items, status, tag),
    [items, status, tag],
  );

  const setStatus = useCallback(
    (next: QueueStatusFilter) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'all') {
          params.delete('status');
        } else {
          params.set('status', next);
        }
        return params;
      });
    },
    [setSearchParams],
  );

  const setTag = useCallback(
    (next: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (!next) {
          params.delete('tag');
        } else {
          params.set('tag', next);
        }
        return params;
      });
    },
    [setSearchParams],
  );

  return {
    status,
    tag,
    availableTags,
    filteredItems,
    setStatus,
    setTag,
  };
}
