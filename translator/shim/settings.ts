// Equicord's definePluginSettings -> phoenix.settings.define.
// Equicord: settings.store.<key> reads the live value; options use `description`.
// Phoenix: settings.define({key:{type,title,description,default,options}}) returns an object
// whose properties read the live value. We adapt names and option types.

import { OptionType } from "./runtime";

interface EquiSettingDef {
  type: OptionType;
  description?: string;
  default?: unknown;
  options?: Array<{ label: string; value: string | number; default?: boolean }>;
  // ignored Equicord fields (markers, componentProps, restartNeeded, ...) are allowed
  [k: string]: unknown;
}

function toPhoenixSpec(key: string, s: EquiSettingDef): Record<string, unknown> | null {
  const title = (s.description as string) || key;
  const description = s.description as string | undefined;
  switch (s.type) {
    case OptionType.BOOLEAN:
      return { type: "switch", title, description, default: Boolean(s.default ?? false) };
    case OptionType.NUMBER:
    case OptionType.BIGINT:
    case OptionType.SLIDER:
      return { type: "number", title, description, default: Number(s.default ?? 0) };
    case OptionType.STRING:
      return { type: "text", title, description, default: String(s.default ?? "") };
    case OptionType.SELECT: {
      const options = (s.options ?? []).map((o) => ({ value: String(o.value), label: o.label }));
      const def = s.options?.find((o) => o.default)?.value ?? options[0]?.value;
      return { type: "select", title, description, options, default: def === undefined ? undefined : String(def) };
    }
    // COMPONENT / CUSTOM have no Phoenix equivalent; skipped so the page still builds.
    default:
      return null;
  }
}

export interface PluginSettings<S> {
  store: Record<string, unknown>;
  def: S;
  use(): Record<string, unknown>;
  withPrivateSettings<T>(): PluginSettings<S> & { store: Record<string, unknown> & T };
}

export function definePluginSettings<S extends Record<string, EquiSettingDef>>(def: S): PluginSettings<S> {
  const schema: Record<string, Record<string, unknown>> = {};
  const skipped: string[] = [];
  for (const [key, spec] of Object.entries(def)) {
    const ph = toPhoenixSpec(key, spec);
    if (ph) schema[key] = ph;
    else skipped.push(key);
  }

  // phoenix.settings.define registers the page and returns a live-reading values object.
  const values = Object.keys(schema).length ? phoenix.settings.define(schema as never) : ({} as Record<string, unknown>);

  // Skipped (COMPONENT/CUSTOM) keys fall back to their declared default so plugin reads don't throw.
  const store: Record<string, unknown> = new Proxy(values as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop in target) return (target as Record<string, unknown>)[prop];
      if (prop in def) return (def[prop] as EquiSettingDef).default;
      return undefined;
    },
    set(target, prop: string, value) {
      // Phoenix settings are read-only from code; accept writes to skipped keys only, in-memory.
      if (prop in (values as object)) return true;
      (target as Record<string, unknown>)[prop] = value;
      return true;
    },
  });

  const api: PluginSettings<S> = {
    store,
    def,
    use: () => store,
    withPrivateSettings: () => api as never,
  };
  return api;
}
