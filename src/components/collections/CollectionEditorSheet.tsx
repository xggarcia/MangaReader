import { Check } from 'lucide-react';
import { useId, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import {
  COLLECTION_COLORS,
  MAX_COLLECTION_NAME_LENGTH,
  type CollectionColor,
} from '../../modules/library/domain/Collection';
import { haptics } from '../../shared/infrastructure/haptics';
import controls from '../ui/Controls.module.css';
import { Sheet } from '../ui/Sheet';
import { COLLECTION_COLOR_VALUES } from './collectionColors';
import styles from './Collections.module.css';

interface CollectionEditorSheetProps {
  title: string;
  initialName?: string;
  initialColor?: CollectionColor;
  onSave: (values: { name: string; color: CollectionColor }) => void;
  onClose: () => void;
}

/** Name and colour of a collection, in an iOS sheet. Used to create and to edit. */
export function CollectionEditorSheet({
  title,
  initialName = '',
  initialColor = 'magenta',
  onSave,
  onClose,
}: CollectionEditorSheetProps) {
  const { t } = useTranslation();
  const sheetId = useId();
  const nameId = useId();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<CollectionColor>(initialColor);
  const trimmed = name.trim();

  const save = () => {
    if (!trimmed) return;
    haptics.success();
    onSave({ name: trimmed, color });
    document.getElementById(sheetId)?.hidePopover();
  };

  return (
    <Sheet id={sheetId} title={title} closeLabel={t('library.cancel')} autoOpen onClose={onClose}>
      <form
        className={styles.editor}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <label htmlFor={nameId} className="visually-hidden">
          {t('collections.name')}
        </label>
        <input
          id={nameId}
          className={styles.nameField}
          value={name}
          maxLength={MAX_COLLECTION_NAME_LENGTH}
          placeholder={t('collections.namePlaceholder')}
          onChange={(event) => setName(event.target.value)}
          autoComplete="off"
          enterKeyHint="done"
        />
        <fieldset className={styles.colors}>
          <legend className="visually-hidden">{t('collections.color')}</legend>
          {COLLECTION_COLORS.map((option) => (
            <label
              key={option}
              className={styles.swatch}
              style={{ '--swatch': COLLECTION_COLOR_VALUES[option] } as CSSProperties}
            >
              <input
                type="radio"
                name={`${sheetId}-color`}
                value={option}
                checked={color === option}
                onChange={() => {
                  haptics.selection();
                  setColor(option);
                }}
                aria-label={t(`collections.colors.${option}`)}
              />
              <span aria-hidden="true">
                {color === option && <Check size={18} strokeWidth={3} />}
              </span>
            </label>
          ))}
        </fieldset>
        <button type="submit" className={controls.filledButton} disabled={!trimmed}>
          {t('collections.save')}
        </button>
      </form>
    </Sheet>
  );
}
