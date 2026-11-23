// Web globals QuickJS may not provide, mapped onto the phoenix host. Injected into every plugin
// bundle (esbuild `inject`), guarded so we never clobber a real implementation the runtime has.
// If the runtime already defines these, these blocks are skipped.

declare const globalThis: Record<string, unknown>;

// fetch -> phoenix.fetch, shaped like the web Response the plugins expect.
if (typeof (globalThis as { fetch?: unknown }).fetch === "undefined") {
  (globalThis as { fetch?: unknown }).fetch = async (url: string, init?: unknown) => {
    // pu's Rust side takes a *missing* init but rejects an explicit `undefined`, so only pass a real object.
    const res = init && typeof init === "object"
      ? await phoenix.fetch(String(url), init as never)
      : await phoenix.fetch(String(url));
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
        for (let i = 0; i < t.length; i++) view[i] = t.charCodeAt(i) & 0xff;
        return buf;
      },
    };
  };
}

// console -> phoenix.log, so plugin console.* lines show up in logcat.
if (typeof (globalThis as { console?: unknown }).console === "undefined") {
  (globalThis as { console?: unknown }).console = {
    log: (...a: unknown[]) => phoenix.log.info(...a),
    info: (...a: unknown[]) => phoenix.log.info(...a),
    warn: (...a: unknown[]) => phoenix.log.warn(...a),
    error: (...a: unknown[]) => phoenix.log.error(...a),
    debug: (...a: unknown[]) => phoenix.log.debug(...a),
  };
}

// Timers: QuickJS has no host event loop by default. If the runtime provides them, we keep them;
// otherwise setTimeout(fn, 0) runs on the microtask queue so simple deferrals still work.
if (typeof (globalThis as { setTimeout?: unknown }).setTimeout === "undefined") {
  (globalThis as { setTimeout?: unknown }).setTimeout = (fn: () => void) => {
    Promise.resolve().then(() => {
      try {
        fn();
      } catch (e) {
        phoenix.log.error("[setTimeout]", String(e));
      }
    });
    return 0;
  };
  (globalThis as { clearTimeout?: unknown }).clearTimeout = () => {};
  (globalThis as { setInterval?: unknown }).setInterval = () => 0;
  (globalThis as { clearInterval?: unknown }).clearInterval = () => {};
}

// URL + URLSearchParams: QuickJS and pu don't provide these, but many plugins (ClearURLs, link
// cleaners, embed tools) need them. Compact implementation, enough for http(s) URLs and query
// editing. Guarded so a real host implementation wins.
if (typeof (globalThis as { URLSearchParams?: unknown }).URLSearchParams === "undefined") {
  class SearchParams {
    private pairs: [string, string][] = [];
    constructor(init?: string) {
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
    get(k: string) {
      const p = this.pairs.find((x) => x[0] === k);
      return p ? p[1] : null;
    }
    getAll(k: string) {
      return this.pairs.filter((x) => x[0] === k).map((x) => x[1]);
    }
    has(k: string) {
      return this.pairs.some((x) => x[0] === k);
    }
    set(k: string, v: string) {
      const p = this.pairs.find((x) => x[0] === k);
      if (p) p[1] = String(v);
      else this.pairs.push([k, String(v)]);
    }
    append(k: string, v: string) {
      this.pairs.push([k, String(v)]);
    }
    delete(k: string) {
      this.pairs = this.pairs.filter((x) => x[0] !== k);
    }
    forEach(fn: (v: string, k: string) => void) {
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
      return this.pairs
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
    }
  }
  (globalThis as { URLSearchParams?: unknown }).URLSearchParams = SearchParams;

  class SimpleURL {
    protocol = "";
    hostname = "";
    port = "";
    pathname = "";
    hash = "";
    searchParams: SearchParams;
    private _search = "";
    constructor(input: string, base?: string) {
      let url = String(input);
      // Minimal base resolution for relative inputs.
      if (base && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
        const b = new SimpleURL(base);
        url = url.startsWith("/") ? `${b.protocol}//${b.host}${url}` : `${b.protocol}//${b.host}${b.pathname.replace(/\/[^/]*$/, "/")}${url}`;
      }
      const m = /^([a-z][a-z0-9+.-]*:)\/\/([^/?#]*)([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(url);
      if (!m) throw new TypeError(`Invalid URL: ${input}`);
      this.protocol = m[1].toLowerCase();
      const authority = m[2];
      const host = authority.includes("@") ? authority.split("@").pop()! : authority;
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
  (globalThis as { URL?: unknown }).URL = SimpleURL;
}

export {};
