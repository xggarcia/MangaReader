import { BookCheck, BookOpen, BookX, Check, Ellipsis, Trash2 } from 'lucide-react';
import { memo, useRef, useState, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCoverUrl } from '../../hooks/useCoverUrl';
import type { LibraryItem } from '../../modules/library/domain/LibraryItem';
import { haptics } from '../../shared/infrastructure/haptics';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { CoverContextMenu, type ContextAction } from './CoverContextMenu';
import { openComic } from './openComic';
import styles from './Library.module.css';

interface ComicCardProps {
  item: LibraryItem;
  onSetReadStatus: (comicId: string, isRead: boolean) => void;
  onRemove: (comicId: string) => void;
}

const LONG_PRESS_MS = 450;
const LONG_PRESS_TOLERANCE_PX = 8;
/** Library grid cell: cover, title, reading status. Long press lifts the cover with actions. */
export const ComicCard = memo(function ComicCard({
  item,
  onSetReadStatus,
  onRemove,
}: ComicCardProps) {
  const { t } = useTranslation();
  const comic = item.getComic();
  const comicId = comic.getId();
  const title = comic.getTitle();
  const coverUrl = useCoverUrl(comicId);
  const cover = useRef<HTMLButtonElement>(null);
  const press = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  const suppressClick = useRef(false);
  const [menuAnchor, setMenuAnchor] = useState<DOMRect | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const progress = item.getProgress();
  const percent = Math.round(item.getProgressRatio() * 100);
  const isRead = item.isRead();
  const series = comic.getSeries();
  const issue = comic.getNumber();
  const subtitle = series
    ? [series, issue ? t('library.issue', { number: issue }) : null].filter(Boolean).join(' ')
    : t('library.pages', { count: comic.getPageCount() });

  const openMenu = () => {
    if (!cover.current) return;
    haptics.impact('medium');
    setMenuAnchor(cover.current.getBoundingClientRect());
  };

  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
  };

  const onPointerDown = (event: PointerEvent) => {
    suppressClick.current = false;
    const timer = setTimeout(() => {
      suppressClick.current = true;
      press.current = null;
      openMenu();
    }, LONG_PRESS_MS);
    press.current = { x: event.clientX, y: event.clientY, timer };
  };

  const onPointerMove = (event: PointerEvent) => {
    const start = press.current;
    if (
      start &&
      Math.hypot(event.clientX - start.x, event.clientY - start.y) > LONG_PRESS_TOLERANCE_PX
    ) {
      cancelPress();
    }
  };

  const actions: ContextAction[] = [
    {
      id: 'read',
      label: progress ? t('library.continue') : t('library.read_action'),
      icon: BookOpen,
      onSelect: () => openComic(comicId, cover.current),
    },
    isRead
      ? {
          id: 'unread',
          label: t('library.markAsUnread'),
          icon: BookX,
          onSelect: () => onSetReadStatus(comicId, false),
        }
      : {
          id: 'markRead',
          label: t('library.markAsRead'),
          icon: BookCheck,
          onSelect: () => onSetReadStatus(comicId, true),
        },
    {
      id: 'remove',
      label: t('library.removeShort'),
      icon: Trash2,
      destructive: true,
      onSelect: () => {
        haptics.warning();
        setConfirmingRemove(true);
      },
    },
  ];

  return (
    <li className={styles.cell}>
      <button
        ref={cover}
        type="button"
        className={styles.cover}
        aria-label={t('library.openComic', { title })}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancelPress}
        onPointerCancel={cancelPress}
        onContextMenu={(event) => {
          event.preventDefault();
          cancelPress();
          suppressClick.current = true;
          openMenu();
        }}
        onClick={() => {
          if (suppressClick.current) {
            suppressClick.current = false;
            return;
          }
          openComic(comicId, cover.current);
        }}
      >
        {coverUrl ? (
          <img src={coverUrl} alt="" draggable={false} decoding="async" />
        ) : (
          <span className={styles.coverPlaceholder} aria-hidden="true">
            {title.slice(0, 1).toUpperCase()}
          </span>
        )}
        {progress && !isRead && (
          <span className={styles.coverProgress} aria-hidden="true">
            <span style={{ width: `${percent}%` }} />
          </span>
        )}
      </button>
      <div className={styles.cellText}>
        <h2 className={styles.cellTitle}>{title}</h2>
        <p className={styles.cellSubtitle}>{subtitle}</p>
        <div className={styles.cellMeta}>
          {isRead ? (
            <span className={styles.statusRead}>
              <Check size={13} strokeWidth={2.6} aria-hidden />
              {t('library.read')}
            </span>
          ) : progress ? (
            <span className={styles.statusProgress}>{t('library.percent', { percent })}</span>
          ) : (
            <span className={styles.statusNew}>{t('library.new')}</span>
          )}
          <button
            type="button"
            className={styles.moreButton}
            aria-label={t('library.comicOptions', { title })}
            aria-haspopup="menu"
            onClick={openMenu}
          >
            <Ellipsis size={18} strokeWidth={2.2} aria-hidden />
          </button>
        </div>
      </div>
      {menuAnchor && (
        <CoverContextMenu
          anchor={menuAnchor}
          coverUrl={coverUrl}
          title={title}
          subtitle={subtitle}
          actions={actions}
          dismissLabel={t('library.closeMenu')}
          onClose={() => setMenuAnchor(null)}
        />
      )}
      {confirmingRemove && (
        <ConfirmSheet
          title={t('library.removeConfirm', { title })}
          confirmLabel={t('library.removeShort')}
          cancelLabel={t('library.cancel')}
          destructive
          onConfirm={() => onRemove(comicId)}
          onClose={() => setConfirmingRemove(false)}
        />
      )}
    </li>
  );
});
