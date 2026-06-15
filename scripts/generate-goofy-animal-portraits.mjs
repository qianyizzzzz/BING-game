import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const projectRoot = path.resolve(import.meta.dirname, "..");
const characterRoot = path.join(projectRoot, "apps", "client", "public", "assets", "characters");

const characters = [
  {
    id: "ember-guardian",
    base: "#b8844a",
    belly: "#efd7ad",
    cloth: "#315d56",
    dark: "#27211d",
    ears: "cat",
    name: "a-wai",
    prop: "pan",
    spots: "#6f4c2d"
  },
  {
    id: "jade-trickster",
    base: "#9a6a3d",
    belly: "#ead1a8",
    cloth: "#2d7280",
    dark: "#241d19",
    ears: "otter",
    name: "xiao-liu",
    prop: "glass",
    spots: "#6a4529"
  },
  {
    id: "violet-duelist",
    base: "#d27438",
    belly: "#f4dfb8",
    cloth: "#5f477d",
    dark: "#211b1a",
    ears: "fox",
    name: "bian-zui",
    prop: "fork",
    spots: "#9b4a22"
  },
  {
    id: "solar-chef",
    base: "#d0a150",
    belly: "#f1dfb9",
    cloth: "#c28b32",
    dark: "#2a2119",
    ears: "hamster",
    name: "guo-ba",
    prop: "crumb",
    spots: "#8f6a2d"
  },
  {
    id: "crimson-mender",
    base: "#c0b08d",
    belly: "#eee0c4",
    cloth: "#a85457",
    dark: "#261d1c",
    ears: "goat",
    name: "man-man",
    prop: "bottle",
    spots: "#87765c"
  },
  {
    id: "iron-oracle",
    base: "#736f63",
    belly: "#ddd3bd",
    cloth: "#3e5863",
    dark: "#201f1e",
    ears: "owl",
    name: "lao-ding",
    prop: "lens",
    spots: "#4d4a41"
  }
];

const actionVariants = {
  "action-attack.png": { action: "attack", mood: "lopsided", mark: "#d5693c" },
  "action-defend.png": { action: "defend", mood: "suspicious", mark: "#59a989" },
  "action-down.png": { action: "down", mood: "flat", mark: "#8a8173" },
  "action-hit.png": { action: "hit", mood: "startled", mark: "#b84e48" },
  "action-idle.png": { action: "idle", mood: "bored", mark: "#cc9b3f" },
  "action-skill.png": { action: "skill", mood: "scheming", mark: "#4d9fba" }
};

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { height: 768, width: 768 } });

for (const character of characters) {
  const dir = path.join(characterRoot, character.id);
  await fs.mkdir(path.join(dir, "source"), { recursive: true });

  await writePortrait(page, character, path.join(dir, "portrait.png"), 512, "portrait", "bored");
  await writePortrait(page, character, path.join(dir, "mobile-avatar.png"), 768, "mobile", "bored");
  await fs.writeFile(
    path.join(dir, "source", "goofy-animal-portrait.svg"),
    portraitSvg(character, 512, "portrait", "bored"),
    "utf-8"
  );

  for (const [file, variant] of Object.entries(actionVariants)) {
    await writePortrait(page, character, path.join(dir, file), 512, variant.action, variant.mood, variant.mark);
  }
}

await browser.close();
console.log(`generated ${characters.length} goofy animal portrait sets`);

