import {
  BookCheck,
  BookOpen,
  BookX,
  Check,
  CircleCheck,
  Ellipsis,
  FolderPlus,
  Pencil,
  Shrink,
  Trash2,
} from 'lucide-react';
import { memo, useRef, useState, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useCoverUrl } from '../../hooks/useCoverUrl';
import type { LibraryItem } from '../../modules/library/domain/LibraryItem';
import { haptics } from '../../shared/infrastructure/haptics';
import { CollectionPickerSheet } from '../collections/CollectionPickerSheet';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { ComicInfoSheet } from './ComicInfoSheet';
import { CoverContextMenu, type ContextAction } from './CoverContextMenu';
import { OptimizeSheet } from './OptimizeSheet';
import { openComic } from './openComic';
import { useSelection } from './useSelection';
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
  const [pickingCollection, setPickingCollection] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const selection = useSelection();
  const selected = selection.isSelected([comicId]);

  const progress = item.getProgress();
  const percent = Math.round(item.getProgressRatio() * 100);
  const isRead = item.isRead();
  // Detected series and volume ("One Piece · Tomo 3"), else the page count.
  const seriesInfo = item.getSeries();
  const volume = seriesInfo.getVolume();
  const subtitleParts = [
    seriesInfo.getName() !== title ? seriesInfo.getName() : null,
    volume !== null ? t('library.volume', { number: volume }) : null,
  ].filter(Boolean);
  const subtitle =
    subtitleParts.length > 0
      ? subtitleParts.join(' · ')
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
    if (selection.active) return;
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
      id: 'info',
      label: t('library.editInfo'),
      icon: Pencil,
      onSelect: () => setEditingInfo(true),
    },
    {
      id: 'collection',
      label: t('collections.addTo'),
      icon: FolderPlus,
      onSelect: () => setPickingCollection(true),
    },
    {
      id: 'optimize',
      label: t('optimize.action'),
      icon: Shrink,
      onSelect: () => setOptimizing(true),
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
        aria-pressed={selection.active ? selected : undefined}
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
          if (selection.active) selection.toggle([comicId]);
          else openComic(comicId, cover.current);
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
        {isRead && (
          <span className={styles.readBadge} aria-hidden="true">
            <Check size={13} strokeWidth={3} />
          </span>
        )}
        {selection.active && (
          <span className={styles.selectMark} data-selected={selected} aria-hidden="true">
            {selected && <CircleCheck size={26} strokeWidth={2} />}
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
            disabled={selection.active}
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
      {pickingCollection && (
        <CollectionPickerSheet
          comicIds={[comicId]}
          subtitle={title}
          onClose={() => setPickingCollection(false)}
        />
      )}
      {editingInfo && <ComicInfoSheet item={item} onClose={() => setEditingInfo(false)} />}
      {optimizing && <OptimizeSheet comicIds={[comicId]} onClose={() => setOptimizing(false)} />}
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
