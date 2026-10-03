import { useEffect } from 'react';
import { setKeepScreenOn } from '../shared/infrastructure/screenWakeLock';

/** Prevents the screen from turning off while the component is mounted (e.g. while reading). */
export function useKeepScreenOn(): void {
  useEffect(() => {
    void setKeepScreenOn(true);
    return () => {
      void setKeepScreenOn(false);
    };
  }, []);
}
