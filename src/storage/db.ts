import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION } from '../constants/db';
import type { AppSettings } from '../types/settings';
import type { DrillStats } from '../types/preset';
import type { BridgeProgress } from '../types/bridge';
import type { OutOfBookProgress } from '../types/outOfBook';
import type { RepertoireProgress } from '../types/repertoire';
import type { TacticsProgress } from '../types/tactics';

export type AppDB = IDBPDatabase<{
  settings: {
    key: AppSettings['id'];
    value: AppSettings;
  };
  repertoire_progress: {
    key: RepertoireProgress['nodeId'];
    value: RepertoireProgress;
    indexes: {
      color: RepertoireProgress['color'];
      lastPracticedAt: RepertoireProgress['lastPracticedAt'];
      status: RepertoireProgress['status'];
    };
  };
  personal_blunders: {
    key: string;
    // Typed via docs only; keep runtime flexible until a dedicated type is introduced.
    value: unknown;
    indexes: {
      'userState.status': string;
      'source.playedAt': string;
      'source.userColor': string;
      tags: string;
    };
  };
  out_of_book_progress: {
    key: OutOfBookProgress['deviationId'];
    value: OutOfBookProgress;
    indexes: {
      parentNodeId: OutOfBookProgress['parentNodeId'];
      status: OutOfBookProgress['status'];
      lastPracticedAt: OutOfBookProgress['lastPracticedAt'];
    };
  };
  bridge_progress: {
    key: BridgeProgress['handoffId'];
    value: BridgeProgress;
    indexes: {
      repertoireNodeId: BridgeProgress['repertoireNodeId'];
      lastPracticedAt: BridgeProgress['lastPracticedAt'];
    };
  };
  drill_stats: {
    key: DrillStats['presetId'];
    value: DrillStats;
    indexes: {
      module: DrillStats['module'];
      lastPlayedAt: DrillStats['lastPlayedAt'];
    };
  };
  tactics_progress: {
    key: TacticsProgress['puzzleId'];
    value: TacticsProgress;
    indexes: {
      packId: TacticsProgress['packId'];
      status: TacticsProgress['status'];
      lastAttemptAt: TacticsProgress['lastAttemptAt'];
    };
  };
  conversion_missed: {
    key: string;
    value: unknown;
    indexes: {
      'userState.status': string;
      'source.playedAt': string;
      'analysis.peakEvalCp': number;
      tags: string;
    };
  };
  analysis_cache: {
    key: string;
    value: unknown;
    indexes: {
      createdAt: string;
    };
  };
}>;

let dbPromise: Promise<AppDB> | null = null;

export function openAppDB(): Promise<AppDB> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        // Repertoire progress
        const repertoireStore = db.objectStoreNames.contains('repertoire_progress')
          ? transaction.objectStore('repertoire_progress')
          : db.createObjectStore('repertoire_progress', {
              keyPath: 'nodeId',
            });
        if (!repertoireStore.indexNames.contains('color')) {
          repertoireStore.createIndex('color', 'color');
        }
        if (!repertoireStore.indexNames.contains('lastPracticedAt')) {
          repertoireStore.createIndex('lastPracticedAt', 'lastPracticedAt');
        }
        if (!repertoireStore.indexNames.contains('status')) {
          repertoireStore.createIndex('status', 'status');
        }

        // Personal blunders
        const blundersStore = db.objectStoreNames.contains('personal_blunders')
          ? transaction.objectStore('personal_blunders')
          : db.createObjectStore('personal_blunders', {
              keyPath: 'id',
            });
        if (!blundersStore.indexNames.contains('userState.status')) {
          blundersStore.createIndex('userState.status', 'userState.status');
        }
        if (!blundersStore.indexNames.contains('source.playedAt')) {
          blundersStore.createIndex('source.playedAt', 'source.playedAt');
        }
        if (!blundersStore.indexNames.contains('source.userColor')) {
          blundersStore.createIndex('source.userColor', 'source.userColor');
        }
        if (!blundersStore.indexNames.contains('tags')) {
          blundersStore.createIndex('tags', 'tags', { multiEntry: true });
        }

        // Out-of-book progress
        const oobStore = db.objectStoreNames.contains('out_of_book_progress')
          ? transaction.objectStore('out_of_book_progress')
          : db.createObjectStore('out_of_book_progress', {
              keyPath: 'deviationId',
            });
        if (!oobStore.indexNames.contains('parentNodeId')) {
          oobStore.createIndex('parentNodeId', 'parentNodeId');
        }
        if (!oobStore.indexNames.contains('status')) {
          oobStore.createIndex('status', 'status');
        }
        if (!oobStore.indexNames.contains('lastPracticedAt')) {
          oobStore.createIndex('lastPracticedAt', 'lastPracticedAt');
        }

        // Bridge progress
        const bridgeStore = db.objectStoreNames.contains('bridge_progress')
          ? transaction.objectStore('bridge_progress')
          : db.createObjectStore('bridge_progress', {
              keyPath: 'handoffId',
            });
        if (!bridgeStore.indexNames.contains('repertoireNodeId')) {
          bridgeStore.createIndex('repertoireNodeId', 'repertoireNodeId');
        }
        if (!bridgeStore.indexNames.contains('lastPracticedAt')) {
          bridgeStore.createIndex('lastPracticedAt', 'lastPracticedAt');
        }

        // Drill stats
        const drillStore = db.objectStoreNames.contains('drill_stats')
          ? transaction.objectStore('drill_stats')
          : db.createObjectStore('drill_stats', { keyPath: 'presetId' });
        if (!drillStore.indexNames.contains('module')) {
          drillStore.createIndex('module', 'module');
        }
        if (!drillStore.indexNames.contains('lastPlayedAt')) {
          drillStore.createIndex('lastPlayedAt', 'lastPlayedAt');
        }

        // Tactics progress
        const tacticsStore = db.objectStoreNames.contains('tactics_progress')
          ? transaction.objectStore('tactics_progress')
          : db.createObjectStore('tactics_progress', {
              keyPath: 'puzzleId',
            });
        if (!tacticsStore.indexNames.contains('packId')) {
          tacticsStore.createIndex('packId', 'packId');
        }
        if (!tacticsStore.indexNames.contains('status')) {
          tacticsStore.createIndex('status', 'status');
        }
        if (!tacticsStore.indexNames.contains('lastAttemptAt')) {
          tacticsStore.createIndex('lastAttemptAt', 'lastAttemptAt');
        }

        // Conversion missed
        const conversionStore = db.objectStoreNames.contains('conversion_missed')
          ? transaction.objectStore('conversion_missed')
          : db.createObjectStore('conversion_missed', { keyPath: 'id' });
        if (!conversionStore.indexNames.contains('userState.status')) {
          conversionStore.createIndex('userState.status', 'userState.status');
        }
        if (!conversionStore.indexNames.contains('source.playedAt')) {
          conversionStore.createIndex('source.playedAt', 'source.playedAt');
        }
        if (!conversionStore.indexNames.contains('analysis.peakEvalCp')) {
          conversionStore.createIndex('analysis.peakEvalCp', 'analysis.peakEvalCp');
        }
        if (!conversionStore.indexNames.contains('tags')) {
          conversionStore.createIndex('tags', 'tags', { multiEntry: true });
        }

        // Analysis cache
        const analysisStore = db.objectStoreNames.contains('analysis_cache')
          ? transaction.objectStore('analysis_cache')
          : db.createObjectStore('analysis_cache', {
              keyPath: 'cacheKey',
            });
        if (!analysisStore.indexNames.contains('createdAt')) {
          analysisStore.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}
