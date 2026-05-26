import { useMemo } from 'react';

export type QueueStatusFilter = 'all' | 'open' | 'mastered';

interface QueueFiltersProps {
  status: QueueStatusFilter;
  tag: string;
  availableTags: string[];
  onStatusChange: (status: QueueStatusFilter) => void;
  onTagChange: (tag: string) => void;
}

export function QueueFilters({
  status,
  tag,
  availableTags,
  onStatusChange,
  onTagChange,
}: QueueFiltersProps) {
  const sortedTags = useMemo(
    () => [...availableTags].sort((left, right) => left.localeCompare(right)),
    [availableTags],
  );

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="queue-status-filter" className="mb-1 block text-xs text-slate-400">
          Status
        </label>
        <select
          id="queue-status-filter"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as QueueStatusFilter)}
          className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="mastered">Mastered</option>
        </select>
      </div>
      <div>
        <label htmlFor="queue-tag-filter" className="mb-1 block text-xs text-slate-400">
          Tag / theme
        </label>
        <select
          id="queue-tag-filter"
          value={tag}
          onChange={(event) => onTagChange(event.target.value)}
          className="min-w-[10rem] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">All tags</option>
          {sortedTags.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function filterQueueByParams<
  T extends { userState: { status: string }; tags: string[] },
>(items: T[], status: QueueStatusFilter, tag: string): T[] {
  return items.filter((item) => {
    if (status === 'open' && item.userState.status === 'mastered') {
      return false;
    }
    if (status === 'mastered' && item.userState.status !== 'mastered') {
      return false;
    }
    if (tag && !item.tags.includes(tag)) {
      return false;
    }
    return true;
  });
}

export function collectQueueTags<T extends { tags: string[] }>(items: T[]): string[] {
  const tags = new Set<string>();
  for (const item of items) {
    for (const entry of item.tags) {
      tags.add(entry);
    }
  }
  return [...tags];
}
