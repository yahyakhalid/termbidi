import * as bidiModule from 'bidi-js';
import { applySgr, CLOSE_LINK, EMPTY_SGR, ERASE_LINE, linkTarget, RESET, sgrString, tokenize, } from './ansi.js';
import { hasArabic, shapeGraphemes } from './shape.js';
import { graphemes, graphemeWidth } from './width.js';
const loaded = bidiModule;
const bidiFactory = typeof loaded.default === 'function' ? loaded.default : bidiModule;
const bidi = bidiFactory();
const RTL_RE = /[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc\u200f\u202b\u202e\u2067]|[\u{10800}-\u{10fff}\u{1e800}-\u{1efff}]/u;
const WS_RE = /^[ \u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]+$/u;
/** True when the text contains characters from a right-to-left script. */
export function hasRtl(text) {
    return RTL_RE.test(text);
}
const JOINER_SPLIT_RE = /^(.+?)([\u200c\u200d]+)$/su;
const RTL_LETTER_RE = /^[\u0590-\u08ff]/;
/**
 * Grapheme segmentation attaches ZWNJ/ZWJ to the preceding letter. In Arabic
 * script they sit *between* letters, so they need their own cell to stay
 * between the same two letters after reordering. Emoji ZWJ sequences are
 * left intact.
 */
function splitJoiners(gs) {
    const out = [];
    for (const g of gs) {
        const m = JOINER_SPLIT_RE.exec(g);
        if (m && (g.includes('\u200c') || RTL_LETTER_RE.test(g))) {
            out.push(m[1]);
            for (const j of m[2])
                out.push(j);
        }
        else {
            out.push(g);
        }
    }
    return out;
}
function stateFrom(sgr) {
    return sgr ? applySgr(EMPTY_SGR, sgr) : EMPTY_SGR;
}
/**
 * Converts one line (no newline characters) from logical to visual order.
 * Returns the converted line and the style state at its end. Lines without
 * RTL characters, and lines with cursor movement, stray control characters
 * or malformed escape sequences, are returned unchanged.
 */