async function writePortrait(page, character, outPath, size, variant, mood, markColor) {
  await page.setViewportSize({ height: size, width: size });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${portraitSvg(character, size, variant, mood, markColor)}</body></html>`
  );
  await page.locator("svg").screenshot({ omitBackground: true, path: outPath });
}

function portraitSvg(character, size, variant, mood, markColor = "#d1953a") {
  const scale = size / 512;
  const isAction = variant !== "portrait" && variant !== "mobile";
  const bodyY = isAction ? 316 : 326;
  const headTilt = mood === "startled" ? -4 : mood === "flat" ? 2 : variant === "skill" ? -7 : -3;
  const mouth = mouthPath(mood);
  const eyes = eyesForMood(mood, character.ears);

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <filter id="paper" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" seed="${character.id.length * 17}" />
      <feColorMatrix type="saturate" values="0.18" />
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.18" />
      </feComponentTransfer>
    </filter>
    <filter id="wobble" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="${character.name.length * 31}" />
      <feDisplacementMap in="SourceGraphic" scale="${1.8 * scale}" />
    </filter>
    <radialGradient id="wash" cx="45%" cy="30%" r="72%">
      <stop offset="0%" stop-color="#fff2d7" />
      <stop offset="58%" stop-color="#ead6ad" />
      <stop offset="100%" stop-color="#d9bf8f" />
    </radialGradient>
  </defs>

  <rect width="512" height="512" fill="url(#wash)" />
  <rect width="512" height="512" filter="url(#paper)" opacity="0.72" />
  ${paperSpeckles(character.id)}
  <g filter="url(#wobble)" transform="rotate(${headTilt} 256 246)">
    ${backMarks(character, markColor, isAction)}
    ${ears(character)}
    <path d="M141 194 C139 105 197 58 273 70 C353 82 396 145 383 230 C371 313 318 358 238 350 C172 343 143 279 141 194 Z"
      fill="${character.base}" stroke="${character.dark}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M169 239 C205 288 304 299 358 245 C342 318 296 355 237 350 C188 346 156 304 169 239 Z"
      fill="${character.belly}" opacity="0.92"/>
    ${animalMarks(character)}
    ${hairTuft(character)}
    ${eyes}
    <path d="M252 212 C267 205 286 207 296 219 C285 232 265 233 252 212 Z" fill="${character.dark}" opacity="0.92"/>
    ${mouth}
    ${prop(character)}
  </g>
  <g filter="url(#wobble)">
    <path d="M153 ${bodyY} C195 292 315 294 360 ${bodyY} C389 364 380 450 342 471 C300 496 201 495 162 468 C124 440 125 364 153 ${bodyY} Z"
      fill="${character.cloth}" stroke="${character.dark}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M197 346 C226 365 289 365 317 345" fill="none" stroke="#f5e5bf" stroke-width="7" stroke-linecap="round" opacity="0.58"/>
    <path d="M184 404 C217 421 289 422 327 402" fill="none" stroke="#151515" stroke-width="5" stroke-linecap="round" opacity="0.34"/>
    ${bodyProp(character)}
  </g>
  ${isAction ? actionGlyph(variant, markColor) : ""}
</svg>`;
}

