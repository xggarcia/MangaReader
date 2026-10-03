import { useEffect } from 'react';
import type { PageStep, ReadingDirection } from '../modules/reading/domain/ReadingDirection';

interface ReaderKeyboardOptions {
  direction: ReadingDirection;
  onStep: (step: PageStep) => void;
  onFirst: () => void;
  onLast: () => void;
  onToggleUi: () => void;
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/** Keyboard navigation: arrows follow the reading direction, Space/PageDown advance. */
export function useReaderKeyboard({
  direction,
  onStep,
  onFirst,
  onLast,
  onToggleUi,
}: ReaderKeyboardOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (isTypingTarget(event.target)) return;

      switch (event.key) {
        case 'ArrowLeft':
          onStep(direction.stepForSide('left'));
          break;
        case 'ArrowRight':
          onStep(direction.stepForSide('right'));
          break;
        case ' ':
          onStep(event.shiftKey ? -1 : 1);
          break;
        case 'PageDown':
        case 'ArrowDown':
          onStep(1);
          break;
        case 'PageUp':
        case 'ArrowUp':
          onStep(-1);
          break;
        case 'Home':
          onFirst();
          break;
        case 'End':
          onLast();
          break;
        case 'Enter':
          onToggleUi();
          break;
        default:
          return;
      }
      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction, onStep, onFirst, onLast, onToggleUi]);
}
