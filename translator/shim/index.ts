// The entry Equicord plugin code reaches for definePlugin, OptionType, Devs, settings, logging.
// esbuild aliases map Equicord's import specifiers to this file and the sibling shims.

export { definePlugin, definePlugin as default, Devs, EquicordDevs, OptionType, onCleanup } from "./runtime";
export type { PluginDef, PluginAuthor } from "./runtime";
export { definePluginSettings } from "./settings";
export { Logger } from "./logger";
export { makeRange } from "./util";
