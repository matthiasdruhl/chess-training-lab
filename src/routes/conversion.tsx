import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModuleHeader } from '../components/layout/ModuleHeader';
import { ConversionQueueList } from '../components/conversion/ConversionQueueList';
import { GameReplayPanel } from '../components/review/GameReplayPanel';
import { ReviewQuizPanel } from '../components/review/ReviewQuizPanel';
import { useConversionQuiz } from '../hooks/useConversionQuiz';
import { deleteConversion, listAllConversions } from '../storage/conversionRepo';
import { Link } from 'react-router-dom';

type Tab = 'queue' | 'quiz';

export default function ConversionRoute() {
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('id') ?? undefined;
  const [tab, setTab] = useState<Tab>('queue');
  const [allConversions, setAllConversions] = useState<
    Awaited<ReturnType<typeof listAllConversions>>
  >([]);

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
    const items = await listAllConversions();
    items.sort(
      (a, b) =>
        new Date(b.source.playedAt).getTime() -
        new Date(a.source.playedAt).getTime(),
    );
    setAllConversions(items);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversion(id);
      await loadAll();
      await refreshQueue();
    },
    [loadAll, refreshQueue],
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
            onClick={() => {
              setTab(t);
              if (t === 'queue') {
                void loadAll();
              }
            }}
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
          <ConversionQueueList
            items={allConversions.length > 0 ? allConversions : queue}
            selectedId={current?.id}
            onSelect={(id) => {
              void selectConversion(id);
              setTab('quiz');
            }}
            onDelete={(id) => void handleDelete(id)}
          />
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
