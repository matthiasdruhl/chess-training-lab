import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ModuleHeader } from '../components/layout/ModuleHeader';
import { BlunderQueueList } from '../components/leaks/BlunderQueueList';
import { GameReplayPanel } from '../components/review/GameReplayPanel';
import { ReviewQuizPanel } from '../components/review/ReviewQuizPanel';
import { ScanPanel } from '../components/review/ScanPanel';
import { useBlunderQuiz } from '../hooks/useBlunderQuiz';
import { deleteBlunder, listAllBlunders } from '../storage/blundersRepo';

type Tab = 'scan' | 'queue' | 'quiz';

export default function LeaksRoute() {
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('id') ?? undefined;
  const [tab, setTab] = useState<Tab>('queue');
  const [allBlunders, setAllBlunders] = useState<Awaited<ReturnType<typeof listAllBlunders>>>([]);

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
    const items = await listAllBlunders();
    items.sort(
      (a, b) =>
        new Date(b.source.playedAt).getTime() -
        new Date(a.source.playedAt).getTime(),
    );
    setAllBlunders(items);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteBlunder(id);
      await loadAll();
      await refreshQueue();
    },
    [loadAll, refreshQueue],
  );

  const handleTabChange = useCallback(
    (next: Tab) => {
      setTab(next);
      if (next === 'queue') {
        void loadAll();
      }
    },
    [loadAll],
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
          <BlunderQueueList
            items={allBlunders.length > 0 ? allBlunders : queue}
            selectedId={current?.id}
            onSelect={(id) => {
              void selectBlunder(id);
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
