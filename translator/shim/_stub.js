// Catch-all for Equicord import paths we have not mapped yet. esbuild resolves any named import
// from this module to a property on the Proxy, so plugins that import an unsupported helper still
// bundle; the helper is a no-op that logs once when first used. This is what lets a real plugin
// compile before every API it touches is implemented.
"use strict";

const warned = new Set();
function makeStub(label) {
  const fn = function () {
    warn(label + "()");
    return undefined;
  };
  return new Proxy(fn, {
    get(_t, prop) {
      if (prop === "__esModule") return true;
      if (prop === "default") return module.exports;
      if (typeof prop === "symbol") return undefined;
      if (prop === "then") return undefined; // not a thenable
      return makeStub(label + "." + String(prop));
    },
    apply() {
      warn(label + "()");
      return undefined;
    },
    construct() {
      warn("new " + label + "()");
      return {};
    },
  });
}

function warn(what) {
  if (warned.has(what)) return;
  warned.add(what);
  try {
    phoenix.log.warn("[shim] unsupported API used: " + what);
  } catch (_) {
    /* phoenix not ready */
  }
}

module.exports = makeStub("unmapped");
