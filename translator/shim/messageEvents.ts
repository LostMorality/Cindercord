// @api/MessageEvents -> phoenix.messages.onSend / UI accessories.
// Equicord's MessageObject on send: { content }. Listeners may mutate it in place or return false.

import { onCleanup } from "./runtime";

export interface MessageObject {
  content: string;
  // Equicord also exposes validNonShortcutEmojis etc.; we only carry content on Phoenix.
  [k: string]: unknown;
}

export type SendListener = (
  channelId: string,
  messageObj: MessageObject,
  extra?: Record<string, unknown>,
) => void | false | Promise<void | false>;
export type EditListener = (channelId: string, messageId: string, messageObj: MessageObject) => void;

const sendListeners = new Set<SendListener>();
const editListeners = new Set<EditListener>();

let wired = false;
function wire() {
  if (wired) return;
  wired = true;
  // One pu interceptor drives every registered pre-send listener.
  const remove = phoenix.messages.onSend((text, ctx) => {
    const msg: MessageObject = { content: text };
    for (const l of sendListeners) {
      try {
        const r = l(ctx.channelId ?? "", msg, {});
        if (r === false) {
          phoenix.log.info("[MessageEvents] send cancelled by a plugin");
          return false;
        }
      } catch (e) {
        phoenix.log.error("[MessageEvents] send listener failed:", String(e));
      }
    }
    // Lengths only: never log message text.
    phoenix.log.info(
      `[MessageEvents] send seen, ${msg.content === text ? "unchanged" : `rewritten ${text.length} -> ${msg.content.length} chars`}`,
    );
    return msg.content;
  });
  onCleanup(remove);
}

export function addPreSendListener(listener: SendListener): SendListener {
  wire();
  sendListeners.add(listener);
  return listener;
}
export function removePreSendListener(listener: SendListener): boolean {
  return sendListeners.delete(listener);
}
// Phoenix has no outgoing-edit hook yet; accept listeners so plugins load, but they won't fire.
export function addPreEditListener(listener: EditListener): EditListener {
  editListeners.add(listener);
  phoenix.log.warn("[MessageEvents] pre-edit listeners are not supported on Phoenix yet");
  return listener;
}
export function removePreEditListener(listener: EditListener): boolean {
  return editListeners.delete(listener);
}

// Message clicks / other MessageEvents hooks are no-ops for now.
export function addClickListener() {
  phoenix.log.warn("[MessageEvents] click listeners are not supported on Phoenix yet");
  return () => {};
}
export function removeClickListener() {}

export default {
  addPreSendListener,
  removePreSendListener,
  addPreEditListener,
  removePreEditListener,
  addClickListener,
  removeClickListener,
};
