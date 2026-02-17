import React from 'react';
import useIsBrowser from '@docusaurus/useIsBrowser';
import styles from './styles.module.css';

type ColorModeChoice = 'light' | 'dark' | null;

interface Props {
  readonly className?: string;
  readonly buttonClassName?: string;
  readonly respectPrefersColorScheme: boolean;
  readonly value: ColorModeChoice;
  readonly onChange: (colorMode: ColorModeChoice) => void;
}

interface OptionDef {
  value: ColorModeChoice;
  label: string;
  icon: React.ReactNode;
}

const options: OptionDef[] = [
  {
    value: null,
    label: 'Auto',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M5 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 11v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1.06 1.06M11.54 11.54l1.06 1.06M3.4 12.6l1.06-1.06M11.54 4.46l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M13.36 10.06A6 6 0 015.94 2.64 6 6 0 1013.36 10.06z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
];

function ColorModeToggle({value, onChange}: Props): React.ReactElement {
  const isBrowser = useIsBrowser();

  // Before hydration, default to "Auto" to avoid flashing
  const choice = isBrowser ? value : null;
  const activeLabel = options.find((o) => o.value === choice)?.label ?? 'Auto';

  return (
    <div className={styles.pill} role="radiogroup" aria-label="Color mode">
      {options.map(({value: optValue, label, icon}) => {
        const isActive = choice === optValue;
        return (
          <button
            key={label}
            role="radio"
            aria-checked={isActive}
            aria-label={label}
            title={label}
            className={`${styles.option} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(optValue)}
            disabled={!isBrowser}
            type="button"
          >
            <span className={styles.icon}>{icon}</span>
          </button>
        );
      })}
      <span className={styles.label}>{activeLabel}</span>
    </div>
  );
}

export default React.memo(ColorModeToggle);
