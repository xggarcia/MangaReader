import type { SyncMessage } from './SyncMessage';

export interface PairedDevice {
  id: string;
  name: string;
}

/** Sync sessions merge progress; send sessions carry comic files. */
export type SessionPurpose = 'sync' | 'send';

export type SyncTransportEvent =
  | { type: 'pairingCandidates'; candidates: PairedDevice[] }
  | { type: 'pairingCode'; code: string; peerName: string }
  | { type: 'paired'; device: PairedDevice }
  | { type: 'pairingFailed'; reason: string }
  | {
      type: 'sessionOpened';
      sessionId: string;
      peer: PairedDevice;
      purpose: SessionPurpose;
      /** This device opened it (for send sessions, it is the sender). */
      initiator: boolean;
      requestId: string | null;
    }
  | { type: 'sessionFailed'; requestId: string }
  | { type: 'fileReceived'; sessionId: string; fileId: string; path: string }
  | { type: 'fileProgress'; sessionId: string; fileId: string; received: number }
  | { type: 'sessionMessage'; sessionId: string; message: SyncMessage }
  | { type: 'sessionClosed'; sessionId: string };

/**
 * The encrypted local-network link between the owner's paired devices: discovery, pairing and
 * sessions that carry sync messages. It never talks to anything outside the local network.
 */
export interface SyncTransportRepository {
  getState(): Promise<{ deviceName: string; peers: PairedDevice[] }>;
  /** Listens and advertises on the local network (while the app is in the foreground). */
  start(): Promise<void>;
  stop(): Promise<void>;
  /** Opens sessions with the paired devices currently on the network. */
  syncNow(): Promise<void>;
  setPairingMode(enabled: boolean): Promise<void>;
  requestPairing(deviceId: string): Promise<void>;
  /** After comparing the codes shown on both devices. */
  confirmPairing(accept: boolean): Promise<void>;
  unpair(deviceId: string): Promise<void>;
  send(sessionId: string, message: SyncMessage): Promise<void>;
  /** Opens a send session with a paired device on the network (answered by sessionOpened). */
  openSendSession(deviceId: string, requestId: string): Promise<void>;
  /** Streams a comic file over a send session. */
  sendFile(
    sessionId: string,
    fileId: string,
    file: Blob,
    onBytes?: (bytes: number) => void,
  ): Promise<void>;
  /** A received file (announced by fileReceived), read once and then discarded. */
  takeReceivedFile(path: string): Promise<Blob>;
  closeSession(sessionId: string): Promise<void>;
  /** Returns a function that stops listening. */
  onEvent(listener: (event: SyncTransportEvent) => void): () => void;
}
