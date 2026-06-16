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
    mood: "derpy",
    quirk: "sleepy-cheek",
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
    mood: "side-eye",
    quirk: "side-eye",
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
    mood: "lopsided",
    quirk: "big-frown",
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
    mood: "stuffed",
    quirk: "crumb-face",
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
    mood: "worried",
    quirk: "tiny-bandage",
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
    mood: "double-stare",
    quirk: "double-stare",
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
  await fs.mkdir(dir, { recursive: true });

  await writePortrait(page, character, path.join(dir, "portrait.png"), 512, "portrait", character.mood);
  await writePortrait(page, character, path.join(dir, "mobile-avatar.png"), 768, "mobile", character.mood);

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
  const bodyY = isAction ? 323 : 333;
  const headTilt = mood === "startled" ? -22 : mood === "flat" ? 13 : variant === "skill" ? -25 : mood === "worried" ? 11 : -18;
  const headSkew = mood === "side-eye" ? -16 : mood === "double-stare" ? 13 : character.name.length % 2 === 0 ? 12 : -13;
  const squash = isAction ? "scale(1.24 .78)" : "scale(1.34 .72)";
  const mouth = mouthPath(mood);
  const eyes = eyesForMood(mood, character);

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
  <g filter="url(#wobble)" transform="rotate(${headTilt} 256 246) translate(-30 27) skewX(${headSkew}) ${squash}">
    ${backMarks(character, markColor, isAction)}
    ${ears(character)}
    <path d="M125 204 C112 112 197 50 307 70 C386 84 415 146 392 238 C375 307 333 358 256 363 C174 368 126 304 125 204 Z"
      fill="${character.base}" stroke="${character.dark}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M152 247 C195 313 318 317 371 246 C350 323 300 361 231 354 C178 348 145 306 152 247 Z"
      fill="${character.belly}" opacity="0.76"/>
    ${animalMarks(character)}
    ${hairTuft(character)}
    ${eyes}
    ${snout(character)}
    ${mouth}
    ${goofyDetails(character)}
    ${uglyCuteDetails(character, mood)}
    ${prop(character)}
  </g>
  <g filter="url(#wobble)">
    <path d="M145 ${bodyY} C194 300 324 294 369 ${bodyY} C395 368 382 449 341 471 C293 496 197 489 155 463 C117 438 119 368 145 ${bodyY} Z"
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

