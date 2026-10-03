import { create } from 'zustand';

interface ReaderState {
  /** File picked by the user and not yet stored in the library. */
  pendingFile: File | null;
  setPendingFile: (file: File | null) => void;
}

export const useReaderStore = create<ReaderState>((set) => ({
  pendingFile: null,
  setPendingFile: (pendingFile) => set({ pendingFile }),
}));
