import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ModuleHeader } from '../components/layout/ModuleHeader';
import { ConversionQueueList } from '../components/conversion/ConversionQueueList';
import { GameReplayPanel } from '../components/review/GameReplayPanel';
import { QueueFilters } from '../components/review/QueueFilters';
import { ReviewQuizPanel } from '../components/review/ReviewQuizPanel';
import { useConversionQuiz } from '../hooks/useConversionQuiz';
import { useQueueFilters } from '../hooks/useQueueFilters';
import { deleteConversion, listAllConversions } from '../storage/conversionRepo';

type Tab = 'queue' | 'quiz';

function parseTab(value: string | null): Tab {
  if (value === 'quiz' || value === 'queue') {
    return value;
  }
  return 'queue';
}

export default function ConversionRoute() {
  const [searchParams, setSearchParams] = useSearchParams();
  const quizId = searchParams.get('id') ?? undefined;
  const tab = parseTab(searchParams.get('tab'));
  const [allConversions, setAllConversions] = useState<
    Awaited<ReturnType<typeof listAllConversions>>
  >([]);
  const [isQueueLoading, setIsQueueLoading] = useState(false);

  const {
    queue,
    current,
    feedback,
    isCorrect,
    isLoading,
    refreshQueue,
    selectConversion,
    submitMove,
    markMastered,
  } = useConversionQuiz(quizId);

  const loadAll = useCallback(async () => {
    setIsQueueLoading(true);
    try {
      const items = await listAllConversions();
      items.sort(
        (a, b) =>
          new Date(b.source.playedAt).getTime() -
          new Date(a.source.playedAt).getTime(),
      );
      setAllConversions(items);
    } finally {
      setIsQueueLoading(false);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversion(id);
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
  } = useQueueFilters(allConversions);

  const displayConversions = useMemo(() => {
    if (isQueueLoading) {
      return [];
    }
    if (allConversions.length > 0) {
      return filteredItems;
    }
    return queue;
  }, [allConversions, filteredItems, isQueueLoading, queue]);

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
        title="Conversion Review"
        description="Fix winning positions you failed to convert."
      />

      <p className="text-sm text-slate-400">
        Run <Link to="/leaks" className="text-indigo-400 hover:text-indigo-300">Scan games</Link>{' '}
        from Leaks or the Dashboard — one scan fills both blunders and conversions.
      </p>

      <div className="flex gap-2 border-b border-slate-800 pb-2">
        {(['queue', 'quiz'] as const).map((t) => (
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

      {tab === 'queue' && (
        <section className="space-y-4">
          <h2 className="text-lg font-medium text-white">Conversion queue</h2>
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
            <ConversionQueueList
              items={displayConversions}
              selectedId={current?.id}
              onSelect={(id) => {
                void selectConversion(id);
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
              No conversion misses to quiz — run a shared scan first.
            </p>
          )}
          {current && (
            <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
              <ConversionQueueList
                items={queue}
                selectedId={current.id}
                onSelect={(id) => void selectConversion(id)}
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
                          Peak: +{current.analysis.peakEvalCp} cp · Drop:{' '}
                          {current.analysis.dropFromPeakCp} cp · At moment:{' '}
                          {current.analysis.evalAtMomentCp} cp
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Played: {current.position.playedMove.san} · Result:{' '}
                          {current.source.result} ·{' '}
                          {new Date(current.source.playedAt).toLocaleDateString()}
                        </p>
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
