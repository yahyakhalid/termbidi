export { toVisual, lineToVisual, hasRtl } from './visual.js';
export { createVisualStream } from './stream.js';
export { detect, queryTerminal, DISABLE_TERMINAL_BIDI, ENABLE_TERMINAL_BIDI, } from './detect.js';
export { shapeGraphemes, hasArabic } from './shape.js';
export { graphemeWidth, textWidth } from './width.js';
import { detect } from './detect.js';
import { toVisual } from './visual.js';
/**
 * Convenience wrapper: converts text for the current terminal, or returns it
 * unchanged when the terminal reorders RTL text itself (or `TERMBIDI=off`).
 */
export function forTerminal(text, opts = {}, env = process.env) {
    const d = detect(env);
    if (d.mode === 'passthrough')
        return text;
    return toVisual(text, { shape: d.shape, ...opts });
}
