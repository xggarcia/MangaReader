import { create } from 'zustand';
import type { SyncSession } from '../modules/sync/application/SyncSession';
import { getSyncUseCases } from '../modules/sync/application/factory';
import type { PairedDevice } from '../modules/sync/domain/SyncTransportRepository';
import { hasLocalSync } from '../shared/infrastructure/localSync';
import { useCollectionsStore } from './collectionsStore';
import { useLibraryStore } from './libraryStore';

export type PairingState =
  | { status: 'off' }
  | { status: 'searching'; candidates: PairedDevice[] }
  | { status: 'connecting' }
  | { status: 'code'; code: string; peerName: string; confirmed: boolean }
  | { status: 'paired'; peerName: string }
  | { status: 'failed'; reason: string };

export interface SyncResult {
  peerName: string;
  changed: number;
  at: number;
}

interface SyncState {
  deviceName: string;
  peers: PairedDevice[];
  /** Last time each paired device synced with this one (epoch ms). */
  lastSyncAt: Record<string, number>;
  pairing: PairingState;
  /** The last sync that brought changes, shown briefly. */
  lastResult: SyncResult | null;
  /** Loads the paired devices and starts handling sync events (once). */
  init: () => Promise<void>;
  /** Foreground: listen on the local network and sync with the paired devices around. */
  resume: () => Promise<void>;
  /** Background: stop listening. */
  pause: () => Promise<void>;
  syncNow: () => void;
  startPairing: () => Promise<void>;
  stopPairing: () => Promise<void>;
  pairWith: (deviceId: string) => Promise<void>;
  confirmPairing: (accept: boolean) => Promise<void>;
  unpair: (deviceId: string) => Promise<void>;
  dismissResult: () => void;
}

const LAST_SYNC_KEY = 'syncLastAt';
const RESULT_VISIBLE_MS = 5000;

function loadLastSync(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(LAST_SYNC_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function saveLastSync(value: Record<string, number>): void {
  try {
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(value));
  } catch {
    // Only a display convenience.
  }
}

export const useSyncStore = create<SyncState>((set, get) => {
  let initialized: Promise<void> | null = null;
  let resultTimer: ReturnType<typeof setTimeout> | undefined;
  const sessions = new Map<string, SyncSession>();

  const refreshPeers = async () => {
    const { deviceName, peers } = await getSyncUseCases().getState();
    set({ deviceName, peers });
  };

  const finishSession = (peer: PairedDevice, changed: number) => {
    const lastSyncAt = { ...get().lastSyncAt, [peer.id]: Date.now() };
    saveLastSync(lastSyncAt);
    set({ lastSyncAt });
    if (changed === 0) return;
    void useLibraryStore.getState().load();
    void useCollectionsStore.getState().load();
    clearTimeout(resultTimer);
    set({ lastResult: { peerName: peer.name, changed, at: Date.now() } });
    resultTimer = setTimeout(() => set({ lastResult: null }), RESULT_VISIBLE_MS);
  };

  return {
    deviceName: '',
    peers: [],
    lastSyncAt: loadLastSync(),
    pairing: { status: 'off' },
    lastResult: null,

    init: () => {
      if (!hasLocalSync()) return Promise.resolve();
      initialized ??= (async () => {
        const sync = getSyncUseCases();
        sync.onEvent((event) => {
          switch (event.type) {
            case 'pairingCandidates': {
              const pairing = get().pairing;
              if (pairing.status === 'searching') {
                set({ pairing: { status: 'searching', candidates: event.candidates } });
              }
              break;
            }
            case 'pairingCode':
              set({
                pairing: {
                  status: 'code',
                  code: event.code,
                  peerName: event.peerName,
                  confirmed: false,
                },
              });
              break;
            case 'paired':
              set({ pairing: { status: 'paired', peerName: event.device.name } });
              void refreshPeers().then(() => get().syncNow());
              break;
            case 'pairingFailed':
              if (get().pairing.status !== 'off') {
                set({ pairing: { status: 'failed', reason: event.reason } });
              }
              break;
            case 'sessionOpened': {
              const session = sync.createSession(event.sessionId, ({ changed }) =>
                finishSession(event.peer, changed),
              );
              sessions.set(event.sessionId, session);
              void session.start().catch(() => undefined);
              break;
            }
            case 'sessionMessage':
              void sessions.get(event.sessionId)?.receive(event.message);
              break;
            case 'sessionClosed':
              sessions.delete(event.sessionId);
              break;
          }
        });
        await refreshPeers();
      })();
      return initialized;
    },

    resume: async () => {
      if (!hasLocalSync()) return;
      await get().init();
      // Nothing to listen for until a device is paired (pairing starts the network itself).
      if (get().peers.length === 0) return;
      await getSyncUseCases().start();
      get().syncNow();
    },

    pause: async () => {
      if (!hasLocalSync() || get().pairing.status !== 'off') return;
      await getSyncUseCases().stop();
    },

    syncNow: () => {
      if (hasLocalSync() && get().peers.length > 0) void getSyncUseCases().syncNow();
    },

    startPairing: async () => {
      await get().init();
      set({ pairing: { status: 'searching', candidates: [] } });
      await getSyncUseCases().setPairingMode(true);
    },

    stopPairing: async () => {
      set({ pairing: { status: 'off' } });
      await getSyncUseCases().setPairingMode(false);
      if (get().peers.length === 0) await getSyncUseCases().stop();
    },

    pairWith: async (deviceId) => {
      set({ pairing: { status: 'connecting' } });
      await getSyncUseCases().requestPairing(deviceId);
    },

    confirmPairing: async (accept) => {
      const pairing = get().pairing;
      if (pairing.status === 'code') set({ pairing: { ...pairing, confirmed: accept } });
      await getSyncUseCases().confirmPairing(accept);
    },

    unpair: async (deviceId) => {
      await getSyncUseCases().unpair(deviceId);
      await refreshPeers();
      if (get().peers.length === 0) await getSyncUseCases().stop();
    },

    dismissResult: () => {
      clearTimeout(resultTimer);
      set({ lastResult: null });
    },
  };
});
