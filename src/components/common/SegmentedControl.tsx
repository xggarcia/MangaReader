import { useId, type CSSProperties } from 'react';
import { haptics } from '../../shared/infrastructure/haptics';
import styles from './SegmentedControl.module.css';

interface SegmentedControlProps<T extends string> {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Hides the legend visually (still announced). */
  hideLegend?: boolean;
}

/**
 * iOS segmented control: a raised thumb slides to the selected segment with a spring.
 * Built on a radio group, so it is keyboard and screen-reader friendly.
 */
export function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
  disabled = false,
  hideLegend = false,
}: SegmentedControlProps<T>) {
  const name = useId();
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <fieldset className={styles.group} disabled={disabled}>
      <legend className={hideLegend ? 'visually-hidden' : styles.legend}>{legend}</legend>
      <div
        className={styles.track}
        style={{ '--count': options.length, '--index': index } as CSSProperties}
      >
        <span className={styles.thumb} aria-hidden="true" />
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => {
                haptics.selection();
                onChange(option.value);
              }}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
