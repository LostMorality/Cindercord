// Bundle each plugin in mod/plugins/<name>/ (entry index.ts or index.tsx) into one IIFE in
// mod/out/<name>.js, with the Equicord-shim imports aliased to mod/shim/*. The output is a
// single self-contained file the Phoenix runtime loads, same model as phoenix-unlock plugins.
//
// usage: node build.mjs            (build all)
//        node build.mjs textreplace   (build one)

import { createRequire } from "node:module";
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32 } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const SHIM = join(HERE, "shim");
const PLUGINS = join(HERE, "plugins");
const OUT = join(HERE, "out");

// esbuild: a normal install (npm i in this folder) first, else an Equicord checkout next to
// this project (ESBUILD_FROM=<folder with node_modules/esbuild> overrides both).
function loadEsbuild() {
  const tries = [
    process.env.ESBUILD_FROM,
    HERE,
    join(HERE, "..", "..", "Equicord"),
  ].filter(Boolean);
  for (const dir of tries) {
    try {
      return createRequire(join(dir, "noop.js"))("esbuild");
    } catch {}
  }
  console.error("! esbuild not found: run `npm i` here, or set ESBUILD_FROM to a folder that has it");
  process.exit(1);
}
const esbuild = loadEsbuild();

// Equicord import specifier -> shim file.
const EXACT = {
  "@utils/types": "index.ts",
  "@utils/constants": "constants.ts",
  "@utils/Logger": "logger.ts",
  "@utils/index": "util.ts",
  "@utils": "util.ts",
  "@api/Settings": "settings.ts",
  "@api/Commands": "commands.ts",
  "@api/MessageEvents": "messageEvents.ts",
  "@api/DataStore": "datastore.ts",
  "@webpack/common": "common.ts",
  "@webpack": "webpack.js",
  "@shared/SettingsStore": "_stub.js",
};

const aliasPlugin = {
  name: "equicord-alias",
  setup(build) {
    // CSS / SCSS imports -> empty module (Phoenix has no stylesheet layer).
    build.onResolve({ filter: /\.s?css$/ }, () => ({ path: "css", namespace: "empty" }));
    build.onLoad({ filter: /.*/, namespace: "empty" }, () => ({ contents: "export default {};" }));

    build.onResolve({ filter: /^@/ }, (args) => {
      if (EXACT[args.path]) return { path: join(SHIM, EXACT[args.path]) };
      // Known util subpaths we route to the util shim.
      if (/^@utils\/(text|misc|react|margins)$/.test(args.path)) return { path: join(SHIM, "util.ts") };
      // Everything else under our known alias roots -> catch-all stub.
      if (/^@(api|utils|webpack|components|shared|plugins|equicordplugins|main)\b/.test(args.path)) {
        return { path: join(SHIM, "_stub.js") };
      }
      return null; // let esbuild try node resolution (should not happen)
    });
  },
};

function headerBanner(entry) {
  // Pull the plugin's // @ header lines (name/description/version/author) if present, so the
  // Phoenix runtime shows metadata. Fall back to a minimal banner.
  const src = readFileSync(entry, "utf8");
  const lines = src.split(/\r?\n/).filter((l) => /^\s*\/\/\s*@\w+/.test(l));
  if (lines.length) return lines.map((l) => l.trim()).join("\n");
  return "// @name " + entry;
}

async function build(name) {
  const dir = join(PLUGINS, name);
  const entry = ["index.ts", "index.tsx", "index.js"].map((f) => join(dir, f)).find(existsSync);
  if (!entry) {
    console.error(`! ${name}: no index.ts/tsx/js`);
    return false;
  }
  const meta = join(dir, "banner.txt");
  const banner = existsSync(meta) ? readFileSync(meta, "utf8") : headerBanner(entry);
  mkdirSync(OUT, { recursive: true });
  const outfile = join(OUT, `${name}.js`);
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    format: "iife",
    target: "es2021",
    platform: "neutral",
    legalComments: "none",
    minify: false,
    outfile,
    banner: { js: banner },
    inject: [join(SHIM, "globals.ts")],
    plugins: [aliasPlugin],
    loader: { ".ts": "ts", ".tsx": "tsx", ".js": "js" },
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    logLevel: "info",
  });
  console.log(`✓ ${name} -> out/${name}.js (${statSync(outfile).size} bytes)`);
  return true;
}

