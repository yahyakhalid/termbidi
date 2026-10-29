// Splits a line into printable text and escape sequences, and keeps the SGR
// style that applies to each printable character as a structured state, so
// the output contains only sequences rebuilt from known parameters.

const ESC = '\x1b';
const BEL = '\x07';

export type TokenKind =
  /** Printable text. */
  | 'text'
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

function isParam(code: number) {
  return code >= 0x30 && code <= 0x3f;
}
function isIntermediate(code: number) {
  return code >= 0x20 && code <= 0x2f;
}
function isFinal(code: number) {
  return code >= 0x40 && code <= 0x7e;
}

/**
 * Tokenizes a single line. Only well-formed sequences are recognised; any
 * stray control character (C0 except tab, DEL, or C1) or malformed sequence
 * becomes an `other` token, which makes callers leave the line untouched.
 */
export function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let text = '';
  let i = 0;
  const flush = () => {
    if (text) {
      tokens.push({ kind: 'text', value: text });
      text = '';
    }
  };

  while (i < line.length) {
    const ch = line[i]!;
    const code = line.charCodeAt(i);

    if (ch === ESC) {
      flush();
      const next = line[i + 1];

      if (next === '[') {
        // CSI: parameters 0x30–0x3F, intermediates 0x20–0x2F, final 0x40–0x7E
        let j = i + 2;
        while (j < line.length && isParam(line.charCodeAt(j))) j++;
        const paramsEnd = j;
        while (j < line.length && isIntermediate(line.charCodeAt(j))) j++;
        if (j >= line.length || !isFinal(line.charCodeAt(j))) {
          tokens.push({ kind: 'other', value: line.slice(i, j) });
          i = j;
          continue;
        }
        const seq = line.slice(i, j + 1);
        const params = line.slice(i + 2, paramsEnd);
        const hasIntermediate = j > paramsEnd;
        const final = line[j];
        let kind: TokenKind = 'other';
        if (final === 'm' && !hasIntermediate && /^[0-9;:]*$/.test(params)) kind = 'sgr';
        else if (final === 'K' && !hasIntermediate && (params === '' || params === '0')) kind = 'erase';
        tokens.push({ kind, value: seq });
        i = j + 1;
        continue;
      }

      if (next === ']') {
        // OSC: ends with BEL or ESC \. Any other control inside is malformed.
        let j = i + 2;
        let end = -1;
        let termLen = 0;
        while (j < line.length) {
          const c = line.charCodeAt(j);
          if (c === 0x07) {
            end = j;
            termLen = 1;
            break;
          }
          if (c === 0x1b) {
            if (line[j + 1] === '\\') {
              end = j;
              termLen = 2;
            }
            break;
          }
          if (c < 0x20 || (c >= 0x7f && c <= 0x9f)) break;
          j++;
        }
        if (end === -1) {
          tokens.push({ kind: 'other', value: line.slice(i, j) });
          i = j;
          continue;
        }
        const seq = line.slice(i, end + termLen);
        const body = line.slice(i + 2, end);
        tokens.push({ kind: /^8;[^;]*;/.test(body) ? 'link' : 'other', value: seq });
        i = end + termLen;
        continue;
      }

      // Other escape sequences: ESC, intermediates 0x20–0x2F, final 0x30–0x7E.
      let j = i + 1;
      while (j < line.length && isIntermediate(line.charCodeAt(j))) j++;
      const fc = line.charCodeAt(j);
      if (j < line.length && fc >= 0x30 && fc <= 0x7e) {
        const seq = line.slice(i, j + 1);
        tokens.push({ kind: seq === `${ESC}(B` ? 'charset' : 'other', value: seq });
        i = j + 1;
      } else {
        tokens.push({ kind: 'other', value: line.slice(i, j) || ESC });
        i = Math.max(j, i + 1);
      }
      continue;
    }

    if ((code < 0x20 && ch !== '\t') || (code >= 0x7f && code <= 0x9f)) {
      flush();
      tokens.push({ kind: 'other', value: ch });
      i++;
      continue;
    }
    text += ch;
    i++;
  }
  flush();
  return tokens;
}

// ---------------------------------------------------------------------------
// SGR state

/** Structured SGR state. Two equal states always serialize to the same key. */
export interface SgrState {
  fg: string;
  bg: string;
  ul: string;
  attrs: Map<string, string>;
}

export const EMPTY_SGR: SgrState = Object.freeze({ fg: '', bg: '', ul: '', attrs: new Map() }) as SgrState;