function eyesForMood(mood, character) {
  const ears = character.ears;
  if (mood === "derpy") {
    return `
      <ellipse cx="195" cy="204" rx="54" ry="31" fill="#fff8e8" stroke="#1d1a16" stroke-width="8"/>
      <ellipse cx="326" cy="213" rx="22" ry="45" fill="#fff8e8" stroke="#1d1a16" stroke-width="8"/>
      <circle cx="176" cy="217" r="7" fill="#171411"/>
      <circle cx="338" cy="190" r="6" fill="#171411"/>
      <path d="M157 175 C194 151 237 160 273 187" fill="none" stroke="#1d1a16" stroke-width="9" stroke-linecap="round"/>
      <path d="M288 188 C323 158 365 174 392 202" fill="none" stroke="#1d1a16" stroke-width="9" stroke-linecap="round"/>`;
  }
  if (mood === "stuffed") {
    return `
      <path d="M174 205 C204 190 234 195 256 214" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <path d="M294 205 C322 190 350 195 371 214" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <circle cx="229" cy="211" r="7" fill="#171411"/>
      <circle cx="333" cy="211" r="7" fill="#171411"/>
      <path d="M166 180 C199 171 233 176 263 194" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>
      <path d="M289 191 C322 173 357 174 386 189" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (mood === "worried") {
    return `
      <path d="M174 212 C206 196 237 203 257 226" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <path d="M292 214 C323 196 354 203 371 226" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <circle cx="211" cy="222" r="7" fill="#171411"/>
      <circle cx="334" cy="218" r="7" fill="#171411"/>
      <path d="M168 185 C199 174 232 181 260 203" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>
      <path d="M287 197 C321 176 356 175 388 190" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (mood === "lopsided") {
    return `
      <path d="M158 205 C199 229 244 216 267 187" fill="#fff8e8" stroke="#1d1a16" stroke-width="7"/>
      <ellipse cx="329" cy="210" rx="45" ry="22" fill="#fff8e8" stroke="#1d1a16" stroke-width="7"/>
      <circle cx="244" cy="204" r="7" fill="#171411"/>
      <circle cx="302" cy="218" r="10" fill="#171411"/>
      <path d="M152 177 C189 154 232 161 272 188" fill="none" stroke="#1d1a16" stroke-width="9" stroke-linecap="round"/>
      <path d="M287 181 C331 171 369 184 397 207" fill="none" stroke="#1d1a16" stroke-width="9" stroke-linecap="round"/>`;
  }
  if (character.quirk === "side-eye") {
    return `
      <path d="M158 201 C197 172 245 184 271 213" fill="#fff8e8" stroke="#1d1a16" stroke-width="7"/>
      <path d="M286 204 C323 184 367 192 389 216" fill="#fff8e8" stroke="#1d1a16" stroke-width="7"/>
      <circle cx="262" cy="201" r="8" fill="#171411"/>
      <circle cx="377" cy="209" r="7" fill="#171411"/>
      <path d="M173 178 C202 159 236 165 263 185" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>
      <path d="M299 183 C333 169 366 174 386 197" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (character.quirk === "double-stare") {
    return `
      <circle cx="205" cy="205" r="48" fill="#fff8e8" stroke="#1d1a16" stroke-width="8"/>
      <circle cx="317" cy="198" r="28" fill="#fff8e8" stroke="#1d1a16" stroke-width="8"/>
      <circle cx="225" cy="222" r="8" fill="#171411"/>
      <circle cx="302" cy="184" r="7" fill="#171411"/>
      <path d="M169 250 C190 237 220 238 242 254" fill="none" stroke="#1d1a16" stroke-width="5" stroke-linecap="round" opacity="0.44"/>`;
  }
  if (mood === "startled") {
    return `
      <ellipse cx="205" cy="207" rx="42" ry="47" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <ellipse cx="315" cy="213" rx="21" ry="31" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <circle cx="219" cy="222" r="8" fill="#171411"/><circle cx="310" cy="226" r="6" fill="#171411"/>`;
  }
  if (mood === "flat") {
    return `
      <path d="M183 207 C213 199 235 202 251 213" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>
      <path d="M286 207 C314 197 337 202 354 214" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>`;
  }
  if (mood === "scheming") {
    return `
      <path d="M177 207 C210 224 247 216 264 194" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <path d="M284 203 C318 222 350 211 365 190" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
      <circle cx="242" cy="209" r="7" fill="#171411"/><circle cx="343" cy="199" r="7" fill="#171411"/>`;
  }
  if (ears === "owl") {
    return `
      <circle cx="213" cy="205" r="38" fill="#fff8e8" stroke="#1d1a16" stroke-width="7"/>
      <circle cx="307" cy="203" r="35" fill="#fff8e8" stroke="#1d1a16" stroke-width="7"/>
      <circle cx="222" cy="215" r="8" fill="#171411"/><circle cx="296" cy="194" r="7" fill="#171411"/>`;
  }
  return `
    <path d="M171 202 C202 214 235 208 260 190" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
    <path d="M286 209 C315 221 350 218 370 201" fill="#fff8e8" stroke="#1d1a16" stroke-width="6"/>
    <circle cx="220" cy="207" r="7" fill="#171411"/>
    <circle cx="350" cy="212" r="9" fill="#171411"/>
    <path d="M169 183 C201 166 235 169 266 188" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>
    <path d="M293 188 C326 174 357 180 380 199" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/>`;
}

function mouthPath(mood) {
  if (mood === "derpy") {
    return `<path d="M213 259 C245 309 319 298 346 248" fill="#5b2722" stroke="#1d1a16" stroke-width="7" stroke-linejoin="round"/><path d="M236 263 L249 309 L270 262" fill="#fff8e8" stroke="#1d1a16" stroke-width="4"/><path d="M291 264 L309 291 L326 256" fill="#fff8e8" stroke="#1d1a16" stroke-width="4"/><path d="M276 293 C302 318 336 297 343 267" fill="#df8177" opacity="0.9"/><path d="M342 286 C362 299 366 319 354 337" fill="none" stroke="#5b2722" stroke-width="6" stroke-linecap="round" opacity="0.55"/><path d="M210 292 C225 307 244 313 266 310" fill="none" stroke="#1d1a16" stroke-width="4" stroke-linecap="round" opacity="0.36"/>`;
  }
  if (mood === "stuffed") {
    return `<path d="M218 265 C250 287 294 288 333 262" fill="#5b2722" stroke="#1d1a16" stroke-width="6" stroke-linejoin="round"/><circle cx="264" cy="277" r="10" fill="#c68632" stroke="#1d1a16" stroke-width="3"/><path d="M300 274 C315 282 329 275 337 257" fill="#e79083" opacity="0.78"/>`;
  }
  if (mood === "worried") {
    return `<path d="M229 276 C257 248 301 250 327 283" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/><path d="M245 296 C271 307 301 303 322 288" fill="none" stroke="#1d1a16" stroke-width="4" stroke-linecap="round" opacity="0.36"/>`;
  }
  if (mood === "lopsided") {
    return `<path d="M220 258 C249 309 320 290 340 239" fill="#5b2722" stroke="#1d1a16" stroke-width="7" stroke-linejoin="round"/><path d="M244 262 L257 300 L277 259" fill="#fff8e8" stroke="#1d1a16" stroke-width="4"/><path d="M298 266 L310 289 L325 256" fill="#fff8e8" stroke="#1d1a16" stroke-width="4"/><path d="M286 287 C308 306 332 291 338 261" fill="#df8177" opacity="0.86"/><path d="M216 250 C201 241 192 232 190 218" fill="none" stroke="#1d1a16" stroke-width="5" stroke-linecap="round" opacity="0.45"/><circle cx="345" cy="301" r="4" fill="#5b2722" opacity="0.6"/>`;
  }
  if (mood === "startled") {
    return `<ellipse cx="270" cy="263" rx="29" ry="37" fill="#5b2722" stroke="#1d1a16" stroke-width="6"/><path d="M252 286 C267 302 291 292 294 273" fill="#d88678" opacity="0.9"/><circle cx="249" cy="260" r="4" fill="#fff8e8"/>`;
  }
  if (mood === "flat") {
    return `<path d="M227 267 C256 255 292 261 316 278" fill="none" stroke="#1d1a16" stroke-width="8" stroke-linecap="round"/><path d="M315 279 C325 284 331 291 334 300" fill="none" stroke="#1d1a16" stroke-width="5" stroke-linecap="round"/>`;
  }
  if (mood === "scheming") {
    return `<path d="M227 260 C254 294 306 284 330 244" fill="#5b2722" stroke="#1d1a16" stroke-width="6" stroke-linejoin="round"/><path d="M270 278 L280 300 L291 276" fill="#fff8e8" stroke="#1d1a16" stroke-width="4"/><path d="M302 275 C318 280 328 272 334 254" fill="#e79083" opacity="0.85"/>`;
  }
  return `<path d="M218 263 C247 303 305 287 334 246" fill="#5b2722" stroke="#1d1a16" stroke-width="6" stroke-linejoin="round"/><path d="M248 261 L263 293 L279 260" fill="#fff8e8" stroke="#1d1a16" stroke-width="4"/><path d="M294 265 L304 284 L316 258" fill="#fff8e8" stroke="#1d1a16" stroke-width="4"/><path d="M284 286 C304 302 329 289 334 260" fill="#df8177" opacity="0.86"/><path d="M226 300 C255 311 293 306 323 284" fill="none" stroke="#1d1a16" stroke-width="4" stroke-linecap="round" opacity="0.34"/>`;
}

function snout(character) {
  return `
    <path d="M237 218 C261 195 303 202 320 225 C300 250 261 247 237 218 Z" fill="${character.dark}" opacity="0.92"/>
    <circle cx="270" cy="226" r="4" fill="#f2d9b0" opacity="0.52"/>
    <circle cx="299" cy="224" r="3.5" fill="#f2d9b0" opacity="0.42"/>
    <path d="M280 236 C271 246 258 251 244 247" fill="none" stroke="${character.dark}" stroke-width="4" stroke-linecap="round" opacity="0.58"/>
  `;
}

function goofyDetails(character) {
  const cheek = `<circle cx="176" cy="259" r="16" fill="#d98270" opacity="0.19"/><circle cx="354" cy="246" r="10" fill="#d98270" opacity="0.14"/>`;
  const whiskerMistake = `<path d="M88 278 C129 253 162 260 187 284" fill="none" stroke="${character.dark}" stroke-width="5" stroke-linecap="round" opacity="0.74"/><path d="M353 274 C393 247 430 249 462 274" fill="none" stroke="${character.dark}" stroke-width="5" stroke-linecap="round" opacity="0.72"/><path d="M102 242 C136 240 161 249 180 267" fill="none" stroke="${character.dark}" stroke-width="3" stroke-linecap="round" opacity="0.48"/>`;
  const scribble = `<path d="M198 321 C213 314 229 318 238 330 C222 327 211 331 202 341" fill="none" stroke="${character.dark}" stroke-width="4" stroke-linecap="round" opacity="0.28"/><path d="M334 313 C350 307 363 312 370 326" fill="none" stroke="${character.dark}" stroke-width="4" stroke-linecap="round" opacity="0.24"/>`;
  if (character.quirk === "sleepy-cheek") {
    return `${cheek}<path d="M194 232 C205 251 224 250 236 235" fill="none" stroke="${character.dark}" stroke-width="4" stroke-linecap="round" opacity="0.58"/><path d="M150 310 C174 297 194 301 209 321" fill="none" stroke="${character.dark}" stroke-width="5" stroke-linecap="round" opacity="0.42"/>${whiskerMistake}${scribble}`;
  }
  if (character.quirk === "big-frown") {
    return `${cheek}<path d="M209 292 C246 263 300 271 333 302" fill="none" stroke="${character.dark}" stroke-width="5" stroke-linecap="round" opacity="0.52"/><circle cx="372" cy="270" r="5" fill="#5b2722" opacity="0.45"/>${scribble}`;
  }
  if (character.quirk === "crumb-face") {
    return `${cheek}<circle cx="197" cy="286" r="6" fill="#8f6a2d" opacity="0.84"/><circle cx="221" cy="297" r="4" fill="#8f6a2d" opacity="0.74"/><circle cx="341" cy="278" r="5" fill="#8f6a2d" opacity="0.7"/><circle cx="305" cy="238" r="4" fill="#8f6a2d" opacity="0.66"/><path d="M360 297 C374 303 383 297 388 285" fill="none" stroke="${character.dark}" stroke-width="4" stroke-linecap="round" opacity="0.46"/>`;
  }
  if (character.quirk === "tiny-bandage") {
    return `${cheek}<g transform="rotate(-13 336 171)"><rect x="305" y="159" width="66" height="20" rx="9" fill="#f0d7bf" stroke="${character.dark}" stroke-width="4"/><path d="M327 162 L323 180 M349 161 L345 179" stroke="#b9896e" stroke-width="3"/></g>${scribble}`;
  }
  return `${cheek}${whiskerMistake}${scribble}`;
}

function uglyCuteDetails(character, mood) {
  const seed = character.id.length + mood.length;
  const extraDotX = 202 + (seed % 33);
  const extraDotY = 292 + (seed % 21);
  const snot =
    mood === "derpy" || mood === "worried"
      ? `<path d="M301 240 C313 257 308 276 294 283" fill="none" stroke="#b9ddd2" stroke-width="5" stroke-linecap="round" opacity="0.72"/><circle cx="294" cy="286" r="5" fill="#b9ddd2" opacity="0.62"/>`
      : "";
  return `
    ${snot}
    <circle cx="${extraDotX}" cy="${extraDotY}" r="3.5" fill="${character.dark}" opacity="0.42"/>
    <circle cx="${extraDotX + 21}" cy="${extraDotY + 9}" r="2.5" fill="${character.dark}" opacity="0.32"/>
    <path d="M174 331 C188 323 204 326 214 338" fill="none" stroke="${character.dark}" stroke-width="4" stroke-linecap="round" opacity="0.28"/>
    <path d="M353 319 C369 314 382 320 389 333" fill="none" stroke="${character.dark}" stroke-width="4" stroke-linecap="round" opacity="0.24"/>
  `;
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

function cleanSvg(svg) {
  return `${svg.replace(/[ \t]+$/gm, "").trim()}\n`;
}
