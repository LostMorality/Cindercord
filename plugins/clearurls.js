// @name ClearURLs
// @description Automatically removes tracking elements from URLs you send
// @version 1.0.0
// @author Vendicated, thororen (port: pops)

(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // shim/globals.ts
  if (typeof globalThis.fetch === "undefined") {
    globalThis.fetch = async (url, init) => {
      const res = init && typeof init === "object" ? await phoenix.fetch(String(url), init) : await phoenix.fetch(String(url));
      return {
        ok: res.ok,
        status: res.status,
        headers: { get: () => null },
        text: async () => res.text(),
        json: async () => res.json(),
        async arrayBuffer() {
          const t = res.text();
          const buf = new ArrayBuffer(t.length);
          const view = new Uint8Array(buf);
          for (let i = 0; i < t.length; i++) view[i] = t.charCodeAt(i) & 255;
          return buf;
        }
      };
    };
  }
  if (typeof globalThis.console === "undefined") {
    globalThis.console = {
      log: (...a) => phoenix.log.info(...a),
      info: (...a) => phoenix.log.info(...a),
      warn: (...a) => phoenix.log.warn(...a),
      error: (...a) => phoenix.log.error(...a),
      debug: (...a) => phoenix.log.debug(...a)
    };
  }
  if (typeof globalThis.setTimeout === "undefined") {
    globalThis.setTimeout = (fn) => {
      Promise.resolve().then(() => {
        try {
          fn();
        } catch (e) {
          phoenix.log.error("[setTimeout]", String(e));
        }
      });
      return 0;
    };
    globalThis.clearTimeout = () => {
    };
    globalThis.setInterval = () => 0;
    globalThis.clearInterval = () => {
    };
  }
  if (typeof globalThis.URLSearchParams === "undefined") {
    class SearchParams {
      constructor(init) {
        __publicField(this, "pairs", []);
        let s = init ?? "";
        if (s.startsWith("?")) s = s.slice(1);
        if (s) {
          for (const part of s.split("&")) {
            if (!part) continue;
            const eq = part.indexOf("=");
            const k = eq === -1 ? part : part.slice(0, eq);
            const v = eq === -1 ? "" : part.slice(eq + 1);
            this.pairs.push([decodeURIComponent(k.replace(/\+/g, " ")), decodeURIComponent(v.replace(/\+/g, " "))]);
          }
        }
      }
      get(k) {
        const p = this.pairs.find((x) => x[0] === k);
        return p ? p[1] : null;
      }
      getAll(k) {
        return this.pairs.filter((x) => x[0] === k).map((x) => x[1]);
      }
      has(k) {
        return this.pairs.some((x) => x[0] === k);
      }
      set(k, v) {
        const p = this.pairs.find((x) => x[0] === k);
        if (p) p[1] = String(v);
        else this.pairs.push([k, String(v)]);
      }
      append(k, v) {
        this.pairs.push([k, String(v)]);
      }
      delete(k) {
        this.pairs = this.pairs.filter((x) => x[0] !== k);
      }
      forEach(fn) {
        for (const [k, v] of this.pairs) fn(v, k);
      }
      entries() {
        return this.pairs[Symbol.iterator]();
      }
      keys() {
        return this.pairs.map((x) => x[0])[Symbol.iterator]();
      }
      [Symbol.iterator]() {
        return this.pairs[Symbol.iterator]();
      }
      toString() {
        return this.pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
      }
    }
    globalThis.URLSearchParams = SearchParams;
    class SimpleURL {
      constructor(input, base) {
        __publicField(this, "protocol", "");
        __publicField(this, "hostname", "");
        __publicField(this, "port", "");
        __publicField(this, "pathname", "");
        __publicField(this, "hash", "");
        __publicField(this, "searchParams");
        __publicField(this, "_search", "");
        let url = String(input);
        if (base && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
          const b = new SimpleURL(base);
          url = url.startsWith("/") ? `${b.protocol}//${b.host}${url}` : `${b.protocol}//${b.host}${b.pathname.replace(/\/[^/]*$/, "/")}${url}`;
        }
        const m = /^([a-z][a-z0-9+.-]*:)\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(url);
        if (!m) throw new TypeError(`Invalid URL: ${input}`);
        this.protocol = m[1].toLowerCase();
        const authority = m[2];
        const host = authority.includes("@") ? authority.split("@").pop() : authority;
        const colon = host.lastIndexOf(":");
        if (colon > -1 && /^\d+$/.test(host.slice(colon + 1))) {
          this.hostname = host.slice(0, colon);
          this.port = host.slice(colon + 1);
        } else {
          this.hostname = host;
        }
        this.pathname = m[3] || "/";
        this._search = m[4] || "";
        this.hash = m[5] || "";
        this.searchParams = new SearchParams(this._search);
      }
      get host() {
        return this.port ? `${this.hostname}:${this.port}` : this.hostname;
      }
      get search() {
        const s = this.searchParams.toString();
        return s ? `?${s}` : "";
      }
      get origin() {
        return `${this.protocol}//${this.host}`;
      }
      get href() {
        return `${this.protocol}//${this.host}${this.pathname}${this.search}${this.hash}`;
      }
      toString() {
        return this.href;
      }
    }
    globalThis.URL = SimpleURL;
  }

  // shim/commands.ts
  function registerCommand(cmd, _pluginName) {
    const firstOpt = cmd.options?.[0]?.name ?? "message";
    const remove = phoenix.commands.register({
      name: cmd.name,
      description: cmd.description ?? "",
      execute: (raw, ctx) => {
        const args = (cmd.options ?? [{ name: firstOpt }]).map((o) => ({
          name: o.name,
          type: o.type ?? 3 /* STRING */,
          value: raw
        }));
        const cctx = { channel: { id: ctx.channelId ?? "" } };
        phoenix.log.info(`[Commands] /${cmd.name} ran`);
        const result = cmd.execute(args, cctx);
        if (typeof result === "string") return result;
        if (result && typeof result === "object" && "content" in result) {
          return { content: String(result.content) };
        }
        return void 0;
      }
    });
    onCleanup(remove);
    return remove;
  }

  // shim/messageEvents.ts
  var sendListeners = /* @__PURE__ */ new Set();
  var editListeners = /* @__PURE__ */ new Set();
  var wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    const remove = phoenix.messages.onSend((text, ctx) => {
      const msg = { content: text };
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
      phoenix.log.info(
        `[MessageEvents] send seen, ${msg.content === text ? "unchanged" : `rewritten ${text.length} -> ${msg.content.length} chars`}`
      );
      return msg.content;
    });
    onCleanup(remove);
  }
  function addPreSendListener(listener) {
    wire();
    sendListeners.add(listener);
    return listener;
  }
  function addPreEditListener(listener) {
    editListeners.add(listener);
    phoenix.log.warn("[MessageEvents] pre-edit listeners are not supported on Phoenix yet");
    return listener;
  }

  // shim/runtime.ts
  var cleanups = [];
  function onCleanup(fn) {
    cleanups.push(fn);
  }
  var started = false;
  function definePlugin(def) {
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
    const cmds = def.commands;
    if (Array.isArray(cmds)) {
      for (const c of cmds) {
        try {
          registerCommand(c, def.name);
        } catch (e) {
          phoenix.log.error(`[${def.name}] command register failed:`, String(e));
        }
      }
    }
    const obms = def.onBeforeMessageSend;
    if (typeof obms === "function") {
      addPreSendListener((cid, msg) => obms.call(def, cid, msg));
    }
    const obme = def.onBeforeMessageEdit;
    if (typeof obme === "function") {
      addPreEditListener((cid, mid, msg) => void obme.call(def, cid, mid, msg));
    }
    try {
      const r = def.start?.();
      if (r instanceof Promise) r.catch((e) => phoenix.log.error(`[${def.name}] start() rejected:`, String(e)));
    } catch (e) {
      phoenix.log.error(`[${def.name}] start() failed:`, String(e));
    }
    return def;
  }
  var Devs = new Proxy({}, {
    get: (_t, key) => ({ name: String(key), id: 0n })
  });

  // plugins/clearurls/index.ts
  var CLEAR_URLS_JSON_URL = "https://raw.githubusercontent.com/ClearURLs/Rules/master/data.min.json";
  var index_default = definePlugin({
    name: "ClearURLs",
    description: "Automatically removes tracking elements from URLs you send",
    dependencies: ["MessageEventsAPI"],
    tags: ["Privacy", "Utility"],
    authors: [Devs.adryd, Devs.thororen],
    rules: [],
    async start() {
      await this.createRules();
    },
    stop() {
      this.rules = [];
    },
    onBeforeMessageSend(_, msg) {
      return this.cleanMessage(msg);
    },
    onBeforeMessageEdit(_cid, _mid, msg) {
      return this.cleanMessage(msg);
    },
    async createRules() {
      const res = await fetch(CLEAR_URLS_JSON_URL).then((res2) => res2.json());
      this.rules = [];
      for (const [name, provider] of Object.entries(res.providers)) {
        const urlPattern = new RegExp(provider.urlPattern, "i");
        const rules = provider.rules?.map((rule) => new RegExp(rule, "i"));
        const rawRules = provider.rawRules?.map((rule) => new RegExp(rule, "i"));
        const exceptions = provider.exceptions?.map((ex) => new RegExp(ex, "i"));
        this.rules.push({
          name,
          urlPattern,
          rules,
          rawRules,
          exceptions
        });
      }
    },
    replacer(match) {
      try {
        var url = new URL(match);
      } catch (error) {
        return match;
      }
      if (url.searchParams.entries().next().done) return match;
      this.rules.forEach(({ urlPattern, exceptions, rawRules, rules }) => {
        if (!urlPattern.test(url.href) || exceptions?.some((ex) => ex.test(url.href))) return;
        const toDelete = [];
        if (rules) {
          url.searchParams.forEach((_, param) => {
            if (rules.some((rule) => rule.test(param))) {
              toDelete.push(param);
            }
          });
        }
        toDelete.forEach((param) => url.searchParams.delete(param));
        let cleanedUrl = url.href;
        rawRules?.forEach((rawRule) => {
          cleanedUrl = cleanedUrl.replace(rawRule, "");
        });
        url = new URL(cleanedUrl);
      });
      return url.toString();
    },
    cleanMessage(msg) {
      if (/http(s)?:\/\//.test(msg.content)) {
        msg.content = msg.content.replace(
          /(https?:\/\/[^\s<]+[^<.,:;"'>)|\]\s])/g,
          (match) => this.replacer(match)
        );
      }
    }
  });
})();
