import type { SyncMessage } from './SyncMessage';

export interface PairedDevice {
  id: string;
  name: string;
}

export type SyncTransportEvent =
  | { type: 'pairingCandidates'; candidates: PairedDevice[] }
  | { type: 'pairingCode'; code: string; peerName: string }
  | { type: 'paired'; device: PairedDevice }
  | { type: 'pairingFailed'; reason: string }
  | { type: 'sessionOpened'; sessionId: string; peer: PairedDevice }
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
  closeSession(sessionId: string): Promise<void>;
  /** Returns a function that stops listening. */
  onEvent(listener: (event: SyncTransportEvent) => void): () => void;
}