function ears(character) {
  if (character.ears === "otter" || character.ears === "hamster") {
    return `
      <circle cx="157" cy="154" r="${character.ears === "hamster" ? 39 : 30}" fill="${character.base}" stroke="${character.dark}" stroke-width="8"/>
      <circle cx="359" cy="144" r="${character.ears === "hamster" ? 34 : 26}" fill="${character.base}" stroke="${character.dark}" stroke-width="8"/>
      <circle cx="158" cy="156" r="16" fill="#e4a58c" opacity="0.62"/>
      <circle cx="359" cy="145" r="14" fill="#e4a58c" opacity="0.55"/>`;
  }
  if (character.ears === "goat") {
    return `
      <path d="M156 144 C113 116 91 130 107 171 C128 164 146 158 166 159 Z" fill="${character.belly}" stroke="${character.dark}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M356 138 C401 107 425 122 405 166 C383 160 366 153 345 156 Z" fill="${character.belly}" stroke="${character.dark}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M210 82 C190 49 207 34 231 63" fill="none" stroke="${character.dark}" stroke-width="8" stroke-linecap="round"/>
      <path d="M308 82 C331 48 314 34 289 63" fill="none" stroke="${character.dark}" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (character.ears === "owl") {
    return `
      <path d="M166 151 L183 86 L225 142 Z" fill="${character.base}" stroke="${character.dark}" stroke-width="8" stroke-linejoin="round"/>
      <path d="M337 147 L317 83 L279 142 Z" fill="${character.base}" stroke="${character.dark}" stroke-width="8" stroke-linejoin="round"/>`;
  }
  return `
    <path d="M153 169 L115 82 L211 137 Z" fill="${character.base}" stroke="${character.dark}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M340 160 L384 76 L291 132 Z" fill="${character.base}" stroke="${character.dark}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M151 147 L136 107 L181 134 Z" fill="#e6ad91" opacity="0.58"/>
    <path d="M340 140 L362 101 L318 130 Z" fill="#e6ad91" opacity="0.58"/>`;
}

function eyesForMood(mood, ears) {
  if (mood === "startled") {
    return `
      <ellipse cx="214" cy="209" rx="34" ry="39" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <ellipse cx="303" cy="207" rx="20" ry="28" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <circle cx="224" cy="217" r="8" fill="#171411"/><circle cx="296" cy="218" r="6" fill="#171411"/>`;
  }
  if (mood === "flat") {
    return `
      <path d="M183 207 C213 199 235 202 251 213" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>
      <path d="M286 207 C314 197 337 202 354 214" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (mood === "scheming") {
    return `
      <path d="M184 202 C213 217 239 214 255 197" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <path d="M283 201 C311 216 337 211 354 193" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <circle cx="236" cy="206" r="7" fill="#171411"/><circle cx="332" cy="202" r="7" fill="#171411"/>`;
  }
  if (ears === "owl") {
    return `
      <circle cx="213" cy="205" r="38" fill="#fff8e8" stroke="#1d1a16" stroke-width="7"/>
      <circle cx="307" cy="203" r="35" fill="#fff8e8" stroke="#1d1a16" stroke-width="7"/>
      <circle cx="222" cy="215" r="8" fill="#171411"/><circle cx="296" cy="194" r="7" fill="#171411"/>`;
  }
  return `
    <path d="M179 198 C205 207 231 207 255 195" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
    <path d="M288 203 C311 213 340 214 361 203" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
    <circle cx="212" cy="205" r="6" fill="#171411"/>
    <circle cx="342" cy="207" r="8" fill="#171411"/>
    <path d="M177 184 C207 172 236 174 263 187" fill="none" stroke="#1d1a16" stroke-width="7" stroke-linecap="round"/>
    <path d="M294 188 C324 177 348 179 369 193" fill="none" stroke="#1d1a16" stroke-width="7" stroke-linecap="round"/>`;
}

function mouthPath(mood) {
  if (mood === "startled") {
    return `<ellipse cx="266" cy="260" rx="23" ry="30" fill="#5b2722" stroke="#1d1a16" stroke-width="6"/><path d="M254 281 C267 292 282 285 286 272" fill="#d88678" opacity="0.8"/>`;
  }
  if (mood === "flat") {
    return `<path d="M236 262 C261 256 286 260 306 270" fill="none" stroke="#1d1a16" stroke-width="7" stroke-linecap="round"/>`;
  }
  if (mood === "scheming") {
    return `<path d="M233 260 C256 285 300 278 321 247" fill="none" stroke="#1d1a16" stroke-width="7" stroke-linecap="round"/><path d="M273 277 L283 294 L292 275" fill="#fff8e8" stroke="#1d1a16" stroke-width="4"/>`;
  }
  return `<path d="M228 262 C253 283 294 278 318 252" fill="#5b2722" stroke="#1d1a16" stroke-width="6" stroke-linejoin="round"/><path d="M259 263 L270 286 L282 262" fill="#fff8e8" stroke="#1d1a16" stroke-width="4"/><path d="M292 264 L300 279 L308 261" fill="#fff8e8" stroke="#1d1a16" stroke-width="4"/><path d="M233 291 C256 301 292 299 315 284" fill="none" stroke="#1d1a16" stroke-width="4" stroke-linecap="round" opacity="0.38"/>`;
}

function animalMarks(character) {
  if (character.ears === "fox" || character.ears === "cat") {
    return `
      <path d="M176 156 C214 174 258 174 291 151" fill="none" stroke="${character.spots}" stroke-width="8" stroke-linecap="round" opacity="0.55"/>
      <path d="M193 177 C231 190 268 189 301 172" fill="none" stroke="${character.spots}" stroke-width="5" stroke-linecap="round" opacity="0.45"/>
      <path d="M144 238 C118 228 101 227 82 237" fill="none" stroke="${character.dark}" stroke-width="5" stroke-linecap="round"/>
      <path d="M369 231 C397 219 421 216 445 225" fill="none" stroke="${character.dark}" stroke-width="5" stroke-linecap="round"/>`;
  }
  if (character.ears === "goat") {
    return `<path d="M188 151 C223 133 284 134 328 151" fill="none" stroke="${character.spots}" stroke-width="7" opacity="0.42"/><path d="M220 142 C217 164 222 176 239 184" fill="none" stroke="${character.dark}" stroke-width="4" opacity="0.45"/>`;
  }
  return `<circle cx="175" cy="266" r="6" fill="${character.spots}" opacity="0.55"/><circle cx="332" cy="251" r="5" fill="${character.spots}" opacity="0.5"/><path d="M156 246 C127 240 103 244 82 257" fill="none" stroke="${character.dark}" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`;
}

function hairTuft(character) {
  if (character.ears === "owl") {
    return `<path d="M226 126 C245 101 260 126 279 105 C278 133 300 129 312 151" fill="none" stroke="${character.dark}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.88"/>`;
  }
  return `
    <path d="M211 120 C222 93 239 122 249 96 C259 123 279 98 285 129" fill="none" stroke="${character.dark}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M174 286 C198 296 226 299 251 294" fill="none" stroke="${character.dark}" stroke-width="4" stroke-linecap="round" opacity="0.32"/>
    <path d="M285 292 C310 299 336 296 359 283" fill="none" stroke="${character.dark}" stroke-width="4" stroke-linecap="round" opacity="0.28"/>`;
}

function prop(character) {
  if (character.prop === "glass" || character.prop === "lens") {
    return `<circle cx="205" cy="205" r="45" fill="rgba(255,255,255,0.32)" stroke="#5a4a2c" stroke-width="8"/><path d="M161 240 L122 286" stroke="#5a4a2c" stroke-width="10" stroke-linecap="round"/>`;
  }
  if (character.prop === "fork") {
    return `<path d="M369 215 C403 206 423 188 433 160" fill="none" stroke="#1d1a16" stroke-width="6" stroke-linecap="round"/><path d="M422 164 L442 149 M420 164 L433 142 M418 163 L423 139" stroke="#1d1a16" stroke-width="4" stroke-linecap="round"/>`;
  }
  if (character.prop === "crumb") {
    return `<circle cx="358" cy="280" r="12" fill="#c68632" stroke="#1d1a16" stroke-width="4"/><circle cx="377" cy="257" r="7" fill="#c68632" stroke="#1d1a16" stroke-width="3"/>`;
  }
  return "";
}

function bodyProp(character) {
  if (character.prop === "pan") {
    return `<ellipse cx="260" cy="412" rx="42" ry="24" fill="#ead7a7" stroke="#211b18" stroke-width="6"/><path d="M301 410 L372 390" stroke="#211b18" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (character.prop === "bottle") {
    return `<path d="M243 386 L287 386 L294 452 C280 465 248 466 236 452 Z" fill="#eac6b8" stroke="#211b18" stroke-width="6"/><path d="M253 361 L279 361 L279 386 L253 386 Z" fill="#b54f5b" stroke="#211b18" stroke-width="5"/>`;
  }
  return `<path d="M222 392 C251 407 286 407 316 390" fill="none" stroke="#f5e5bf" stroke-width="6" stroke-linecap="round" opacity="0.64"/>`;
}

function backMarks(character, markColor, isAction) {
  return `
    <path d="M91 121 C137 83 224 50 338 78" fill="none" stroke="${markColor}" stroke-width="${isAction ? 11 : 7}" stroke-linecap="round" opacity="0.16"/>
    <path d="M378 323 C417 298 438 263 439 217" fill="none" stroke="${markColor}" stroke-width="8" stroke-linecap="round" opacity="0.18"/>`;
}

function actionGlyph(variant, color) {
  const glyphs = {
    attack: `<path d="M410 116 L466 92 L441 149 Z" fill="${color}" stroke="#241d19" stroke-width="5"/><path d="M397 141 L455 119" stroke="#241d19" stroke-width="5" stroke-linecap="round"/>`,
    defend: `<path d="M409 104 C440 108 461 124 466 152 C452 181 424 190 398 180 C388 151 392 125 409 104 Z" fill="${color}" stroke="#241d19" stroke-width="5" opacity="0.85"/>`,
    down: `<path d="M392 118 C420 150 447 153 473 124" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"/><path d="M407 169 L462 169" stroke="#241d19" stroke-width="6" stroke-linecap="round"/>`,
    hit: `<path d="M399 93 L419 130 L462 112 L438 150 L474 173 L429 168 L414 207 L402 164 L358 159 L394 137 Z" fill="${color}" stroke="#241d19" stroke-width="5"/>`,
    idle: `<path d="M401 130 C423 117 446 118 467 135" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round"/><circle cx="433" cy="168" r="9" fill="${color}" stroke="#241d19" stroke-width="4"/>`,
    skill: `<path d="M403 99 C438 104 462 126 470 160 C440 177 408 174 382 151 C383 127 390 110 403 99 Z" fill="${color}" stroke="#241d19" stroke-width="5"/><path d="M395 157 C425 132 446 120 471 111" fill="none" stroke="#f8e9bd" stroke-width="5" stroke-linecap="round"/>`
  };
  return `<g filter="url(#wobble)" opacity="0.92">${glyphs[variant] ?? glyphs.idle}</g>`;
}

function paperSpeckles(seed) {
  const dots = [];
  let value = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 97);
  for (let i = 0; i < 72; i += 1) {
    value = (value * 1664525 + 1013904223) % 4294967296;
    const x = value % 512;
    value = (value * 1664525 + 1013904223) % 4294967296;
    const y = value % 512;
    value = (value * 1664525 + 1013904223) % 4294967296;
    const r = 0.8 + (value % 24) / 12;
    dots.push(`<circle cx="${x}" cy="${y}" r="${r.toFixed(1)}" fill="#7c6746" opacity="0.10"/>`);
  }
  return `<g>${dots.join("")}</g>`;
}
