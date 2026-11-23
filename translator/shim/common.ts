// @webpack/common aggregator: the names Equicord plugins import most. Real implementations
// where Phoenix supports them; warn-stubs otherwise so a plugin loads and its supported parts
// run. A stub logs once when first touched so we can see what a given plugin actually needs.

export * from "./stores";
export { FluxDispatcher, Flux } from "./flux";
export { RestAPI, MessageActions, SnowflakeUtils } from "./rest";
export { Toasts, showToast } from "./toast";
export { React } from "./react";
import { React } from "./react";

const warned = new Set<string>();
function stub(name: string): unknown {
  return new Proxy(
    function () {} as unknown as object,
    {
      get(_t, prop: string) {
        if (prop === Symbol.toPrimitive || prop === "then") return undefined;
        if (!warned.has(name)) {
          warned.add(name);
          phoenix.log.warn(`[common] ${name} is not available on Phoenix (plugin touched .${String(prop)})`);
        }
        return undefined;
      },
      apply() {
        if (!warned.has(name)) {
          warned.add(name);
          phoenix.log.warn(`[common] ${name}() is not available on Phoenix`);
        }
        return undefined;
      },
    },
  );
}

// React hook re-exports (from the stub) so `import { useState } from "@webpack/common"` works.
export const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect, useReducer } = React;

// Commonly imported, genuinely stubbed for now.
export const Constants = stub("Constants") as Record<string, unknown>;
export const Parser = stub("Parser") as Record<string, unknown>;
export const NavigationRouter = stub("NavigationRouter") as Record<string, unknown>;
export const Clipboard = {
  copy: (_text: string) => phoenix.log.warn("[common] Clipboard.copy needs the Android helper dex (todo)"),
  SUPPORTS_COPY: false,
};
export const Alerts = {
  show: (opts: { title?: string; body?: string }) =>
    phoenix.ui.choose({ title: opts.title, message: opts.body, options: ["OK"] }),
  close: () => {},
};
export const Menu = stub("Menu") as Record<string, unknown>;
export const ContextMenuApi = stub("ContextMenuApi") as Record<string, unknown>;
export const Tooltip = stub("Tooltip");
export const Button = stub("Button");
export const Text = stub("Text");
export const Forms = stub("Forms") as Record<string, unknown>;
export const TextInput = stub("TextInput");
export const Select = stub("Select");
export const Switch = stub("Switch");
export const Clickable = stub("Clickable");
export const Card = stub("Card");
export const useStateFromStores = <T>(_stores: unknown[], getter: () => T): T => getter();
export const moment = stub("moment");
export const hljs = stub("hljs");
export const lodash = stub("lodash");
export const i18n = stub("i18n") as Record<string, unknown>;
export const PermissionsBits = stub("PermissionsBits") as Record<string, bigint>;
export const GuildRoleStore = stub("GuildRoleStore") as Record<string, unknown>;
export const IconUtils = stub("IconUtils") as Record<string, unknown>;
export const openModal = (_render: unknown) => {
  phoenix.log.warn("[common] openModal has no Phoenix equivalent; use phoenix.ui.choose");
  return "";
};
export const closeModal = (_key?: string) => {};
export const ModalRoot = stub("ModalRoot");
export const ModalContent = stub("ModalContent");