// Catalog (format 1) for the in-app plugin drawer: one entry per plugin folder in plugins/
// that has a bundle in out/, so bundles of deleted or renamed plugins are not published.
// crc32 matches pu's web/tools/bundle-plugins.mjs so update checks line up. Demos (a banner
// with @demo, or a description starting "Demo:") stay out of it.
//
// CINDERCORD_CATALOG_BASE is where the bundles will be hosted. Without it no catalog is written (and
// a stale out/index.json is removed), so a placeholder catalog can never be published.
const SAFE_NAME = /^[A-Za-z0-9_-]+$/;

function bannerMeta(src) {
  const meta = {};
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\s*\/\/\s*@(\w+)\s*(.*)$/);
    if (m) {
      if (!(m[1] in meta)) meta[m[1]] = m[2].trim();
      continue;
    }
    if (line.trim()) break; // banner is the leading run of // @ lines
  }
  return meta;
}

// The app takes "https://<host>/.../" with no user, query or fragment, and joins names onto it.
function baseOk(base) {
  if (/\s/.test(base) || !base.endsWith("/")) return false;
  let u;
  try {
    u = new URL(base);
  } catch {
    return false;
  }
  return u.protocol === "https:" && !!u.hostname && !u.search && !u.hash && !u.username && !u.password
    && u.href === base;
}

function isDemo(meta) {
  return "demo" in meta || /^demo:/i.test(meta.description || "");
}

function writeCatalog(names) {
  const index = join(OUT, "index.json");
  const base = process.env.CINDERCORD_CATALOG_BASE;
  if (!base) {
    if (existsSync(index)) rmSync(index);
    console.warn("! CINDERCORD_CATALOG_BASE not set: no catalog written (hosting is not set up yet)");
    return true;
  }
  if (!baseOk(base)) {
    console.error(`! CINDERCORD_CATALOG_BASE must be a plain https URL ending in "/" (no query, fragment or login): ${base}`);
    return false;
  }
  const plugins = [];
  for (const name of [...names].sort()) {
    const file = `${name}.js`;
    if (!SAFE_NAME.test(name)) {
      console.warn(`! catalog: skipping ${file} (name must be [A-Za-z0-9_-])`);
      continue;
    }
    if (!existsSync(join(OUT, file))) {
      console.warn(`! catalog: skipping ${name} (no out/${file}, build it first)`);
      continue;
    }
    const bytes = readFileSync(join(OUT, file));
    const meta = bannerMeta(bytes.toString("utf8"));
    if (isDemo(meta)) {
      console.log(`catalog: leaving out demo ${name}`);
      continue;
    }
    plugins.push({
      name,
      ...(meta.name && meta.name !== name && { title: meta.name }),
      ...(meta.description && { description: meta.description }),
      ...(meta.version && { version: meta.version }),
      ...(meta.author && { author: meta.author }),
      url: base + file,
      crc32: crc32(bytes),
    });
  }
  writeFileSync(index, JSON.stringify({ format: 1, name: "Equicord ports", plugins }, null, 2) + "\n");
  console.log(`catalog: out/index.json (${plugins.length} plugins)`);
  return true;
}

const pluginDirs = readdirSync(PLUGINS).filter((d) => statSync(join(PLUGINS, d)).isDirectory());
const want = process.argv.slice(2);
const names = want.length ? want : pluginDirs;
let ok = 0;
for (const n of names) if (await build(n)) ok++;
console.log(`built ${ok}/${names.length}`);
const catalogOk = writeCatalog(pluginDirs);
process.exit(ok === names.length && catalogOk ? 0 : 1);
