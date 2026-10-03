const UNITS = [
  { unit: 'gigabyte', size: 1e9 },
  { unit: 'megabyte', size: 1e6 },
  { unit: 'kilobyte', size: 1e3 },
] as const;

/** Human-readable storage size in the given language ("9,8 GB", "350 MB"). */
export function formatBytes(bytes: number, language: string): string {
  const { unit, size } = UNITS.find((candidate) => bytes >= candidate.size) ?? UNITS[2];
  const value = bytes / size;
  return new Intl.NumberFormat(language, {
    style: 'unit',
    unit,
    maximumFractionDigits: value < 10 && unit === 'gigabyte' ? 1 : 0,
  }).format(value);
}
