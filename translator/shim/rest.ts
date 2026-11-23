// RestAPI + MessageActions -> phoenix.discord (Discord's own HTTP client, app session headers).
// Equicord: RestAPI.get({url,query,body}).then(r => r.body). We map to {ok,status,body,text}.

import { state } from "./state";

interface RestOpts {
  url: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
}
interface RestResult {
  ok: boolean;
  status: number;
  body: unknown;
  text: string;
}

function withQuery(url: string, query?: Record<string, unknown>): string {
  if (!query) return url;
  const q = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return q ? `${url}${url.includes("?") ? "&" : "?"}${q}` : url;
}

async function call(method: "get" | "post" | "put" | "patch" | "delete", o: RestOpts): Promise<RestResult> {
  const path = withQuery(o.url, o.query);
  // Never hand pu's Rust bindings an explicit `undefined` (it rejects those); leave the arg out instead.
  const init = o.headers ? { headers: o.headers } : {};
  const res =
    method === "get"
      ? await phoenix.discord.get(path, init)
      : method === "delete"
        ? await phoenix.discord.delete(path, init)
        : o.body === undefined
          ? await phoenix.discord[method](path)
          : await phoenix.discord[method](path, o.body as object | string, init);
  let body: unknown;
  const text = res.text();
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body, text };
}

export const RestAPI = {
  get: (o: RestOpts) => call("get", o),
  post: (o: RestOpts) => call("post", o),
  put: (o: RestOpts) => call("put", o),
  patch: (o: RestOpts) => call("patch", o),
  del: (o: RestOpts) => call("delete", o),
  delete: (o: RestOpts) => call("delete", o),
};
export default RestAPI;

function snowflake(): string {
  // Discord accepts any unique nonce; a timestamp-based value is fine for dedupe.
  return String(Date.now());
}

export const MessageActions = {
  sendMessage(channelId: string, message: { content: string; tts?: boolean }, _waitForChannelReady?: boolean, extra?: object) {
    return phoenix.discord.post(`/channels/${channelId}/messages`, {
      content: message.content,
      tts: message.tts ?? false,
      nonce: snowflake(),
      ...(extra ?? {}),
    });
  },
  receiveMessage(channelId: string, message: { content: string }) {
    // Local-only echo.
    return phoenix.messages.addLocal(channelId, message.content);
  },
  _sendMessage(channelId: string, message: { content: string }) {
    return this.sendMessage(channelId, message);
  },
};

export const SnowflakeUtils = {
  fromTimestamp: (ts: number) => String((BigInt(ts - 1420070400000) << 22n)),
  extractTimestamp: (id: string) => Number((BigInt(id) >> 22n) + 1420070400000n),
};

// Current-channel helper some plugins use.
export function getCurrentChannelId(): string | undefined {
  return state.selectedChannelId ?? undefined;
}
