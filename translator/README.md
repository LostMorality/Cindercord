# Cindercord translator: Equicord plugins on Discord Phoenix

Runs Equicord-style TypeScript plugins on **Discord Phoenix** (the native Rust Android client)
by translating Equicord's API onto phoenix-unlock's `phoenix` runtime object. Each plugin bundles
to one self-contained IIFE the Phoenix runtime loads, same model as phoenix-unlock plugins.

## Layout

```
mod/
  shim/            the translator layer (Equicord API -> phoenix.*)
    runtime.ts        definePlugin: starts the plugin, wires onBeforeMessageSend/Edit, commands, onUnload
    settings.ts       definePluginSettings -> phoenix.settings.define
    flux.ts           FluxDispatcher + Flux.Store -> phoenix gateway hooks (SNAKE_CASE -> camelCase)
    stores.ts         UserStore/ChannelStore/... backed by gateway events + phoenix.stores.sql (partial)
    rest.ts           RestAPI + MessageActions -> phoenix.discord
    messageEvents.ts  addPreSendListener -> phoenix.messages.onSend
    commands.ts       registerCommand/findOption/sendBotMessage -> phoenix.commands
    datastore.ts      DataStore -> phoenix.storage
    toast.ts          showToast/Toasts -> phoenix.ui.toast
    react.ts          minimal React stub (no DOM; settings panels don't render yet)
    common.ts         @webpack/common aggregator (real where supported, warn-stubs otherwise)
    webpack.js        @webpack finders -> catch-all stub (Phoenix has no webpack graph)
    constants.ts      @utils/constants (Devs roster -> name-only stubs)
    globals.ts        injected: fetch->phoenix.fetch, console, timers, URL/URLSearchParams polyfill
    _stub.js          catch-all CommonJS Proxy for any unmapped @api/@utils/@webpack import
    index.ts          @utils/types entry (definePlugin, OptionType, ...)
    phoenix.d.ts      pu's plugin API types (copied, read-only reference)
  plugins/
    hello/            demo: command + setting + send transform (all-translator, guaranteed to run)
    clearurls/        Equicord ClearURLs, copied verbatim, bundled through the shim
  build.mjs          esbuild bundler: aliases Equicord imports to shim/, outputs one IIFE per plugin
  out/               built bundles (<name>.js)
```

## Build

```
node build.mjs            # build all plugins
node build.mjs hello      # build one
```
Run `npm i` once to get esbuild (or set `ESBUILD_FROM` to a folder that already has it).
Bundles land in `out/`.

## Catalog

Every build (all or one plugin) also writes `out/index.json`, the catalog the in-app plugin drawer
reads. It lists every `out/*.js` bundle, not just the ones built this run:

```json
{"format":1,"name":"Equicord ports","plugins":[
  {"name":"clearurls","title":"ClearURLs","description":"...","version":"1.0.0",
   "author":"...","url":"<CATALOG_BASE>clearurls.js","crc32":123456789}]}
```

- `name` is the bundle file name without `.js` (what pu installs it as; `[A-Za-z0-9_-]` only,
  other file names are skipped with a warning). `title`, `description`, `version`, `author` come
  from the bundle's `// @name`, `// @description`, `// @version`, `// @author` banner lines.
- `crc32` is `node:zlib` crc32 of the exact bundle bytes, same as pu's `web/tools/bundle-plugins.mjs`.
- `url` = `CINDERCORD_CATALOG_BASE` + `<name>.js`. Set `CINDERCORD_CATALOG_BASE` to the https folder the bundles
  and `index.json` are hosted in; it must start with `https://` and end in `/`. Unset, no catalog
  is written. The published list lives in this repo's `plugins/` folder:
  `CINDERCORD_CATALOG_BASE=https://raw.githubusercontent.com/LostMorality/Cindercord/main/plugins/`.
  Copy `out/*.js` and `out/index.json` there together so the crc32 values match the hosted files.
- Demo plugins (a `// @demo` banner line, or a description starting "Demo:") build but stay out of
  the list.

## Status (2026-11-23)

- Translator builds and, tested in node against a fake `phoenix`, **runs** both plugins:
  - `hello`: `/yell hello there` -> `HELLO THERE!!!`; send suffix setting applies.
  - `clearurls` (unmodified Equicord): `...?utm_source=spam&id=5&fbclid=abc` -> `...?id=5`.
- Proven: definePlugin lifecycle, definePluginSettings, slash commands, onBeforeMessageSend,
  fetch shim, URL/URLSearchParams polyfill.
- **On-device test passed** (real phone, Phoenix 356.7): `/yell` sent `HELLO THERE!!!`, ClearURLs cleaned a
  sent link.
  Shim calls must never pass an explicit `undefined` to `phoenix.*` (pu's Rust bindings reject it).
- **Not yet done:** React-based settings panels (don't render on Phoenix, need native UI mapping);
  full store graph (member/guild/message, partial).

## How plugins map

`definePlugin({...})` runs immediately when the bundle loads (there is no module system at
runtime). It wires the Equicord lifecycle: `start()`, `onBeforeMessageSend`, `commands[]`, and
`onUnload` -> `stop()`. Unmapped imports resolve to `_stub.js` so any plugin compiles; the stub
logs once when an unsupported API is actually used, which is how we see what each plugin needs.

## Porting a plugin

1. Copy its `index.ts(x)` into `plugins/<name>/`.
2. `node build.mjs <name>`.
3. Check the build log and the bundle's `phoenix.*` calls; anything routed to `_stub` is an API
   the plugin needs that we haven't mapped (or genuinely can't on Phoenix, e.g. webpack patches).
4. Load `out/<name>.js` into a Phoenix build and test on device.
