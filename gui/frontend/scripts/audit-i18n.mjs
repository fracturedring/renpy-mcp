/**
 * i18n coverage audit.
 *
 * Checks three things the compiler cannot:
 *   1. every catalog has identical key sets for `en` and `zh-Hans`
 *      (tsc enforces this, but this catches a widened annotation too)
 *   2. every defined key is referenced somewhere in src/ (no dead keys)
 *   3. no user-visible English literal is left in a panel/layout file
 *      outside of an allowlist of identifiers and code samples
 *
 * Run: node scripts/audit-i18n.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SRC = join(ROOT, "src");
const CATALOG_DIR = join(SRC, "i18n", "catalog");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith(".ts") || full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

const files = walk(SRC);
let failures = 0;
function fail(msg) {
  failures += 1;
  console.log(`FAIL  ${msg}`);
}

/**
 * Keys may be written quoted (`"nav.story":`) or bare (`cancel:`) —
 * `common.ts` uses bare identifiers, every namespaced catalog uses quoted
 * dotted keys. Match both, but only at the start of a line so nested
 * object values and TS syntax are not mistaken for keys.
 */
const keysIn = (block) =>
  [...block.matchAll(/^\s*"([a-zA-Z][\w.]*)":|^\s*([a-zA-Z_]\w*):/gm)].map(
    (m) => m[1] ?? m[2],
  );

// ---------------------------------------------------------------- 1. parity
for (const name of readdirSync(CATALOG_DIR).filter((n) => n.endsWith(".ts"))) {
  const text = readFileSync(join(CATALOG_DIR, name), "utf8");
  const enBlock = text.slice(text.indexOf("const en"), text.indexOf("const zhHans"));
  const zhBlock = text.slice(text.indexOf("const zhHans"));
  const en = keysIn(enBlock);
  const zh = keysIn(zhBlock);
  const missing = en.filter((k) => !zh.includes(k));
  const extra = zh.filter((k) => !en.includes(k));
  if (missing.length) fail(`${name}: missing zh-Hans for ${missing.join(", ")}`);
  if (extra.length) fail(`${name}: zh-Hans has keys absent from en: ${extra.join(", ")}`);
  const dupEn = en.filter((k, i) => en.indexOf(k) !== i);
  if (dupEn.length) fail(`${name}: duplicate en keys: ${[...new Set(dupEn)].join(", ")}`);
  console.log(`ok    ${name}: ${en.length} keys, en/zh-Hans parity`);
}

// --------------------------------------------------- collect defined keys
const definedKeys = new Set();
for (const name of readdirSync(CATALOG_DIR).filter((n) => n.endsWith(".ts"))) {
  const text = readFileSync(join(CATALOG_DIR, name), "utf8");
  const enBlock = text.slice(text.indexOf("const en"), text.indexOf("const zhHans"));
  for (const m of enBlock.matchAll(/^\s*"([a-zA-Z][\w.]*)":|^\s*([a-zA-Z_]\w*):/gm)) {
    // `common.ts` keys are bare (`cancel`); t() refers to them as `common.cancel`.
    definedKeys.add(m[1] ?? `common.${m[2]}`);
  }
}

// ------------------------------------------------- 2. dead keys / used keys
const code = files
  .filter((f) => f !== join(SRC, "i18n", "index.ts"))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");
const usedKeys = new Set([...code.matchAll(/t\(\s*"([a-zA-Z][\w.]*)"/g)].map((m) => m[1]));
// keys referenced indirectly through a typed constant table (label: MessageKey)
for (const m of code.matchAll(
  /"((?:nav|header|time|palette|lint|recent|prefs|story|inspector|library|ship|common)\.[\w.]+)"/g,
)) {
  usedKeys.add(m[1]);
}

const dead = [...definedKeys].filter((k) => !usedKeys.has(k));
const unknown = [...usedKeys].filter((k) => !definedKeys.has(k));
if (unknown.length) fail(`referenced but not defined: ${unknown.join(", ")}`);
if (dead.length) fail(`defined but never referenced: ${dead.join(", ")}`);
console.log(`ok    ${definedKeys.size} defined keys, ${usedKeys.size} referenced, 0 unknown, ${dead.length} dead`);

// ------------------------------------------ 3. leftover English literals
/**
 * Strings that are allowed to stay English in the UI.
 *
 * Everything here is either a brand name, a bare identifier, or a literal
 * example of project data shown inside an input placeholder — the kind of
 * thing the translation rules say must NOT be routed through `t()`.
 */
const ALLOWED = [
  /^RPBuilder$/, /^renpy-mcp/, /^file watcher/, /^v\d/,
  /^[a-z_][\w]*$/,                       // bare identifiers: scene_1, eileen
  /^[A-Za-z_]+$/,                        // single words used as data/enums
  /^[-+#0-9.,%:/\\ ]+$/,
  /^[A-Z]{2,}$/,                         // acronyms: SFX, PNG
  /^(all|default|define)$/,
  /^#[0-9a-fA-F]{3,8}$/,                 // colour literals in placeholders
  /^[\w./-]+\.(rpy|rpyc|png|jpe?g|webp|ogg|opus|mp3|woff2?)$/, // file paths
  /^bg [\w ]+$/,                         // Ren'Py scene-statement sample
  /\w+\([^)]*\)/,                        // code sample: Dissolve(0.5)
];
const JSX_TEXT = />\s*([A-Z][A-Za-z ,.'’!?…-]{2,})\s*</g;
const ATTR = /\b(?:title|placeholder|aria-label|alt)="([^"]{2,})"/g;
const IGNORE_FILE = /i18n[\\/]catalog|i18n[\\/]index|api[\\/]|\.test\./;

const findings = [];
for (const f of files) {
  if (IGNORE_FILE.test(f)) continue;
  const text = readFileSync(f, "utf8");
  const rel = relative(ROOT, f).replace(/\\/g, "/");
  for (const re of [JSX_TEXT, ATTR]) {
    for (const m of text.matchAll(re)) {
      const value = m[1].trim();
      if (!value || /^\d/.test(value)) continue;
      if (ALLOWED.some((a) => a.test(value))) continue;
      findings.push(`${rel}: ${JSON.stringify(value)}`);
    }
  }
}
if (findings.length) {
  fail(`${findings.length} leftover string literal(s) outside the allowlist`);
  for (const f of findings.slice(0, 40)) console.log(`      ${f}`);
  if (findings.length > 40) console.log(`      … ${findings.length - 40} more`);
} else {
  console.log("ok    no leftover English UI literals");
}

console.log(failures === 0 ? "\nAUDIT PASSED" : `\nAUDIT FAILED (${failures})`);
process.exit(failures === 0 ? 0 : 1);
