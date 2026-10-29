// Decides whether the application should reorder RTL text itself, or leave
// it to a terminal that applies the bidirectional algorithm on its own.
//
// Two sources, in order:
//   1. The TERMBIDI environment variable (explicit user choice).
//   2. Known terminals, recognised from their environment variables.
// The optional `queryTerminal()` asks the terminal directly with DECRQM for
// the BiDi mode (BDSM, ECMA-48 mode 8), which some terminals answer.

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

function versionAtLeast(version: string | undefined, min: number[]): boolean {
  if (!version) return false;
  const parts = version.split(/[^0-9]+/).filter(Boolean).map(Number);
  for (let i = 0; i < min.length; i++) {
    const a = parts[i] ?? 0;
    const b = min[i]!;
    if (a !== b) return a > b;
  }
  return true;
}

interface Recognised {
  terminal: string;
  /** true when the terminal reorders RTL text itself */
  bidi: boolean;
}

/**
 * Recognises the terminal from its environment variables. TERM_PROGRAM is
 * checked first because each terminal overwrites it, while variables such as
 * VTE_VERSION, KONSOLE_VERSION or WT_SESSION are inherited by programs started
 * from that terminal (for example VS Code launched with `code .`). The
 * sources for each entry are listed in docs/terminals.md.
 */
function recognise(env: Env): Recognised {
  const prog = env.TERM_PROGRAM;
  switch (prog) {
    case 'vscode':
      return { terminal: 'VS Code (xterm.js)', bidi: false };
    case 'WarpTerminal':
      return { terminal: 'Warp', bidi: false };
    case 'ghostty':
      return { terminal: 'Ghostty', bidi: false };
    case 'WezTerm':
      return { terminal: 'WezTerm', bidi: false };
    case 'iTerm.app':
      return versionAtLeast(env.TERM_PROGRAM_VERSION, [3, 7])
        ? { terminal: 'iTerm2 >= 3.7', bidi: true }
        : { terminal: 'iTerm2 < 3.7', bidi: false };
    case 'mintty':
      return { terminal: 'mintty', bidi: true };
    case 'Apple_Terminal':
      return { terminal: 'Apple Terminal', bidi: true };
    case 'tmux':
    case 'screen':
      // A multiplexer passes rows to the outer terminal. iTerm2 exports
      // LC_TERMINAL, which survives tmux and ssh.
      if (env.LC_TERMINAL === 'iTerm2' && versionAtLeast(env.LC_TERMINAL_VERSION, [3, 7])) {
        return { terminal: `${prog} in iTerm2 >= 3.7`, bidi: true };
      }
      return { terminal: prog, bidi: false };
    default:
      break;
  }
  if (env.TERMINAL_EMULATOR === 'JetBrains-JediTerm') return { terminal: 'JetBrains (JediTerm)', bidi: false };
  if (env.KITTY_WINDOW_ID) return { terminal: 'kitty', bidi: false };
  if (env.ALACRITTY_WINDOW_ID || env.ALACRITTY_LOG) return { terminal: 'Alacritty', bidi: false };
  if (env.GHOSTTY_RESOURCES_DIR) return { terminal: 'Ghostty', bidi: false };
  if (env.WT_SESSION) return { terminal: 'Windows Terminal', bidi: false };
  if (env.KONSOLE_VERSION) return { terminal: 'Konsole', bidi: true };
  if (env.MLTERM) return { terminal: 'mlterm', bidi: true };
  // VTE (GNOME Terminal, Tilix, ...) implements BiDi from 0.58 (VTE_VERSION 5800).
  if (env.VTE_VERSION && Number(env.VTE_VERSION) >= 5800) return { terminal: 'VTE >= 0.58', bidi: true };
  if (env.LC_TERMINAL === 'iTerm2' && versionAtLeast(env.LC_TERMINAL_VERSION, [3, 7])) {
    return { terminal: 'iTerm2 >= 3.7 (over ssh)', bidi: true };
  }
  return { terminal: prog || 'unknown', bidi: false };
}

/**
 * Detects how RTL text should be handled from the environment only. Fast and
 * synchronous; does not talk to the terminal.
 */
export function detect(env: Env = process.env): Detection {
  const flag = (env.TERMBIDI ?? '').trim().toLowerCase();
  const shapeFlag = (env.TERMBIDI_SHAPE ?? '').trim().toLowerCase();
  const shapeOff = shapeFlag === '0' || shapeFlag === 'off' || shapeFlag === 'false';

  const { terminal, bidi } = recognise(env);
  if (flag === '0' || flag === 'off' || flag === 'false') {
    return { mode: 'passthrough', shape: false, terminal, reason: 'TERMBIDI=off' };
  }
  if (flag === '1' || flag === 'on' || flag === 'true' || flag === 'force') {
    return { mode: 'reorder', shape: !shapeOff, terminal, reason: 'TERMBIDI=on' };
  }
  if (bidi) {
    return { mode: 'passthrough', shape: false, terminal, reason: `${terminal} reorders RTL text itself` };
  }
  return {
    mode: 'reorder',
    shape: !shapeOff,
    terminal,
    reason:
      terminal === 'unknown'
        ? 'unknown terminal; most terminals do not reorder RTL text'
        : `${terminal} does not reorder RTL text`,
  };
}

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

const REPLY_RE = /\x1b\[8;(\d)\$y/;

export function queryTerminal(opts: QueryOptions = {}): Promise<BidiQueryResult> {
  const input = opts.input ?? process.stdin;
  const output = opts.output ?? process.stdout;
  const timeout = opts.timeout ?? 150;
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') {
    return Promise.resolve('no-answer');
  }
  return new Promise((resolve) => {
    const wasRaw = input.isRaw;
    let buffer = '';
    const finish = (result: BidiQueryResult) => {
      clearTimeout(timer);
      input.off('data', onData);
      input.setRawMode(wasRaw);
      input.pause();
      resolve(result);
    };
    const onData = (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const m = REPLY_RE.exec(buffer);
      if (!m) return;
      const v = m[1];
      if (v === '1' || v === '3') finish('implicit');
      else if (v === '2' || v === '4') finish('explicit');
      else finish('unsupported');
    };
    const timer = setTimeout(() => finish('no-answer'), timeout);
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
    output.write('\x1b[8$p');
  });
}

/** Sequence that switches a BDSM-capable terminal to explicit mode (no reordering). */
export const DISABLE_TERMINAL_BIDI = '\x1b[8l';
/** Sequence that restores implicit BiDi in a BDSM-capable terminal. */
export const ENABLE_TERMINAL_BIDI = '\x1b[8h';
