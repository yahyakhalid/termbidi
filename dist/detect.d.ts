export type BidiMode = 'reorder' | 'passthrough';
export interface Detection {
    /** `reorder`: the app should convert to visual order. `passthrough`: leave text as is. */
    mode: BidiMode;
    /** Whether Arabic letters should be replaced with joined presentation forms. */
    shape: boolean;
    /** Name of the terminal that was recognised, or `unknown`. */
    terminal: string;
    /** How the decision was made, for logs and bug reports. */
    reason: string;
}
type Env = Record<string, string | undefined>;
/**
 * Detects how RTL text should be handled from the environment only. Fast and
 * synchronous; does not talk to the terminal.
 */
export declare function detect(env?: Env): Detection;
export interface QueryOptions {
    input?: NodeJS.ReadStream;
    output?: NodeJS.WriteStream;
    /** Milliseconds to wait for an answer. Default 150. */
    timeout?: number;
}
/**
 * Result of asking the terminal for its BiDi mode with DECRQM (`CSI 8 $ p`).
 * - `implicit`: the terminal reorders text itself (BDSM set). You can turn
 *   that off with `disableTerminalBidi()` and reorder yourself.
 * - `explicit`: the terminal supports BDSM but is not reordering.
 * - `unsupported`: the terminal answered that it does not know the mode.
 * - `no-answer`: no reply in time (many terminals do not answer).
 */
export type BidiQueryResult = 'implicit' | 'explicit' | 'unsupported' | 'no-answer';
export declare function queryTerminal(opts?: QueryOptions): Promise<BidiQueryResult>;
/** Sequence that switches a BDSM-capable terminal to explicit mode (no reordering). */
export declare const DISABLE_TERMINAL_BIDI = "\u001B[8l";
/** Sequence that restores implicit BiDi in a BDSM-capable terminal. */
export declare const ENABLE_TERMINAL_BIDI = "\u001B[8h";
export {};
