import { useEffect } from 'react';
import { setImmersiveMode } from '../shared/infrastructure/nativeSystemUi';

/** Enables immersive (fullscreen) mode while `enabled` is true and restores it on unmount. */
export function useImmersiveMode(enabled: boolean): void {
  useEffect(() => {
    void setImmersiveMode(enabled);
    return () => {
      void setImmersiveMode(false);
    };
  }, [enabled]);
}
