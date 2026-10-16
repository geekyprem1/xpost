type Mapping = [base: number, target: number, count: number];

const BOLD_MAPPINGS: Mapping[] = [
  ["A".charCodeAt(0), 0x1d5d4, 26],
  ["a".charCodeAt(0), 0x1d5ee, 26],
  ["0".charCodeAt(0), 0x1d7ec, 10],
];

const ITALIC_MAPPINGS: Mapping[] = [
  ["A".charCodeAt(0), 0x1d608, 26],
  ["a".charCodeAt(0), 0x1d622, 26],
];

function convert(text: string, mappings: Mapping[]): string {
  let output = "";
  for (const char of text) {
    let mapped = char;
    const code = char.charCodeAt(0);
    for (const [base, target, count] of mappings) {
      if (code >= base && code < base + count) {
        mapped = String.fromCodePoint(code - base + target);
        break;
      }
    }
    output += mapped;
  }
  return output;
}

export function toUnicodeBold(text: string): string {
  return convert(text, BOLD_MAPPINGS);
}

export function toUnicodeItalic(text: string): string {
  return convert(text, ITALIC_MAPPINGS);
}

export function containsUnicodeFormatting(text: string): boolean {
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code >= 0x1d400 && code <= 0x1d7ff) return true;
  }
  return false;
}
