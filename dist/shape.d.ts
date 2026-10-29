export declare function hasArabic(text: string): boolean;
export interface ShapeOptions {
    /** Merge lam + alef into one cell. Changes the column count of the line. */
    ligatures?: boolean;
}
/**
 * Shapes graphemes in logical order. Returns an array of the same length; a
 * grapheme swallowed by a lam-alef ligature becomes ''.
 */
export declare function shapeGraphemes(gs: string[], opts?: ShapeOptions): string[];
