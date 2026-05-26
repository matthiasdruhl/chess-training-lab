import { openDB, type IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION } from '../constants/db';
import type { AppSettings } from '../types/settings';
import type { RepertoireProgress } from '../types/repertoire';

export type AppDB = IDBPDatabase<{
  settings: {
    key: string;
    value: AppSettings;
  };
  repertoire_progress: {
    key: string;
    value: RepertoireProgress;
    indexes: {
      color: string;
      lastPracticedAt: string | null;
      status: string;
    };
  };
  personal_blunders: {
    key: string;
    value: unknown;
    indexes: {
      'userState.status': string;
      'source.playedAt': string;
      'source.userColor': string;
      tags: string;
    };
  };
  out_of_book_progress: {
    key: string;
    value: unknown;
    indexes: {
      parentNodeId: string;
      status: string;
      lastPracticedAt: string | null;
    };
  };
  bridge_progress: {
    key: string;
    value: unknown;
    indexes: {
      repertoireNodeId: string;
      lastPracticedAt: string | null;
    };
  };
  drill_stats: {
    key: string;
    value: unknown;
    indexes: {
      module: string;
      lastPlayedAt: string | null;
    };
  };
  tactics_progress: {
    key: string;
    value: unknown;
    indexes: {
      packId: string;
      status: string;
      lastAttemptAt: string | null;
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
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('repertoire_progress')) {
          const store = db.createObjectStore('repertoire_progress', {
            keyPath: 'nodeId',
          });
          store.createIndex('color', 'color');
          store.createIndex('lastPracticedAt', 'lastPracticedAt');
          store.createIndex('status', 'status');
        }

        if (!db.objectStoreNames.contains('personal_blunders')) {
          const store = db.createObjectStore('personal_blunders', {
            keyPath: 'id',
          });
          store.createIndex('userState.status', 'userState.status');
          store.createIndex('source.playedAt', 'source.playedAt');
          store.createIndex('source.userColor', 'source.userColor');
          store.createIndex('tags', 'tags', { multiEntry: true });
        }

        if (!db.objectStoreNames.contains('out_of_book_progress')) {
          const store = db.createObjectStore('out_of_book_progress', {
            keyPath: 'deviationId',
          });
          store.createIndex('parentNodeId', 'parentNodeId');
          store.createIndex('status', 'status');
          store.createIndex('lastPracticedAt', 'lastPracticedAt');
        }

        if (!db.objectStoreNames.contains('bridge_progress')) {
          const store = db.createObjectStore('bridge_progress', {
            keyPath: 'handoffId',
          });
          store.createIndex('repertoireNodeId', 'repertoireNodeId');
          store.createIndex('lastPracticedAt', 'lastPracticedAt');
        }

        if (!db.objectStoreNames.contains('drill_stats')) {
          const store = db.createObjectStore('drill_stats', { keyPath: 'presetId' });
          store.createIndex('module', 'module');
          store.createIndex('lastPlayedAt', 'lastPlayedAt');
        }

        if (!db.objectStoreNames.contains('tactics_progress')) {
          const store = db.createObjectStore('tactics_progress', {
            keyPath: 'puzzleId',
          });
          store.createIndex('packId', 'packId');
          store.createIndex('status', 'status');
          store.createIndex('lastAttemptAt', 'lastAttemptAt');
        }

        if (!db.objectStoreNames.contains('conversion_missed')) {
          const store = db.createObjectStore('conversion_missed', { keyPath: 'id' });
          store.createIndex('userState.status', 'userState.status');
          store.createIndex('source.playedAt', 'source.playedAt');
          store.createIndex('analysis.peakEvalCp', 'analysis.peakEvalCp');
          store.createIndex('tags', 'tags', { multiEntry: true });
        }

        if (!db.objectStoreNames.contains('analysis_cache')) {
          const store = db.createObjectStore('analysis_cache', {
            keyPath: 'cacheKey',
          });
          store.createIndex('createdAt', 'createdAt');
        }
      },
    });
  }
  return dbPromise;
}
