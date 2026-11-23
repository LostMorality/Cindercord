// @api/Commands -> phoenix.commands. Equicord passes parsed option arrays to execute();
// Phoenix passes one raw string. We expose the raw text under each declared option name so
// findOption(args, name) works for the common one-argument commands.

import { onCleanup } from "./runtime";

export const enum ApplicationCommandOptionType {
  SUB_COMMAND = 1,
  SUB_COMMAND_GROUP = 2,
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  USER = 6,
  CHANNEL = 7,
  ROLE = 8,
  MENTIONABLE = 9,
  NUMBER = 10,
  ATTACHMENT = 11,
}
export const enum ApplicationCommandInputType {
  BUILT_IN = 0,
  BUILT_IN_TEXT = 1,
  BUILT_IN_INTEGRATION = 2,
  BOT = 3,
  PLACEHOLDER = 4,
}

export interface CommandOption {
  name: string;
  description?: string;
  type?: ApplicationCommandOptionType;
  required?: boolean;
  options?: CommandOption[];
}
export interface CommandArgument {
  name: string;
  type: ApplicationCommandOptionType;
  value: string;
  focused?: boolean;
  options?: CommandArgument[];
}
export interface CommandContext {
  channel: { id: string };
  guild?: { id: string };
}
export interface Command {
  name: string;
  description?: string;
  options?: CommandOption[];
  inputType?: ApplicationCommandInputType;
  execute(args: CommandArgument[], ctx: CommandContext): unknown;
  [k: string]: unknown;
}

export const OptionalMessageOption: CommandOption = {
  name: "message",
  description: "Message to send",
  type: ApplicationCommandOptionType.STRING,
  required: false,
};
export const RequiredMessageOption: CommandOption = {
  name: "message",
  description: "Message to send",
  type: ApplicationCommandOptionType.STRING,
  required: true,
};

export function findOption<T = string>(args: CommandArgument[], name: string, fallback?: T): T {
  const o = args.find((a) => a.name === name);
  return (o?.value as unknown as T) ?? (fallback as T);
}

// Local "Clyde" style reply shown only on this device.
export function sendBotMessage(channelId: string, message: { content: string; author?: { username?: string } }) {
  const id = phoenix.messages.addLocal(channelId, message.content, {
    author: message.author?.username ?? "Clyde",
  });
  return { id, channel_id: channelId, content: message.content };
}

export function registerCommand(cmd: Command, _pluginName?: string) {
  const firstOpt = cmd.options?.[0]?.name ?? "message";
  const remove = phoenix.commands.register({
    name: cmd.name,
    description: cmd.description ?? "",
    execute: (raw, ctx) => {
      // Expose the whole raw string under each declared option name.
      const args: CommandArgument[] = (cmd.options ?? [{ name: firstOpt } as CommandOption]).map((o) => ({
        name: o.name,
        type: o.type ?? ApplicationCommandOptionType.STRING,
        value: raw,
      }));
      const cctx: CommandContext = { channel: { id: ctx.channelId ?? "" } };
      phoenix.log.info(`[Commands] /${cmd.name} ran`);
      const result = cmd.execute(args, cctx);
      // Equicord commands return void (they call sendMessage/sendBotMessage themselves) or
      // { content }. Phoenix sends a returned string/‑{content} as the message.
      if (typeof result === "string") return result;
      if (result && typeof result === "object" && "content" in result) {
        return { content: String((result as { content: unknown }).content) };
      }
      return undefined;
    },
  });
  onCleanup(remove);
  return remove;
}

export function unregisterCommand(_name: string) {
  /* handled by onCleanup/unload */
}

export default { registerCommand, unregisterCommand, findOption, sendBotMessage };
