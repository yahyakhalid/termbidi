export type TokenKind = 
/** Printable text. */
'text'
/** Select Graphic Rendition (colors, bold, ...). */
 | 'sgr'
/** OSC 8 hyperlink (open or close). */
 | 'link'
/** Erase in line (`CSI K`, `CSI 0K`), as printed by grep and gcc after colors. */
 | 'erase'
/** Designate ASCII as G0 (`ESC ( B`), part of `tput sgr0`. */
 | 'charset'
/** Anything else: cursor movement, controls, malformed sequences. */
 | 'other';
export interface Token {
    kind: TokenKind;
    value: string;
}
/**
 * Tokenizes a single line. Only well-formed sequences are recognised; any
 * stray control character (C0 except tab, DEL, or C1) or malformed sequence
 * becomes an `other` token, which makes callers leave the line untouched.
 */
export declare function tokenize(line: string): Token[];
/** Structured SGR state. Two equal states always serialize to the same key. */
export interface SgrState {
    fg: string;
    bg: string;
    ul: string;
    attrs: Map<string, string>;
}
export declare const EMPTY_SGR: SgrState;
/** Applies one SGR sequence (`ESC [ ... m`) to a state and returns the new state. */
export declare function applySgr(state: SgrState, seq: string): SgrState;
/** Serializes a state to a minimal SGR sequence ('' for the default state). */
export declare function sgrString(state: SgrState): string;
/** Returns the URL of an OSC 8 sequence, or '' when it closes a link. */
export declare function linkTarget(seq: string): string;
export declare const CLOSE_LINK = "\u001B]8;;\u001B\\";
export declare const RESET = "\u001B[0m";
export declare const ERASE_LINE = "\u001B[K";
