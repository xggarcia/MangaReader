import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Haptic feedback is a nicety: it is skipped on web and failures are ignored.
const enabled = () => Capacitor.isNativePlatform();

export const haptics = {
  /** Light tick when a selection changes (tabs, segmented controls, menus). */
  selection(): void {
    if (enabled()) void Haptics.selectionChanged().catch(() => undefined);
  },
  /** Physical "thud" for lifting an item (long press). */
  impact(style: 'light' | 'medium' = 'medium'): void {
    if (!enabled()) return;
    void Haptics.impact({
      style: style === 'light' ? ImpactStyle.Light : ImpactStyle.Medium,
    }).catch(() => undefined);
  },
  success(): void {
    if (enabled())
      void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
  },
  warning(): void {
    if (enabled())
      void Haptics.notification({ type: NotificationType.Warning }).catch(() => undefined);
  },
};
