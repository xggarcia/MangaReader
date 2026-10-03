import type { CollectionColor } from '../../modules/library/domain/Collection';

/** iOS system colours used to tint collections (magenta is the app accent). */
export const COLLECTION_COLOR_VALUES: Readonly<Record<CollectionColor, string>> = {
  magenta: '#c2185b',
  red: '#ff3b30',
  orange: '#ff9500',
  yellow: '#ffcc00',
  green: '#34c759',
  teal: '#30b0c7',
  blue: '#007aff',
  indigo: '#5856d6',
  purple: '#af52de',
  graphite: '#8e8e93',
};
