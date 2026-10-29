export { toVisual, lineToVisual, hasRtl } from './visual.js';
export type { VisualOptions, Direction, CarryState } from './visual.js';
export { createVisualStream } from './stream.js';
export { detect, queryTerminal, DISABLE_TERMINAL_BIDI, ENABLE_TERMINAL_BIDI, } from './detect.js';
export type { Detection, BidiMode, BidiQueryResult, QueryOptions } from './detect.js';
export { shapeGraphemes, hasArabic } from './shape.js';
export { graphemeWidth, textWidth } from './width.js';
import { type VisualOptions } from './visual.js';
/**
 * Convenience wrapper: converts text for the current terminal, or returns it
 * unchanged when the terminal reorders RTL text itself (or `TERMBIDI=off`).
 */
export declare function forTerminal(text: string, opts?: VisualOptions, env?: NodeJS.ProcessEnv): string;
