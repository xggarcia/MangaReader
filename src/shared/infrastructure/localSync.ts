import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface NativePeer {
  id: string;
  name: string;
}

export interface LocalSyncPlugin {
  getState(): Promise<{
    deviceId: string;
    deviceName: string;
    running: boolean;
    port: number;
    peers: NativePeer[];
  }>;
  start(): Promise<void>;
  stop(): Promise<void>;
  setPairingMode(options: { enabled: boolean }): Promise<void>;
  requestPairing(options: { id: string }): Promise<void>;
  confirmPairing(options: { accept: boolean }): Promise<void>;
  unpair(options: { id: string }): Promise<void>;
  syncNow(): Promise<void>;
  connectTo(options: { host: string; port: number; pair?: boolean }): Promise<void>;
  send(options: { sessionId: string; data: string }): Promise<void>;
  closeSession(options: { sessionId: string }): Promise<void>;
  addListener(
    event: 'pairingCandidates',
    listener: (event: { candidates: NativePeer[] }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'pairingCode',
    listener: (event: { code: string; peerName: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'paired',
    listener: (event: NativePeer) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'pairingFailed',
    listener: (event: { reason: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'sessionOpened',
    listener: (event: { sessionId: string; peerId: string; peerName: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'sessionMessage',
    listener: (event: { sessionId: string; data: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'sessionClosed',
    listener: (event: { sessionId: string }) => void,
  ): Promise<PluginListenerHandle>;
}

// Android only: android/app/src/main/java/com/mangareader/app/LocalSyncPlugin.java
export const LocalSync = registerPlugin<LocalSyncPlugin>('LocalSync');

/** Sync between paired devices on the same Wi-Fi needs the Android app. */
export function hasLocalSync(): boolean {
  return Capacitor.getPlatform() === 'android';
}
