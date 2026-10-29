// Arabic-script contextual shaping for terminals that draw each cell on its
// own. Letters are replaced with their Unicode presentation forms (isolated,
// final, initial, medial), chosen from the joining type of their neighbours.
// Covers Arabic, Persian, Urdu and the Kurdish (Sorani) letters that have
// presentation forms; letters without encoded forms keep their base code
// point but still join with their neighbours.

type JoiningType = 'D' | 'R' | 'C' | 'U';

interface Forms {
  type: JoiningType;
  // isolated, final, initial, medial (null when not encoded)
  forms: [number | null, number | null, number | null, number | null];
}

const TABLE = new Map<number, Forms>();

function dual(cp: number, iso: number, fin: number, ini: number, med: number) {
  TABLE.set(cp, { type: 'D', forms: [iso, fin, ini, med] });
}
function right(cp: number, iso: number | null, fin: number | null) {
  TABLE.set(cp, { type: 'R', forms: [iso, fin, null, null] });
}
function dualNoForms(cp: number) {
  TABLE.set(cp, { type: 'D', forms: [null, null, null, null] });
}

// Arabic block, Presentation Forms-B
TABLE.set(0x0621, { type: 'U', forms: [0xfe80, null, null, null] });
right(0x0622, 0xfe81, 0xfe82);
right(0x0623, 0xfe83, 0xfe84);
right(0x0624, 0xfe85, 0xfe86);
right(0x0625, 0xfe87, 0xfe88);
dual(0x0626, 0xfe89, 0xfe8a, 0xfe8b, 0xfe8c);
right(0x0627, 0xfe8d, 0xfe8e);
dual(0x0628, 0xfe8f, 0xfe90, 0xfe91, 0xfe92);
right(0x0629, 0xfe93, 0xfe94);
dual(0x062a, 0xfe95, 0xfe96, 0xfe97, 0xfe98);
dual(0x062b, 0xfe99, 0xfe9a, 0xfe9b, 0xfe9c);
dual(0x062c, 0xfe9d, 0xfe9e, 0xfe9f, 0xfea0);
dual(0x062d, 0xfea1, 0xfea2, 0xfea3, 0xfea4);
dual(0x062e, 0xfea5, 0xfea6, 0xfea7, 0xfea8);
right(0x062f, 0xfea9, 0xfeaa);
right(0x0630, 0xfeab, 0xfeac);
right(0x0631, 0xfead, 0xfeae);
right(0x0632, 0xfeaf, 0xfeb0);
dual(0x0633, 0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4);
dual(0x0634, 0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8);
dual(0x0635, 0xfeb9, 0xfeba, 0xfebb, 0xfebc);
dual(0x0636, 0xfebd, 0xfebe, 0xfebf, 0xfec0);
dual(0x0637, 0xfec1, 0xfec2, 0xfec3, 0xfec4);
dual(0x0638, 0xfec5, 0xfec6, 0xfec7, 0xfec8);
dual(0x0639, 0xfec9, 0xfeca, 0xfecb, 0xfecc);
dual(0x063a, 0xfecd, 0xfece, 0xfecf, 0xfed0);
TABLE.set(0x0640, { type: 'C', forms: [null, null, null, null] }); // tatweel
dual(0x0641, 0xfed1, 0xfed2, 0xfed3, 0xfed4);
dual(0x0642, 0xfed5, 0xfed6, 0xfed7, 0xfed8);
dual(0x0643, 0xfed9, 0xfeda, 0xfedb, 0xfedc);
dual(0x0644, 0xfedd, 0xfede, 0xfedf, 0xfee0);
dual(0x0645, 0xfee1, 0xfee2, 0xfee3, 0xfee4);
dual(0x0646, 0xfee5, 0xfee6, 0xfee7, 0xfee8);
dual(0x0647, 0xfee9, 0xfeea, 0xfeeb, 0xfeec);
right(0x0648, 0xfeed, 0xfeee);
dual(0x0649, 0xfeef, 0xfef0, 0xfbe8, 0xfbe9);
dual(0x064a, 0xfef1, 0xfef2, 0xfef3, 0xfef4);