// attribute group -> code that sets it (groups are cleared together)
const ATTR_GROUP: Record<string, string> = {
  '1': 'weight',
  '2': 'weight',
  '3': 'italic',
  '4': 'underline',
  '21': 'underline',
  '5': 'blink',
  '6': 'blink',
  '7': 'inverse',
  '8': 'hidden',
  '9': 'strike',
  '53': 'overline',
  '51': 'frame',
  '52': 'frame',
};
const ATTR_RESET: Record<string, string[]> = {
  '22': ['weight'],
  '23': ['italic'],
  '24': ['underline'],
  '25': ['blink'],
  '27': ['inverse'],
  '28': ['hidden'],
  '29': ['strike'],
  '54': ['frame'],
  '55': ['overline'],
};

function cloneState(s: SgrState): SgrState {
  return { fg: s.fg, bg: s.bg, ul: s.ul, attrs: new Map(s.attrs) };
}

/** Reads an extended color (`38;5;n`, `38;2;r;g;b` or colon forms). Returns [value, consumed]. */
function extendedColor(parts: string[], k: number): [string, number] {
  const head = parts[k]!;
  if (head.includes(':')) return [head, 1]; // 38:2::r:g:b, kept as written
  const mode = parts[k + 1];
  if (mode === '5' && parts[k + 2] !== undefined) return [`${head};5;${parts[k + 2]}`, 3];
  if (mode === '2' && parts[k + 4] !== undefined) {
    return [`${head};2;${parts[k + 2]};${parts[k + 3]};${parts[k + 4]}`, 5];
  }
  return ['', parts.length - k]; // malformed: ignore the rest
}

/** Applies one SGR sequence (`ESC [ ... m`) to a state and returns the new state. */
export function applySgr(state: SgrState, seq: string): SgrState {
  const params = seq.slice(2, -1);
  const parts = params === '' ? ['0'] : params.split(';');
  const next = cloneState(state);
  for (let k = 0; k < parts.length; ) {
    const p = parts[k]!;
    const base = p.split(':')[0]!;
    const n = base === '' ? 0 : Number(base);
    if (n === 0) {
      next.fg = '';
      next.bg = '';
      next.ul = '';
      next.attrs.clear();
      k++;
    } else if (base === '38' || base === '48' || base === '58') {
      const [value, used] = extendedColor(parts, k);
      if (value) {
        if (base === '38') next.fg = value;
        else if (base === '48') next.bg = value;
        else next.ul = value;
      }
      k += used;
    } else if ((n >= 30 && n <= 37) || (n >= 90 && n <= 97)) {
      next.fg = p;
      k++;
    } else if ((n >= 40 && n <= 47) || (n >= 100 && n <= 107)) {
      next.bg = p;
      k++;
    } else if (n === 39) {
      next.fg = '';
      k++;
    } else if (n === 49) {
      next.bg = '';
      k++;
    } else if (n === 59) {
      next.ul = '';
      k++;
    } else if (ATTR_GROUP[base]) {
      // `4:3` (curly underline) and friends are kept with their sub-parameter
      if (p === '4:0') next.attrs.delete('underline');
      else next.attrs.set(ATTR_GROUP[base]!, p);
      k++;
    } else if (ATTR_RESET[base]) {
      for (const g of ATTR_RESET[base]!) next.attrs.delete(g);
      k++;
    } else {
      k++; // unknown parameter: ignored, never echoed
    }
  }
  return next;
}

const GROUP_ORDER = ['weight', 'italic', 'underline', 'blink', 'inverse', 'hidden', 'strike', 'overline', 'frame'];

/** Serializes a state to a minimal SGR sequence ('' for the default state). */
export function sgrString(state: SgrState): string {
  const parts: string[] = [];
  for (const g of GROUP_ORDER) {
    const v = state.attrs.get(g);
    if (v) parts.push(v);
  }
  if (state.fg) parts.push(state.fg);
  if (state.bg) parts.push(state.bg);
  if (state.ul) parts.push(state.ul);
  return parts.length ? `${ESC}[${parts.join(';')}m` : '';
}

// ---------------------------------------------------------------------------
// OSC 8

/** Returns the URL of an OSC 8 sequence, or '' when it closes a link. */
export function linkTarget(seq: string): string {
  const body = seq.slice(2);
  const cleaned = body.endsWith(BEL) ? body.slice(0, -1) : body.endsWith(`${ESC}\\`) ? body.slice(0, -2) : body;
  // OSC 8 ; params ; URI
  return cleaned.split(';').slice(2).join(';');
}

export const CLOSE_LINK = `${ESC}]8;;${ESC}\\`;
export const RESET = `${ESC}[0m`;
export const ERASE_LINE = `${ESC}[K`;
