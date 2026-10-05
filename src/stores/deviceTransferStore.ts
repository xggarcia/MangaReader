import { create } from 'zustand';
import type {
  ReceiveProgress,
  ReceiveResult,
  ReceiveSession,
  SendProgress,
  SendResult,
  SendSession,
} from '../modules/sync/application/TransferSessions';
import { getSyncUseCases } from '../modules/sync/application/factory';
import type { Offer } from '../modules/sync/application/transferComics';
import type { PairedDevice } from '../modules/sync/domain/SyncTransportRepository';
import { hasLocalSync } from '../shared/infrastructure/localSync';
import { setKeepScreenOn } from '../shared/infrastructure/screenWakeLock';
import { useCollectionsStore } from './collectionsStore';
import { useLibraryStore } from './libraryStore';

export type OutgoingState =
  | { status: 'idle' }
  | { status: 'connecting'; peer: PairedDevice }
  | { status: 'transferring'; peer: PairedDevice; progress: SendProgress }
  | { status: 'done'; peer: PairedDevice; result: SendResult }
  | { status: 'failed'; peer: PairedDevice; reason: 'notFound' | 'unreachable' | 'nothing' };

export type IncomingState =
  | { status: 'idle' }
  | { status: 'receiving'; peerName: string; progress: ReceiveProgress }
  | { status: 'done'; peerName: string; result: ReceiveResult };

interface DeviceTransferState {
  outgoing: OutgoingState;
  incoming: IncomingState;
  /** Starts handling send sessions (once). */
  init: () => Promise<void>;
  /** Sends comics (or a whole collection) to a paired device on the same Wi-Fi. */
  send: (peer: PairedDevice, comicIds: readonly string[], collectionId?: string) => Promise<void>;
  resetOutgoing: () => void;
  dismissIncoming: () => void;
}

const INCOMING_VISIBLE_MS = 6000;

export const useDeviceTransferStore = create<DeviceTransferState>((set, get) => {
  let initialized: Promise<void> | null = null;
  let pending: { requestId: string; peer: PairedDevice; offer: Offer } | null = null;
  let incomingTimer: ReturnType<typeof setTimeout> | undefined;
  const sending = new Map<string, SendSession>();
  const receiving = new Map<string, ReceiveSession>();

  const finishIncoming = (peerName: string, result: ReceiveResult) => {
    void setKeepScreenOn(false);
    void useLibraryStore.getState().load();
    void useCollectionsStore.getState().load();
    set({ incoming: { status: 'done', peerName, result } });
    clearTimeout(incomingTimer);
    incomingTimer = setTimeout(() => set({ incoming: { status: 'idle' } }), INCOMING_VISIBLE_MS);
  };

  return {
    outgoing: { status: 'idle' },
    incoming: { status: 'idle' },

    init: () => {
      if (!hasLocalSync()) return Promise.resolve();
      initialized ??= Promise.resolve().then(() => {
        const sync = getSyncUseCases();
        sync.onEvent((event) => {
          switch (event.type) {
            case 'sessionOpened': {
              if (event.purpose !== 'send') break;
              if (event.initiator) {
                if (!pending || pending.requestId !== event.requestId) break;
                const { peer, offer } = pending;
                pending = null;
                const session = sync.createSendSession(event.sessionId, offer, {
                  onProgress: (progress) =>
                    set({ outgoing: { status: 'transferring', peer, progress } }),
                  onFinished: (result) => {
                    void setKeepScreenOn(false);
                    set({ outgoing: { status: 'done', peer, result } });
                  },
                });
                sending.set(event.sessionId, session);
                void session.start();
              } else {
                const peerName = event.peer.name;
                void setKeepScreenOn(true);
                clearTimeout(incomingTimer);
                const session = sync.createReceiveSession(event.sessionId, {
                  onProgress: (progress) =>
                    set({ incoming: { status: 'receiving', peerName, progress } }),
                  onFinished: (result) => finishIncoming(peerName, result),
                });
                receiving.set(event.sessionId, session);
              }
              break;
            }
            case 'sessionFailed':
              if (pending?.requestId === event.requestId) {
                const { peer } = pending;
                pending = null;
                void setKeepScreenOn(false);
                set({ outgoing: { status: 'failed', peer, reason: 'unreachable' } });
              }
              break;
            case 'sessionMessage':
              sending.get(event.sessionId)?.receive(event.message);
              receiving.get(event.sessionId)?.receive(event.message);
              break;
            case 'fileReceived':
              receiving.get(event.sessionId)?.fileReceived(event.fileId, event.path);
              break;
            case 'sessionClosed':
              sending.get(event.sessionId)?.closed();
              receiving.get(event.sessionId)?.closed();
              sending.delete(event.sessionId);
              receiving.delete(event.sessionId);
              break;
            default:
              break;
          }
        });
      });
      return initialized;
    },

    send: async (peer, comicIds, collectionId) => {
      await get().init();
      const sync = getSyncUseCases();
      const offer = await sync.buildOffer(comicIds, collectionId ?? null);
      if (offer.comics.length === 0) {
        set({ outgoing: { status: 'failed', peer, reason: 'nothing' } });
        return;
      }
      const requestId = crypto.randomUUID();
      pending = { requestId, peer, offer };
      set({ outgoing: { status: 'connecting', peer } });
      void setKeepScreenOn(true);
      try {
        await sync.openSendSession(peer.id, requestId);
      } catch {
        pending = null;
        void setKeepScreenOn(false);
        set({ outgoing: { status: 'failed', peer, reason: 'notFound' } });
      }
    },

    resetOutgoing: () => {
      const status = get().outgoing.status;
      if (status === 'done' || status === 'failed') set({ outgoing: { status: 'idle' } });
    },

    dismissIncoming: () => {
      clearTimeout(incomingTimer);
      if (get().incoming.status === 'done') set({ incoming: { status: 'idle' } });
    },
  };
});
