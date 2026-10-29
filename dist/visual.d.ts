export type Direction = 'auto' | 'ltr' | 'rtl';
export interface VisualOptions {
    /**
     * Base direction of each line. `auto` (default) follows the first strong
     * character, as the Unicode Bidirectional Algorithm does.
     */
    direction?: Direction;
    /**
     * Replace Arabic-script letters with their joined presentation forms, for
     * terminals that draw every cell separately. Default `true`.
     */
    shape?: boolean;
    /** Merge lam + alef into one cell (changes the line width). Default `false`. */
    ligatures?: boolean;
    /**
     * Wrap lines to this many columns *before* reordering, so long RTL lines
     * read top to bottom. Default: no wrapping.
     */
    width?: number;
    /**
     * With `width`, right-align lines whose base direction is RTL.
     * Default `false`.
     */
    alignRtl?: boolean;
    /** Spaces per tab stop when expanding tabs. Default 8. */
    tabSize?: number;
}
/**
 * Style carried from one line to the next: the SGR state as a minimal
 * sequence ('' for default) and the open OSC 8 hyperlink ('' for none).
 */
export interface CarryState {
    sgr: string;
    link: string;
}
/** True when the text contains characters from a right-to-left script. */
export declare function hasRtl(text: string): boolean;
/**
 * Converts one line (no newline characters) from logical to visual order.
 * Returns the converted line and the style state at its end. Lines without
 * RTL characters, and lines with cursor movement, stray control characters
 * or malformed escape sequences, are returned unchanged.
 */
export declare function lineToVisual(line: string, carry?: CarryState, opts?: VisualOptions): {
    text: string;
    carry: CarryState;
};
/**
 * Converts text (one or more lines) from logical to visual order for a
 * terminal that does not apply the bidirectional algorithm itself.
 */
export declare function toVisual(text: string, opts?: VisualOptions): string;
