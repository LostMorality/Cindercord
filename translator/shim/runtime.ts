// Core of the translator: turns an Equicord-style `definePlugin({...})` into live
// registrations on pu's global `phoenix` object. The bundled plugin file runs top-level,
// so definePlugin() has the side effect of starting the plugin immediately.

import { registerCommand } from "./commands";
import { addPreSendListener, addPreEditListener, type MessageObject } from "./messageEvents";

export interface PluginAuthor {
  name: string;
  id?: bigint | string;
}

export interface PluginDef {
  name: string;
  description: string;
  authors: PluginAuthor[];
  // Equicord lifecycle. We ignore `patches` (web-only); a plugin that relies on them
  // should have had them rewritten for Phoenix before bundling.
  start?(): void | Promise<void>;
  stop?(): void | Promise<void>;
  settings?: unknown;
  // Everything else Equicord allows is accepted and ignored so plugin source compiles.
  [key: string]: unknown;
}

// Unload handlers the shim and the plugin register; run when the plugin is disabled/reloaded.
const cleanups: Array<() => void> = [];
export function onCleanup(fn: () => void): void {
  cleanups.push(fn);
}

let started = false;

export function definePlugin(def: PluginDef): PluginDef {
  // Phoenix loads one plugin per JS file, so there is exactly one definePlugin per bundle.
  if (started) {
    phoenix.log.warn(`[${def.name}] definePlugin called twice in one bundle; ignoring the second`);
    return def;
  }
  started = true;

  phoenix.onUnload(() => {
    for (const fn of cleanups.splice(0)) {
      try {
        fn();
      } catch (e) {
        phoenix.log.error(`[${def.name}] cleanup failed:`, String(e));
      }
    }
    try {
      void def.stop?.();
    } catch (e) {
      phoenix.log.error(`[${def.name}] stop() failed:`, String(e));
    }
  });

  // Equicord plugins that declare slash commands list them on the def; register each.
  // Static import; the runtime<->commands cycle is safe because both bindings are used only
  // at call time, and esbuild bundles everything into one file (no runtime module loader).
  const cmds = (def as { commands?: unknown }).commands;
  if (Array.isArray(cmds)) {
    for (const c of cmds) {
      try {
        registerCommand(c, def.name);
      } catch (e) {
        phoenix.log.error(`[${def.name}] command register failed:`, String(e));
      }
    }
  }

  // Equicord's MessageEventsAPI auto-wires these def methods; we do the same so plugins that
  // declare them (ClearURLs, etc.) run unchanged. `this` must stay bound to def.
  const obms = (def as { onBeforeMessageSend?: Function }).onBeforeMessageSend;
  if (typeof obms === "function") {
    addPreSendListener((cid: string, msg: MessageObject) => obms.call(def, cid, msg) as void | false);
  }
  const obme = (def as { onBeforeMessageEdit?: Function }).onBeforeMessageEdit;
  if (typeof obme === "function") {
    addPreEditListener((cid: string, mid: string, msg: MessageObject) => void obme.call(def, cid, mid, msg));
  }

  // start() may be async; run it after wiring so hooks are live immediately.
  try {
    const r = def.start?.();
    if (r instanceof Promise) r.catch((e) => phoenix.log.error(`[${def.name}] start() rejected:`, String(e)));
  } catch (e) {
    phoenix.log.error(`[${def.name}] start() failed:`, String(e));
  }
  return def;
}

// Equicord plugins often read `Devs` for author entries; we don't ship the roster, so any
// author reference resolves to a name-only stub via a Proxy.
export const Devs: Record<string, PluginAuthor> = new Proxy({}, {
  get: (_t, key) => ({ name: String(key), id: 0n }),
});
export const EquicordDevs = Devs;

export const enum OptionType {
  STRING,
  NUMBER,
  BIGINT,
  BOOLEAN,
  SELECT,
  SLIDER,
  COMPONENT,
  CUSTOM,
}
