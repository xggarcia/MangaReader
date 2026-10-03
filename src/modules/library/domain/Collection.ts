export const COLLECTION_COLORS = [
  'magenta',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'indigo',
  'purple',
  'graphite',
] as const;
export type CollectionColor = (typeof COLLECTION_COLORS)[number];

export const MAX_COLLECTION_NAME_LENGTH = 60;

export interface CollectionPrimitive {
  id: string;
  name: string;
  color: CollectionColor;
  /** Comics in the order the user added them. */
  comicIds: string[];
  /** Epoch milliseconds. */
  createdAt: number;
}

/** A user-made group of comics (Panels-style folder) with a name and a colour. Immutable. */
export class Collection {
  private constructor(private readonly data: Readonly<CollectionPrimitive>) {}

  static create(props: CollectionPrimitive): Collection {
    Collection.ensureIsValid(props);
    return new Collection({
      ...props,
      name: props.name.trim(),
      comicIds: [...new Set(props.comicIds)],
    });
  }

  static fromPrimitive(data: CollectionPrimitive): Collection {
    return Collection.create(data);
  }

  static isColor(value: unknown): value is CollectionColor {
    return typeof value === 'string' && (COLLECTION_COLORS as readonly string[]).includes(value);
  }

  static ensureIsValid(props: CollectionPrimitive): void {
    if (props.id.trim() === '') throw new Error('[Collection] id must not be empty');
    const name = props.name.trim();
    if (name === '') throw new Error('[Collection] name must not be empty');
    if (name.length > MAX_COLLECTION_NAME_LENGTH) {
      throw new Error(
        `[Collection] name must have at most ${MAX_COLLECTION_NAME_LENGTH} characters`,
      );
    }
    if (!Collection.isColor(props.color)) {
      throw new Error(`[Collection] Unknown color: ${String(props.color)}`);
    }
  }

  getId(): string {
    return this.data.id;
  }

  getName(): string {
    return this.data.name;
  }

  getColor(): CollectionColor {
    return this.data.color;
  }

  getComicIds(): string[] {
    return [...this.data.comicIds];
  }

  getCreatedAt(): number {
    return this.data.createdAt;
  }

  count(): number {
    return this.data.comicIds.length;
  }

  contains(comicId: string): boolean {
    return this.data.comicIds.includes(comicId);
  }

  rename(name: string): Collection {
    return Collection.create({ ...this.data, name });
  }

  withColor(color: CollectionColor): Collection {
    return Collection.create({ ...this.data, color });
  }

  /** Adds comics at the end, ignoring the ones already in the collection. */
  addComics(comicIds: readonly string[]): Collection {
    return Collection.create({ ...this.data, comicIds: [...this.data.comicIds, ...comicIds] });
  }

  removeComic(comicId: string): Collection {
    return Collection.create({
      ...this.data,
      comicIds: this.data.comicIds.filter((id) => id !== comicId),
    });
  }

  toPrimitive(): CollectionPrimitive {
    return { ...this.data, comicIds: [...this.data.comicIds] };
  }

  equals(other: Collection): boolean {
    return this.data.id === other.data.id;
  }
}
