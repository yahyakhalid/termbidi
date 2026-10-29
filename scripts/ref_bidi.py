"""Reference visual ordering with python-bidi (Rust unicode-bidi backend).

Reads UTF-8 lines from stdin and prints get_display() of each line. Used by
scripts/experiment.mjs as an independent implementation to compare against.
"""
import sys

from bidi import get_display

sys.stdout.reconfigure(encoding="utf-8", newline="\n")
for raw in sys.stdin.buffer.read().decode("utf-8").split("\n"):
    sys.stdout.write(get_display(raw) + "\n")
