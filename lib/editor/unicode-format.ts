export type PostFormat =
  | "bold"
  | "italic"
  | "boldItalic"
  | "underline"
  | "strike"
  | "upper"
  | "lower"
  | "bullets"
  | "numbered"
  | "clear";

type Mapping = [base: number, target: number, count: number];

const BOLD_MAPPINGS: Mapping[] = [
  [0x41, 0x1d5d4, 26],
  [0x61, 0x1d5ee, 26],
  [0x30, 0x1d7ec, 10],
];
const ITALIC_MAPPINGS: Mapping[] = [
  [0x41, 0x1d608, 26],
  [0x61, 0x1d622, 26],
];
const BOLD_ITALIC_MAPPINGS: Mapping[] = [
  [0x41, 0x1d63c, 26],
  [0x61, 0x1d656, 26],
];
const STYLES = [
  { mappings: BOLD_MAPPINGS, bits: 1 },
  { mappings: ITALIC_MAPPINGS, bits: 2 },
  { mappings: BOLD_ITALIC_MAPPINGS, bits: 3 },
];
const LIST_PREFIX = /^([ \t]*)(?:• |\d+\. )/;
const DECORATIONS = /[\u0332\u0336]/gu;
const GRAPHEMES = new Intl.Segmenter("en", { granularity: "grapheme" });

function convert(text: string, mappings: Mapping[]): string {
  let output = "";
  for (const char of text) {
    const code = char.codePointAt(0)!;
    const mapping = mappings.find(
      ([base, , count]) => code >= base && code < base + count,
    );
    output += mapping
      ? String.fromCodePoint(code - mapping[0] + mapping[1])
      : char;
  }
  return output;
}

function decode(char: string): { base: string; bits: number } {
  const code = char.codePointAt(0)!;
  for (const { mappings, bits } of STYLES) {
    for (const [base, target, count] of mappings) {
      if (code >= target && code < target + count) {
        return { base: String.fromCodePoint(code - target + base), bits };
      }
    }
  }
  return { base: char, bits: 0 };
}

function encode(base: string, bits: number): string {
  if (bits === 3 && /[0-9]/.test(base)) {
    return convert(base, BOLD_MAPPINGS);
  }
  const style = STYLES.find((entry) => entry.bits === bits);
  return style ? convert(base, style.mappings) : base;
}

function styleText(text: string, bits: number): string {
  const characters = Array.from(text, decode);
  const eligible = characters.filter(({ base }) =>
    bits === 2 ? /^[A-Za-z]$/.test(base) : /^[A-Za-z0-9]$/.test(base),
  );
  const remove =
    eligible.length > 0 &&
    eligible.every(({ base, bits: current }) => {
      const supported = /^[0-9]$/.test(base) ? bits & 1 : bits;
      return (current & supported) === supported;
    });
  return characters
    .map(({ base, bits: current }) => {
      // Italic has no sans-serif digit range: retain any existing digit bold.
      if (!/^[A-Za-z0-9]$/.test(base)) return base;
      return encode(base, remove ? current & ~bits : current | bits);
    })
    .join("");
}

function decorateText(text: string, mark: string): string {
  // Decorate whole graphemes so accents, Hindi vowel marks and emoji ZWJ
  // sequences stay attached to their original base.
  const groups = Array.from(GRAPHEMES.segment(text), ({ segment }) => segment);
  const eligible = groups.filter((group) => /[\p{L}\p{N}\p{P}\p{S}]/u.test(group));
  const remove = eligible.length > 0 && eligible.every((group) => group.includes(mark));
  return groups
    .map((group) => {
      if (!/[\p{L}\p{N}\p{P}\p{S}]/u.test(group)) return group;
      const plain = group.replaceAll(mark, "");
      return remove ? plain : plain + mark;
    })
    .join("");
}

function transform(text: string, format: PostFormat): string {
  switch (format) {
    case "bold":
      return styleText(text, 1);
    case "italic":
      return styleText(text, 2);
    case "boldItalic":
      return styleText(text, 3);
    case "underline":
      return decorateText(text, "\u0332");
    case "strike":
      return decorateText(text, "\u0336");
    case "upper":
    case "lower":
      return Array.from(text, (char) => {
        const { base, bits } = decode(char);
        return encode(format === "upper" ? base.toUpperCase() : base.toLowerCase(), bits);
      }).join("");
    case "clear":
      return Array.from(text, (char) => decode(char).base)
        .join("")
        .replace(DECORATIONS, "")
        .replace(/^([ \t]*)(?:• |\d+\. )/gm, "$1");
    default:
      return text;
  }
}

function boundary(text: string, offset: number, roundUp: boolean): number {
  const index = Math.max(0, Math.min(text.length, Math.trunc(offset) || 0));
  if (
    index > 0 &&
    index < text.length &&
    /[\uD800-\uDBFF]/.test(text[index - 1]) &&
    /[\uDC00-\uDFFF]/.test(text[index])
  ) {
    return index + (roundUp ? 1 : -1);
  }
  return index;
}

/** Formats textarea UTF-16 offsets and selects the resulting replacement. */
export function formatPostSelection(
  text: string,
  start: number,
  end: number,
  format: PostFormat,
): { text: string; start: number; end: number } {
  const lower = Math.min(start, end);
  const upper = Math.max(start, end);
  let from = boundary(text, lower, false);
  let to = boundary(text, upper, lower !== upper);
  let replacement: string;

  if (format === "bullets" || format === "numbered") {
    from = from === 0 ? 0 : text.lastIndexOf("\n", from - 1) + 1;
    // A selection ending at the next line's beginning does not select that line.
    const last = to > from && text[to - 1] === "\n" ? to - 1 : to;
    const newline = text.indexOf("\n", last);
    to = newline === -1 ? text.length : newline;
    if (to > from && text[to - 1] === "\r") to--;
    const lines = text.slice(from, to).split("\n");
    const nonblank = lines.filter((line) => line.trim() !== "");
    const same = format === "bullets" ? /^[ \t]*• / : /^[ \t]*\d+\. /;
    const remove = nonblank.length > 0 && nonblank.every((line) => same.test(line));
    let number = 0;
    replacement = lines
      .map((line) => {
        if (line.trim() === "") return line;
        const plain = line.replace(LIST_PREFIX, "$1");
        if (remove) return plain;
        number++;
        const indent = plain.match(/^[ \t]*/)![0];
        const prefix = format === "bullets" ? "• " : `${number}. `;
        return indent + prefix + plain.slice(indent.length);
      })
      .join("\n");
  } else {
    if (from === to) {
      from = 0;
      to = text.length;
    }
    replacement = transform(text.slice(from, to), format);
  }

  return {
    text: text.slice(0, from) + replacement + text.slice(to),
    start: from,
    end: from + replacement.length,
  };
}

export function containsUnicodeFormatting(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code >= 0x1d400 && code <= 0x1d7ff) return true;
    if (char === "\u0332" || char === "\u0336") return true;
  }
  return false;
}
