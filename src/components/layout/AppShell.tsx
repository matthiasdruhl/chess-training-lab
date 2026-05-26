import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { EngineStatusBadge } from '../engine/EngineStatusBadge';
import { useEngineStatus } from '../../hooks/useStockfish';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/repertoire', label: 'Repertoire' },
  { to: '/out-of-book', label: 'Out-of-book' },
  { to: '/bridge', label: 'Bridge' },
  { to: '/middlegame', label: 'Middlegame' },
  { to: '/tactics', label: 'Tactics' },
  { to: '/leaks', label: 'Leaks' },
  { to: '/conversion', label: 'Conversion' },
  { to: '/endgame', label: 'Endgame' },
] as const;

function navLinkClass({ isActive }: { isActive: boolean }) {
  return [
    'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-slate-700 text-white'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
  ].join(' ');
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { engineStatus } = useEngineStatus();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 w-56 transform border-r border-slate-800 bg-slate-900 transition-transform md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-14 items-center border-b border-slate-800 px-4">
          <span className="text-sm font-semibold tracking-wide">Chess Training Lab</span>
        </div>
        <nav className="space-y-1 p-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? item.end : false}
              className={navLinkClass}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-900 px-4">
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
              onClick={() => setMobileOpen(true)}
            >
              Menu
            </button>
            <span className="ml-3 text-sm font-semibold">Chess Training Lab</span>
          </div>
          <div className="hidden flex-1 md:block" />
          <EngineStatusBadge status={engineStatus} />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
