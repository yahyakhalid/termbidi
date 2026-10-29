import { Transform } from 'node:stream';
import { type VisualOptions } from './visual.js';
/**
 * A Transform stream that converts complete lines to visual order as they
 * arrive. A partial last line is held until its newline arrives or the
 * stream ends.
 */
export declare function createVisualStream(opts?: VisualOptions): Transform;
