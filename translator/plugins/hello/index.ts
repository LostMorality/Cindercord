// @name Cindercord Hello
// @description Demo: a slash command, a send transform and a setting, all through the translator.
// @version 1.0.0
// @author pops

import definePlugin, { OptionType } from "@utils/types";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import type { MessageObject } from "@api/MessageEvents";

const settings = definePluginSettings({
  suffix: {
    type: OptionType.STRING,
    description: "Text added to the end of every message you send",
    default: "",
  },
  shout: {
    type: OptionType.BOOLEAN,
    description: "Uppercase the /yell command text",
    default: true,
  },
});

export default definePlugin({
  name: "CindercordHello",
  description: "Demo plugin proving the Equicord translator works on Phoenix.",
  authors: [Devs.pops],
  settings,

  commands: [
    {
      name: "yell",
      description: "Send your text loudly",
      options: [{ name: "message", description: "what to yell", type: 3, required: true }],
      execute: (args: { name: string; value: string }[]) => {
        const text = args[0]?.value ?? "";
        return { content: settings.store.shout ? `${text.toUpperCase()}!!!` : `${text}!` };
      },
    },
  ],

  onBeforeMessageSend(_channelId: string, msg: MessageObject) {
    const suffix = settings.store.suffix as string;
    if (suffix && !msg.content.endsWith(suffix)) {
      msg.content = `${msg.content} ${suffix}`.trim();
    }
  },
});