// Persian, Urdu and Kurdish letters, Presentation Forms-A
dual(0x067e, 0xfb56, 0xfb57, 0xfb58, 0xfb59); // peh
dual(0x0686, 0xfb7a, 0xfb7b, 0xfb7c, 0xfb7d); // tcheh
right(0x0698, 0xfb8a, 0xfb8b); // jeh
dual(0x06a9, 0xfb8e, 0xfb8f, 0xfb90, 0xfb91); // keheh
dual(0x06af, 0xfb92, 0xfb93, 0xfb94, 0xfb95); // gaf
dual(0x06cc, 0xfbfc, 0xfbfd, 0xfbfe, 0xfbff); // farsi yeh
dual(0x0679, 0xfb66, 0xfb67, 0xfb68, 0xfb69); // tteh
right(0x0688, 0xfb88, 0xfb89); // ddal
right(0x0691, 0xfb8c, 0xfb8d); // rreh
// noon ghunna: only isolated and final forms are encoded
TABLE.set(0x06ba, { type: 'D', forms: [0xfb9e, 0xfb9f, null, null] });
dual(0x06c1, 0xfba6, 0xfba7, 0xfba8, 0xfba9); // heh goal
dual(0x06be, 0xfbaa, 0xfbab, 0xfbac, 0xfbad); // heh doachashmee
right(0x06d2, 0xfbae, 0xfbaf); // yeh barree
right(0x06d3, 0xfbb0, 0xfbb1); // yeh barree with hamza
dual(0x06a4, 0xfb6a, 0xfb6b, 0xfb6c, 0xfb6d); // veh
right(0x06c6, 0xfbd9, 0xfbda); // oe (Kurdish)
right(0x06c7, 0xfbd7, 0xfbd8); // u
right(0x0695, null, null); // reh with small v below (Kurdish)
right(0x06d5, null, null); // ae (Kurdish)
dualNoForms(0x06ce); // yeh with small v (Kurdish)
dualNoForms(0x06b5); // lam with small v (Kurdish)
dualNoForms(0x06a7); // qaf with dot above (Maghrebi)
right(0x0671, 0xfb50, 0xfb51); // alef wasla
right(0x06c0, 0xfba4, 0xfba5); // heh with yeh above (Persian)
dual(0x06d0, 0xfbe4, 0xfbe5, 0xfbe6, 0xfbe7); // e (Uyghur, Pashto)
right(0x06c8, 0xfbdb, 0xfbdc); // yu
right(0x06cb, 0xfbde, 0xfbdf); // ve
right(0x06c5, 0xfbe0, 0xfbe1); // kirghiz oe
dual(0x06ad, 0xfbd3, 0xfbd4, 0xfbd5, 0xfbd6); // ng
dualNoForms(0x066e); // dotless beh
dualNoForms(0x066f); // dotless qaf

TABLE.set(0x200d, { type: 'C', forms: [null, null, null, null] }); // ZWJ
TABLE.set(0x200c, { type: 'U', forms: [null, null, null, null] }); // ZWNJ

// lam + alef variants -> [isolated, final] ligature
const LAM_ALEF = new Map<number, [number, number]>([
  [0x0622, [0xfef5, 0xfef6]],
  [0x0623, [0xfef7, 0xfef8]],
  [0x0625, [0xfef9, 0xfefa]],
  [0x0627, [0xfefb, 0xfefc]],
]);

// Joining type T in ArabicShaping.txt: marks and format characters (soft
// hyphen, LRM/RLM, bidi controls) do not break the join between letters.
const TRANSPARENT = /^[\p{Mn}\p{Me}\p{Cf}]$/u;

function baseOf(g: string): number {
  return g.codePointAt(0) ?? 0;
}

function joiningType(g: string | undefined): JoiningType | 'T' | null {
  if (g === undefined) return null;
  const cp = baseOf(g);
  const entry = TABLE.get(cp);
  if (entry) return entry.type;
  if (TRANSPARENT.test(String.fromCodePoint(cp))) return 'T';
  return null;
}

const ARABIC_RE = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/;

export function hasArabic(text: string): boolean {
  return ARABIC_RE.test(text);
}

export interface ShapeOptions {
  /** Merge lam + alef into one cell. Changes the column count of the line. */
  ligatures?: boolean;
}

/**
 * Shapes graphemes in logical order. Returns an array of the same length; a
 * grapheme swallowed by a lam-alef ligature becomes ''.
 */
export function shapeGraphemes(gs: string[], opts: ShapeOptions = {}): string[] {
  const out = gs.slice();

  const prevJoiner = (i: number): boolean => {
    for (let k = i - 1; k >= 0; k--) {
      const t = joiningType(gs[k]);
      if (t === 'T') continue;
      return t === 'D' || t === 'C';
    }
    return false;
  };
  const nextJoiner = (i: number): boolean => {
    for (let k = i + 1; k < gs.length; k++) {
      const t = joiningType(gs[k]);
      if (t === 'T') continue;
      return t === 'D' || t === 'R' || t === 'C';
    }
    return false;
  };
  const nextLetterIndex = (i: number): number => {
    for (let k = i + 1; k < gs.length; k++) {
      const t = joiningType(gs[k]);
      if (t === 'T') continue;
      return k;
    }
    return -1;
  };

  for (let i = 0; i < gs.length; i++) {
    const g = gs[i]!;
    const cp = baseOf(g);
    const entry = TABLE.get(cp);
    if (!entry) continue;
    const rest = g.slice(String.fromCodePoint(cp).length);
    const joinsPrev = (entry.type === 'D' || entry.type === 'R' || entry.type === 'C') && prevJoiner(i);

    if (opts.ligatures && cp === 0x0644) {
      const k = nextLetterIndex(i);
      const alef = k === i + 1 ? LAM_ALEF.get(baseOf(gs[k]!)) : undefined;
      if (alef && k !== -1) {
        const lig = joinsPrev ? alef[1] : alef[0];
        out[i] = String.fromCodePoint(lig) + rest + gs[k]!.slice(1);
        out[k] = '';
        i = k;
        continue;
      }
    }

    if (entry.type === 'C' || entry.type === 'U') {
      const iso = entry.forms[0];
      if (iso !== null) out[i] = String.fromCodePoint(iso) + rest;
      continue;
    }

    const joinsNext = entry.type === 'D' && nextJoiner(i);
    const [iso, fin, ini, med] = entry.forms;
    let form: number | null;
    if (joinsPrev && joinsNext) form = med;
    else if (joinsPrev) form = fin;
    else if (joinsNext) form = ini;
    else form = iso;
    if (form !== null) out[i] = String.fromCodePoint(form) + rest;
  }
  return out;
}
