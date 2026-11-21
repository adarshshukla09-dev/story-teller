import sharp from "sharp";

export function checkSvgStructure(svg: string): { ok: boolean; error?: string } {
  const tags = svg.match(/<\/?[A-Za-z][^>]*>/g) ?? [];
  const stack: string[] = [];
  for (const tag of tags) {
    if (/^<\?/.test(tag) || /^<!/.test(tag)) continue;
    const closing = /^<\//.test(tag);
    const name = tag.match(/^<\/?([\w:-]+)/)?.[1];
    if (!name) return { ok: false, error: `Malformed SVG tag: ${tag}` };
    if (closing) {
      const opened = stack.pop();
      if (opened !== name) return { ok: false, error: `Unbalanced SVG closing tag: ${name}` };
    } else if (!/\/>$/.test(tag)) {
      stack.push(name);
    }
  }
  if (stack.length) return { ok: false, error: `Unclosed SVG tag: ${stack.at(-1)}` };
  if (/speech\s*bubble|thought\s*bubble/i.test(svg)) return { ok: false, error: "SVG contains speech or thought bubble text." };
  for (const match of svg.matchAll(/<tspan\b[^>]*\bx=["']([^"']+)["']/g)) {
    const xValue = match[1] ?? "";
    const xs = xValue.trim().split(/[ ,]+/).map(Number);
    if (xs.some((x) => !Number.isFinite(x) || x < 40 || x > 984)) return { ok: false, error: `tspan x must be between 40 and 984: ${xValue}` };
  }
  return { ok: true };
}

export async function renderCheck(svg: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { width, height } = await sharp(Buffer.from(svg)).metadata();
    if (width !== 1024 || height !== 1024) return { ok: false, error: `Rendered dimensions are ${width}x${height}, expected 1024x1024.` };
    await sharp(Buffer.from(svg)).png().toBuffer();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: `Sharp render failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}