export function lineToVisual(line, carry = { sgr: '', link: '' }, opts = {}) {
    const tokens = tokenize(line);
    // Style state at the end of the line, needed whether or not we transform it.
    let state = stateFrom(carry.sgr);
    let link = carry.link;
    let unsupported = false;
    let erase = false;
    let charset = false;
    for (const t of tokens) {
        if (t.kind === 'sgr')
            state = applySgr(state, t.value);
        else if (t.kind === 'link')
            link = linkTarget(t.value) ? t.value : '';
        else if (t.kind === 'erase')
            erase = true;
        else if (t.kind === 'charset')
            charset = true;
        else if (t.kind === 'other')
            unsupported = true;
    }
    const end = { sgr: sgrString(state), link };
    if (unsupported || (!hasRtl(line) && opts.direction !== 'rtl'))
        return { text: line, carry: end };
    // Collect printable graphemes with the style that applies to each.
    const cells = [];
    state = stateFrom(carry.sgr);
    let style = carry.sgr;
    link = carry.link;
    for (const t of tokens) {
        if (t.kind === 'sgr') {
            state = applySgr(state, t.value);
            style = sgrString(state);
        }
        else if (t.kind === 'link') {
            link = linkTarget(t.value) ? t.value : '';
        }
        else if (t.kind === 'text') {
            for (const g of splitJoiners(graphemes(t.value)))
                cells.push({ g, style, link, level: 0 });
        }
    }
    if (cells.length === 0)
        return { text: line, carry: end };
    // Embedding levels from the Unicode Bidirectional Algorithm (UAX #9).
    const plain = cells.map((c) => c.g).join('');
    const direction = opts.direction ?? 'auto';
    const embedding = bidi.getEmbeddingLevels(plain, direction === 'auto' ? undefined : direction);
    const paragraphLevel = embedding.paragraphs[0]?.level ?? 0;
    const mirrors = bidi.getMirroredCharactersMap(plain, embedding.levels);
    let offset = 0;
    for (const c of cells) {
        c.level = embedding.levels[offset] ?? paragraphLevel;
        const mirrored = c.g.length === 1 ? mirrors.get(offset) : undefined;
        offset += c.g.length;
        if (mirrored)
            c.g = mirrored;
    }
    // L1: a tab (segment separator) and the whitespace before it take the
    // paragraph level, so tab-separated columns keep their order.
    for (let i = 0; i < cells.length; i++) {
        if (cells[i].g !== '\t')
            continue;
        cells[i].level = paragraphLevel;
        for (let k = i - 1; k >= 0 && WS_RE.test(cells[k].g); k--)
            cells[k].level = paragraphLevel;
    }
    // Shape Arabic-script letters while still in logical order.
    if ((opts.shape ?? true) && hasArabic(plain)) {
        const shaped = shapeGraphemes(cells.map((c) => c.g), { ligatures: opts.ligatures ?? false });
        shaped.forEach((g, i) => {
            cells[i].g = g;
        });
    }
    const tabSize = opts.tabSize ?? 8;
    const widthAt = (g, column) => (g === '\t' ? tabSize - (column % tabSize) : graphemeWidth(g));
    const measure = (seg) => seg.reduce((w, c) => w + widthAt(c.g, w), 0);
    // Wrap into display lines before reordering (UAX #9 rules L1 and L2 apply
    // per display line). The space a line breaks at is dropped.
    const ranges = [];
    const limit = opts.width && opts.width > 0 ? opts.width : 0;
    if (limit) {
        let start = 0;
        let w = 0;
        let lastSpace = -1;
        for (let i = 0; i < cells.length; i++) {
            const g = cells[i].g;
            if (w + widthAt(g, w) > limit && i > start) {
                if (g === ' ') {
                    ranges.push([start, i]);
                    start = i + 1;
                    w = 0;
                    lastSpace = -1;
                    continue;
                }
                if (lastSpace >= start) {
                    ranges.push([start, lastSpace]);
                    start = lastSpace + 1;
                }
                else {
                    ranges.push([start, i]);
                    start = i;
                }
                lastSpace = -1;
                for (let k = start; k < i; k++)
                    if (cells[k].g === ' ')
                        lastSpace = k;
                w = measure(cells.slice(start, i));
                if (w + widthAt(g, w) > limit && i > start) {
                    ranges.push([start, i]);
                    start = i;
                    w = 0;
                    lastSpace = -1;
                }
            }
            if (g === ' ')
                lastSpace = i;
            w += widthAt(g, w);
        }
        ranges.push([start, cells.length]);
    }
    else {
        ranges.push([0, cells.length]);
    }
    let out = charset ? '\x1b(B' : '';
    let curStyle = carry.sgr;
    let curLink = carry.link;
    let column = 0;
    const emit = (c) => {
        if (c.g === '')
            return;
        if (c.style !== curStyle) {
            out += c.style === '' ? RESET : curStyle === '' ? c.style : RESET + c.style;
            curStyle = c.style;
        }
        if (c.link !== curLink) {
            if (curLink)
                out += CLOSE_LINK;
            if (c.link)
                out += c.link;
            curLink = c.link;
        }
        if (c.g === '\t') {
            const n = tabSize - (column % tabSize);
            out += ' '.repeat(n);
            column += n;
        }
        else {
            out += c.g;
            column += graphemeWidth(c.g);
        }
    };
    ranges.forEach(([a, b], n) => {
        if (n > 0) {
            out += '\n';
            column = 0;
        }
        const seg = cells.slice(a, b);
        // L1: trailing whitespace takes the paragraph level.
        for (let k = seg.length - 1; k >= 0 && (WS_RE.test(seg[k].g) || seg[k].g === '\t'); k--) {
            seg[k].level = paragraphLevel;
        }
        // L2: reverse every run at or above each level, highest first.
        let max = 0;
        let lowestOdd = Infinity;
        for (const c of seg) {
            if (c.level > max)
                max = c.level;
            if (c.level % 2 === 1 && c.level < lowestOdd)
                lowestOdd = c.level;
        }
        for (let lvl = max; lvl >= lowestOdd && lvl > 0; lvl--) {
            let i = 0;
            while (i < seg.length) {
                if (seg[i].level >= lvl) {
                    let j = i;
                    while (j < seg.length && seg[j].level >= lvl)
                        j++;
                    const run = seg.slice(i, j).reverse();
                    seg.splice(i, j - i, ...run);
                    i = j;
                }
                else {
                    i++;
                }
            }
        }
        if (limit && opts.alignRtl && paragraphLevel % 2 === 1) {
            const w = measure(seg);
            // Padding takes the style the terminal had before the line.
            if (w < limit)
                emit({ g: ' '.repeat(limit - w), style: carry.sgr, link: carry.link, level: 0 });
        }
        for (const c of seg)
            emit(c);
    });
    if (curLink !== end.link) {
        if (curLink)
            out += CLOSE_LINK;
        if (end.link)
            out += end.link;
    }
    if (curStyle !== end.sgr)
        out += end.sgr === '' ? RESET : RESET + end.sgr;
    if (erase)
        out += ERASE_LINE;
    return { text: out, carry: end };
}
/**
 * Converts text (one or more lines) from logical to visual order for a
 * terminal that does not apply the bidirectional algorithm itself.
 */
export function toVisual(text, opts = {}) {
    const parts = text.split(/(\r?\n)/);
    let carry = { sgr: '', link: '' };
    let out = '';
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i % 2 === 1) {
            out += part;
            continue;
        }
        const res = lineToVisual(part, carry, opts);
        out += res.text;
        carry = res.carry;
    }
    return out;
}
