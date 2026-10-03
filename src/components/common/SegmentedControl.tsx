import { useId } from 'react';
import styles from './SegmentedControl.module.css';

interface SegmentedControlProps<T extends string> {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Radio group styled as segmented buttons; keyboard and screen-reader friendly. */
export function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
  disabled = false,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset className={styles.group} disabled={disabled}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {options.map((option) => (
          <label key={option.value} className={styles.option}>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
