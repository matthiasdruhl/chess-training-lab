const MODULES = [
  {
    title: 'Repertoire Trainer',
    description: 'Memorize opening lines with intent and move order.',
    path: '/repertoire',
  },
  {
    title: 'Out-of-Book Defender',
    description: 'Principled responses when opponents leave your prep.',
    path: '/out-of-book',
  },
  {
    title: 'Opening → Middlegame Bridge',
    description: 'Connect theory to middlegame plans after the opening.',
    path: '/bridge',
  },
  {
    title: 'Middlegame Simulator',
    description: 'Play from characteristic pawn structures vs the engine.',
    path: '/middlegame',
  },
  {
    title: 'Structure Tactics',
    description: 'Pattern recognition in your opening structures (preview route; full module in Phase 6).',
    path: '/tactics',
  },
  {
    title: 'Leak Detector',
    description: 'Turn Chess.com mistakes into repeatable puzzles.',
    path: '/leaks',
  },
  {
    title: 'Conversion Review',
    description: 'Fix winning positions you failed to convert.',
    path: '/conversion',
  },
  {
    title: 'Endgame Drill-Master',
    description: 'High-repetition endgame technique with strict reset.',
    path: '/endgame',
  },
] as const;

export { MODULES };
