import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModuleHeader } from '../components/layout/ModuleHeader';
import { BlunderQueueList } from '../components/leaks/BlunderQueueList';
import { GameReplayPanel } from '../components/review/GameReplayPanel';
import { QueueFilters } from '../components/review/QueueFilters';
import { ReviewQuizPanel } from '../components/review/ReviewQuizPanel';
import { ScanPanel } from '../components/review/ScanPanel';
import { useBlunderQuiz } from '../hooks/useBlunderQuiz';
import { useQueueFilters } from '../hooks/useQueueFilters';
import { deleteBlunder, listAllBlunders } from '../storage/blundersRepo';

type Tab = 'scan' | 'queue' | 'quiz';

function parseTab(value: string | null): Tab {
  if (value === 'scan' || value === 'quiz' || value === 'queue') {
    return value;
  }
  return 'queue';
}

export default function LeaksRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const quizId = searchParams.get('id') ?? undefined;
  const tab = parseTab(searchParams.get('tab'));
  const [allBlunders, setAllBlunders] = useState<Awaited<ReturnType<typeof listAllBlunders>>>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);

  const {
    queue,
    current,
    feedback,
    isCorrect,
    isLoading,
    refreshQueue,
    selectBlunder,
    submitMove,
    markMastered,
  } = useBlunderQuiz(quizId);

  const loadAll = useCallback(async () => {
    setIsQueueLoading(true);
    try {
      const items = await listAllBlunders();
      items.sort(
        (a, b) =>
          new Date(b.source.playedAt).getTime() -
          new Date(a.source.playedAt).getTime(),
      );
      setAllBlunders(items);
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteBlunder(id);
      await loadAll();
      await refreshQueue();
    },
    [loadAll, refreshQueue],
  );

  const {
    status: queueStatus,
    tag: queueTag,
    availableTags,
    filteredItems,
    setStatus: setQueueStatus,
    setTag: setQueueTag,
  } = useQueueFilters(allBlunders);

  const displayBlunders = useMemo(() => {
    if (isQueueLoading) {
      return [];
    }
    if (allBlunders.length > 0) {
      return filteredItems;
    }
    return queue;
  }, [allBlunders, filteredItems, isQueueLoading, queue]);

  const handleTabChange = useCallback(
    (next: Tab) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'queue') {
          params.delete('tab');
        } else {
          params.set('tab', next);
        }
        return params;
      });
      if (next === 'queue') {
        void loadAll();
      }
    },
    [loadAll, setSearchParams],
  );

  useEffect(() => {
    if (tab === 'queue') {
      void loadAll();
    }
  }, [tab, loadAll]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Leak Detector"
        description="Turn Chess.com mistakes into repeatable puzzles."
      />

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {(['scan', 'queue', 'quiz'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => handleTabChange(t)}
            className={`rounded-md px-3 py-1.5 text-sm capitalize ${
              tab === t
                ? 'bg-slate-100 text-slate-900'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'scan' && <ScanPanel />}

      {tab === 'queue' && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-white">Blunder queue</h2>
          <QueueFilters
            status={queueStatus}
            tag={queueTag}
            availableTags={availableTags}
            onStatusChange={setQueueStatus}
            onTagChange={setQueueTag}
          />
          {isQueueLoading ? (
            <p className="text-sm text-slate-400">Loading queue…</p>
          ) : (
            <BlunderQueueList
              items={displayBlunders}
              selectedId={current?.id}
              onSelect={(id) => {
                void selectBlunder(id);
                handleTabChange('quiz');
              }}
              onDelete={(id) => void handleDelete(id)}
            />
          )}
        </section>
      )}

      {tab === 'quiz' && (
        <section>
          {isLoading && <p className="text-slate-400">Loading quiz…</p>}
          {!isLoading && !current && (
            <p className="text-slate-400">
              No blunders to quiz — run a scan first or lower the swing threshold in
              Settings.
            </p>
          )}
          {current && (
            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
              <BlunderQueueList
                items={queue}
                selectedId={current.id}
                onSelect={(id) => void selectBlunder(id)}
              />
              <div>
                <ReviewQuizPanel
                  fen={current.position.fen}
                  sideToMove={current.position.sideToMove}
                  prompt={current.quiz.prompt}
                  onSubmitMove={submitMove}
                  onMarkMastered={() => void markMastered()}
                  isCorrect={isCorrect}
                  feedback={feedback}
                  showBestLine
                  bestMoveSan={current.analysis.bestMove.san}
                  contextExtra={
                    <>
                      <GameReplayPanel
                        movesSan={current.position.pvContextSan}
                        targetPly={current.position.ply}
                      />
                      <div className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-300">
                        <p>
                          Swing: {current.analysis.swingCp} cp (
                          {current.analysis.classification})
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Played: {current.position.playedMove.san} ·{' '}
                          {new Date(current.source.playedAt).toLocaleDateString()} ·{' '}
                          {current.source.userColor}
                        </p>
                        {current.source.gameUrl && (
                          <a
                            href={current.source.gameUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-xs text-indigo-400 hover:text-indigo-300"
                          >
                            View game on Chess.com
                          </a>
                        )}
                      </div>
                    </>
                  }
                />
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
