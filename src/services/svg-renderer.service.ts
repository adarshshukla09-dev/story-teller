import type { Scene } from "../schema/scene.schema.js";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"
}[c]!));

/** Deterministic, self-contained 9:16 SVG card. No image API or external assets required. */
export function renderSceneSvg(scene: Scene, videoTitle = "PARADOX OF PROGRESS"): string {
  const title = esc(videoTitle.toUpperCase());
  const line1 = esc(scene.caption?.line1 ?? "");
  const line2 = esc(scene.caption?.line2 ?? scene.caption?.redEmphasis ?? "");
  const idea = esc(scene.centralIdea || scene.visualPurpose || scene.primarySubject || "");
  const subject = esc(scene.primarySubject || scene.visualMetaphor || "A person considering an idea");
  const supports = (scene.supportingElements || []).slice(0, 3);
  const chips = supports.map((s, i) => {
    const x = 155 + i * 245;
    return `<g transform="translate(${x} 480)"><rect x="-92" y="-48" width="184" height="96" rx="20" fill="${["#D9B66F","#A8B9A0","#D98C70"][i]}" stroke="#111111" stroke-width="5"/><text x="0" y="8" text-anchor="middle" font-family="Arial,sans-serif" font-size="22" font-weight="700" fill="#111111">${esc(s).slice(0,26)}</text></g>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1778" role="img" aria-label="${esc(scene.visualPurpose || scene.narration || "Illustrated explainer scene")}">
<rect width="1000" height="1778" fill="#F9F8F4"/>
<text x="500" y="112" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="48" font-weight="900" fill="#111111">${title}</text>
<ellipse cx="500" cy="1370" rx="310" ry="24" fill="#E2E0D8"/>
<g stroke="#111111" stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
  <path d="M500 1040 L500 1260 M500 1090 L365 1175 M500 1090 L635 1175 M500 1260 L405 1360 M500 1260 L595 1360" fill="none"/>
  <circle cx="500" cy="930" r="105" fill="#FFFFFF"/>
  <circle cx="465" cy="915" r="9" fill="#111111" stroke="none"/><circle cx="535" cy="915" r="9" fill="#111111" stroke="none"/>
  <path d="M460 970 Q500 990 540 970" fill="none"/>
  <rect x="335" y="720" width="330" height="110" rx="24" fill="#D9B66F"/>
  <path d="M390 775 H610" fill="none" stroke-width="5"/>
  <path d="M285 665 l-30 -35 M715 665 l30 -35 M500 580 v-55" fill="none" stroke-width="6"/>
</g>
<text x="500" y="680" text-anchor="middle" font-family="Arial,sans-serif" font-size="28" font-weight="700" fill="#111111">${subject.slice(0,50)}</text>
<text x="500" y="1515" text-anchor="middle" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#111111">${idea.slice(0,55)}</text>
${chips}
<text x="500" y="1640" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="45" font-weight="900" fill="#111111">${line1.slice(0,36)}</text>
<text x="500" y="1700" text-anchor="middle" font-family="Arial Rounded MT Bold,Arial,sans-serif" font-size="45" font-weight="900" fill="#C81D11">${line2.slice(0,36)}</text>
</svg>`;
}
