import { Transform } from 'node:stream';
import { StringDecoder } from 'node:string_decoder';
import { lineToVisual } from './visual.js';
const MAX_PENDING = 64 * 1024;
/**
 * A Transform stream that converts complete lines to visual order as they
 * arrive. A partial last line is held until its newline arrives or the
 * stream ends.
 */
export function createVisualStream(opts = {}) {
    const decoder = new StringDecoder('utf8');
    let pending = '';
    let carry = { sgr: '', link: '' };
    const convert = (line) => {
        const res = lineToVisual(line, carry, opts);
        carry = res.carry;
        return res.text;
    };
    return new Transform({
        transform(chunk, _enc, cb) {
            pending += typeof chunk === 'string' ? chunk : decoder.write(chunk);
            let out = '';
            let nl = pending.indexOf('\n');
            while (nl !== -1) {
                const hasCr = nl > 0 && pending[nl - 1] === '\r';
                const line = pending.slice(0, hasCr ? nl - 1 : nl);
                out += convert(line) + (hasCr ? '\r\n' : '\n');
                pending = pending.slice(nl + 1);
                nl = pending.indexOf('\n');
            }
            // Progress output redraws one line with `\r` and may never send a
            // newline. Such text is passed through unchanged anyway, so everything
            // up to the last `\r` can go out now instead of waiting.
            const cr = pending.lastIndexOf('\r');
            if (cr !== -1 && cr < pending.length - 1) {
                out += convert(pending.slice(0, cr + 1));
                pending = pending.slice(cr + 1);
            }
            // Never hold an unbounded amount of text without a newline.
            if (pending.length > MAX_PENDING) {
                out += convert(pending);
                pending = '';
            }
            cb(null, out);
        },
        flush(cb) {
            pending += decoder.end();
            cb(null, pending ? convert(pending) : '');
        },
    });
}
