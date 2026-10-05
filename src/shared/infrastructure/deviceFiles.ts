import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/** A file reachable through the Android Storage Access Framework (content:// URI). */
export interface NativeDeviceFile {
  uri: string;
  name: string;
  size: number;
  /** Epoch milliseconds, 0 when unknown. */
  modified: number;
  /** Sub-folder inside the comics folder ("" at its root). */
  folder: string;
  /** Opened with the app or shared to it. */
  received?: boolean;
}

interface DeviceFilesPlugin {
  pickFolder(): Promise<{ uri?: string; name?: string }>;
  listFolder(options: { uri: string }): Promise<{ files: NativeDeviceFile[] }>;
  pickFiles(): Promise<{ files: NativeDeviceFile[] }>;
  takeReceivedFiles(): Promise<{ files: NativeDeviceFile[] }>;
  deleteFile(options: { uri: string }): Promise<{ deleted: boolean }>;
  copyToCache(options: { uri: string }): Promise<{ path: string }>;
  deleteCacheFile(options: { path: string }): Promise<void>;
  createExport(options: { fileName: string }): Promise<{ id: string }>;
  addExportEntry(options: { id: string; name: string }): Promise<void>;
  writeExport(options: { id: string; data: string }): Promise<void>;
  finishExport(options: { id: string }): Promise<{ path: string; size: number }>;
  abortExport(options: { id: string }): Promise<void>;
  shareExport(options: { path: string; title: string }): Promise<void>;
  saveExportToFolder(options: { path: string; folderUri: string }): Promise<{ uri: string }>;
  openBackup(options: { uri: string }): Promise<{ id: string }>;
  nextBackupEntry(options: { id: string }): Promise<{ done: boolean; name?: string }>;
  extractBackupEntry(options: { id: string }): Promise<{ path: string }>;
  closeBackup(options: { id: string }): Promise<void>;
  addListener(event: 'filesReceived', listener: () => void): Promise<PluginListenerHandle>;
}

// Android only: android/app/src/main/java/com/mangareader/app/DeviceFilesPlugin.java
export const DeviceFiles = registerPlugin<DeviceFilesPlugin>('DeviceFiles');

/** Folder access, deleting originals and library export need the Android app. */
export function hasDeviceFiles(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/** Reads a file the plugin left in the app cache (served to the page as a local file). */
export async function readCacheFile(path: string, type = ''): Promise<Blob> {
  const response = await fetch(Capacitor.convertFileSrc(`file://${path}`));
  if (!response.ok) throw new Error(`[deviceFiles] Cannot read ${path}: ${response.status}`);
  const blob = await response.blob();
  return type ? new Blob([blob], { type }) : blob;
}

/** Reads a picked, received or folder file: copied to the cache, read, then the copy removed. */
export async function readDeviceFile(uri: string): Promise<Blob> {
  const { path } = await DeviceFiles.copyToCache({ uri });
  try {
    return await readCacheFile(path);
  } finally {
    void DeviceFiles.deleteCacheFile({ path });
  }
}

const CHUNK_BYTES = 4 * 1024 * 1024;

/** Binary channel injected by DeviceFilesPlugin (androidx.webkit WebMessageListener). */
interface BinaryChannel {
  postMessage(message: ArrayBuffer): void;
  addEventListener(type: 'message', listener: (event: MessageEvent<string>) => void): void;
}

let pendingReplies: ((answer: string) => void)[] = [];
let channelListening = false;

function binaryChannel(): BinaryChannel | null {
  const channel = (window as Window & { MangaReaderExport?: BinaryChannel }).MangaReaderExport;
  if (!channel) return null;
  if (!channelListening) {
    channel.addEventListener('message', (event) => {
      const [resolve, ...rest] = pendingReplies;
      pendingReplies = rest;
      resolve?.(String(event.data));
    });
    channelListening = true;
  }
  return channel;
}

/** Sends one chunk as raw bytes and waits until the native side has written it. */
function sendBinary(channel: BinaryChannel, chunk: ArrayBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    pendingReplies.push((answer) => {
      if (answer === 'ok') resolve();
      else reject(Object.assign(new Error(answer), { code: answer.replace('error:', '') }));
    });
    channel.postMessage(chunk);
  });
}

function toBase64(chunk: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('[deviceFiles] Cannot read chunk'));
    reader.readAsDataURL(chunk);
  });
}

/**
 * Streams a Blob to the native side chunk by chunk (the stream open there decides where the
 * bytes go: a library export, or a comic sent to a paired device); the next chunk is read while
 * the previous one is written. Raw bytes through the binary channel when the WebView supports
 * it (several times faster), base64 through `writeBase64` over the plugin bridge otherwise.
 */
export async function streamBlobToNative(
  blob: Blob,
  writeBase64: (data: string) => Promise<void>,
  onBytes?: (bytes: number) => void,
): Promise<void> {
  const channel = binaryChannel();
  const read = (start: number) => {
    const slice = blob.slice(start, start + CHUNK_BYTES);
    return channel ? slice.arrayBuffer() : toBase64(slice);
  };
  let offset = 0;
  let next = blob.size > 0 ? read(0) : null;
  while (next) {
    const data = await next;
    const written = Math.min(CHUNK_BYTES, blob.size - offset);
    offset += written;
    next = offset < blob.size ? read(offset) : null;
    if (channel && data instanceof ArrayBuffer) await sendBinary(channel, data);
    else await writeBase64(data as string);
    onBytes?.(written);
  }
}

/** Streams a Blob into the library export being written. */
export function writeBlobToExport(
  id: string,
  blob: Blob,
  onBytes?: (bytes: number) => void,
): Promise<void> {
  return streamBlobToNative(blob, (data) => DeviceFiles.writeExport({ id, data }), onBytes);
}
